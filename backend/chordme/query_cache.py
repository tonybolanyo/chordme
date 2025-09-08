"""
Database query caching decorators and utilities.

This module provides decorators and utilities for caching database query results:
- Query result caching with TTL management
- Intelligent cache invalidation based on model changes
- Cache warming for frequently accessed queries
- Performance monitoring for cached queries
"""

import functools
import hashlib
import logging
from typing import Any, Callable, List, Optional, Union, Dict
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from .cache_service import get_cache_service, cached
from .models import db

logger = logging.getLogger(__name__)


class QueryCacheManager:
    """Manages caching of database queries with intelligent invalidation."""
    
    def __init__(self):
        self.model_to_queries: Dict[str, set] = {}  # Track which queries depend on which models
        self._setup_model_listeners()
    
    def _setup_model_listeners(self):
        """Set up SQLAlchemy event listeners for cache invalidation."""
        @event.listens_for(Session, 'before_flush')
        def before_flush(session, flush_context, instances):
            """Track models that will be modified."""
            if not hasattr(session, '_cache_invalidation_needed'):
                session._cache_invalidation_needed = set()
            
            # Track models being modified
            for obj in session.new | session.dirty | session.deleted:
                model_name = obj.__class__.__name__
                session._cache_invalidation_needed.add(model_name)
        
        @event.listens_for(Session, 'after_commit')
        def after_commit(session):
            """Invalidate caches after successful commit."""
            if hasattr(session, '_cache_invalidation_needed'):
                self.invalidate_model_caches(session._cache_invalidation_needed)
                delattr(session, '_cache_invalidation_needed')
        
        @event.listens_for(Session, 'after_rollback')
        def after_rollback(session):
            """Clean up cache invalidation tracking after rollback."""
            if hasattr(session, '_cache_invalidation_needed'):
                delattr(session, '_cache_invalidation_needed')
    
    def invalidate_model_caches(self, model_names: set):
        """Invalidate all caches related to the specified models."""
        cache = get_cache_service()
        tags_to_invalidate = []
        
        for model_name in model_names:
            tags_to_invalidate.append(f"model:{model_name}")
            # Also invalidate general queries tag
            tags_to_invalidate.append("queries")
        
        if tags_to_invalidate:
            invalidated = cache.invalidate_by_tags(tags_to_invalidate)
            logger.info(f"Invalidated {invalidated} cached queries for models: {model_names}")
    
    def register_query_for_model(self, query_key: str, model_names: List[str]):
        """Register a query as depending on specific models."""
        for model_name in model_names:
            if model_name not in self.model_to_queries:
                self.model_to_queries[model_name] = set()
            self.model_to_queries[model_name].add(query_key)


# Global query cache manager
query_cache_manager = QueryCacheManager()


def cache_query(ttl: int = 3600, key_prefix: Optional[str] = None, 
                model_names: Optional[List[str]] = None,
                namespace: str = "queries"):
    """
    Decorator for caching database query results.
    
    Args:
        ttl: Time to live in seconds
        key_prefix: Custom prefix for cache key
        model_names: List of model names this query depends on for invalidation
        namespace: Cache namespace
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = _generate_query_cache_key(func, args, kwargs, key_prefix)
            
            # Determine tags for invalidation
            tags = ["queries"]
            if model_names:
                for model_name in model_names:
                    tags.append(f"model:{model_name}")
                query_cache_manager.register_query_for_model(cache_key, model_names)
            
            cache = get_cache_service()
            
            def execute_query():
                result = func(*args, **kwargs)
                # Convert SQLAlchemy objects to serializable format if needed
                return _serialize_query_result(result)
            
            return cache.get_or_set(cache_key, execute_query, ttl, namespace, tags)
        
        return wrapper
    return decorator


def cache_model_query(model_class, ttl: int = 3600, key_prefix: Optional[str] = None):
    """
    Decorator specifically for caching model queries.
    Automatically determines model dependencies.
    
    Args:
        model_class: The SQLAlchemy model class
        ttl: Time to live in seconds  
        key_prefix: Custom prefix for cache key
    """
    model_name = model_class.__name__
    return cache_query(ttl=ttl, key_prefix=key_prefix, model_names=[model_name])


def cache_count_query(model_class, ttl: int = 1800):
    """Decorator for caching count queries (shorter TTL as they change frequently)."""
    return cache_model_query(model_class, ttl=ttl, key_prefix="count")


def cache_lookup_query(model_class, ttl: int = 7200):
    """Decorator for caching lookup/reference queries (longer TTL as they rarely change)."""
    return cache_model_query(model_class, ttl=ttl, key_prefix="lookup")


def warm_query_cache(func: Callable, *args, **kwargs) -> bool:
    """
    Warm cache for a specific query.
    
    Args:
        func: The cached function to warm
        *args: Arguments for the function
        **kwargs: Keyword arguments for the function
    
    Returns:
        bool: True if warming succeeded
    """
    try:
        # Simply call the function - if it's cached, it will populate the cache
        func(*args, **kwargs)
        return True
    except Exception as e:
        logger.error(f"Failed to warm cache for {func.__name__}: {e}")
        return False


def invalidate_query_cache(model_names: List[str]):
    """
    Manually invalidate cache for specific models.
    
    Args:
        model_names: List of model names to invalidate
    """
    query_cache_manager.invalidate_model_caches(set(model_names))


def _generate_query_cache_key(func: Callable, args: tuple, kwargs: dict, 
                             key_prefix: Optional[str] = None) -> str:
    """Generate a cache key for a query function."""
    # Create a deterministic key from function name and arguments
    func_name = func.__name__
    
    # Convert args and kwargs to a hashable string
    args_str = str(args)
    kwargs_str = str(sorted(kwargs.items()))
    combined = f"{func_name}:{args_str}:{kwargs_str}"
    
    # Hash to keep key size manageable
    key_hash = hashlib.md5(combined.encode()).hexdigest()[:12]
    
    if key_prefix:
        return f"{key_prefix}:{func_name}:{key_hash}"
    else:
        return f"{func_name}:{key_hash}"


def _serialize_query_result(result: Any) -> Any:
    """Serialize SQLAlchemy query results for caching."""
    if hasattr(result, '__iter__') and not isinstance(result, (str, bytes)):
        # Handle collections (list, query results, etc.)
        try:
            return [_serialize_single_result(item) for item in result]
        except TypeError:
            # If it's not iterable in the expected way, treat as single result
            return _serialize_single_result(result)
    else:
        return _serialize_single_result(result)


def _serialize_single_result(item: Any) -> Any:
    """Serialize a single query result item."""
    if hasattr(item, 'to_dict'):
        # SQLAlchemy model with to_dict method
        return item.to_dict()
    elif hasattr(item, '__dict__'):
        # SQLAlchemy model without to_dict, try to extract attributes
        try:
            # Get column attributes only (avoid relationships and other complexities)
            if hasattr(item, '__table__'):
                return {c.name: getattr(item, c.name) for c in item.__table__.columns}
        except Exception:
            pass
    
    # For other types (int, str, etc.), return as-is
    return item


# Pre-built cached query decorators for common patterns

def cached_song_queries(ttl: int = 3600):
    """Decorator for Song model queries."""
    return cache_model_query(db.Model, ttl=ttl)  # Will be properly typed when imported


def cached_user_queries(ttl: int = 3600):
    """Decorator for User model queries."""
    return cache_model_query(db.Model, ttl=ttl)  # Will be properly typed when imported


# Example usage decorators that can be applied to service functions

def cache_popular_songs(ttl: int = 3600):
    """Cache popular songs queries."""
    return cache_query(ttl=ttl, key_prefix="popular", model_names=["Song"], namespace="songs")


def cache_user_stats(ttl: int = 1800):
    """Cache user statistics queries."""
    return cache_query(ttl=ttl, key_prefix="stats", model_names=["User"], namespace="stats")


def cache_song_counts(ttl: int = 900):
    """Cache song count queries (shorter TTL due to frequent changes)."""
    return cache_query(ttl=ttl, key_prefix="count", model_names=["Song"], namespace="counts")


# Query performance monitoring

class QueryCacheMonitor:
    """Monitor the performance of cached queries."""
    
    def __init__(self):
        self.query_stats = {}
    
    def record_query(self, query_key: str, was_cached: bool, execution_time_ms: float):
        """Record query execution statistics."""
        if query_key not in self.query_stats:
            self.query_stats[query_key] = {
                'total_calls': 0,
                'cache_hits': 0,
                'total_time_ms': 0,
                'avg_time_ms': 0
            }
        
        stats = self.query_stats[query_key]
        stats['total_calls'] += 1
        stats['total_time_ms'] += execution_time_ms
        stats['avg_time_ms'] = stats['total_time_ms'] / stats['total_calls']
        
        if was_cached:
            stats['cache_hits'] += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive query cache statistics."""
        return {
            'query_count': len(self.query_stats),
            'queries': dict(self.query_stats)
        }


# Global query monitor
query_monitor = QueryCacheMonitor()


def monitor_cached_query(func: Callable) -> Callable:
    """Decorator to monitor cached query performance."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        import time
        start_time = time.time()
        
        # Check if result comes from cache by setting a flag
        cache = get_cache_service()
        cache_key = _generate_query_cache_key(func, args, kwargs)
        was_cached = cache.get(cache_key, namespace="queries") is not None
        
        result = func(*args, **kwargs)
        
        execution_time = (time.time() - start_time) * 1000
        query_monitor.record_query(cache_key, was_cached, execution_time)
        
        return result
    
    return wrapper