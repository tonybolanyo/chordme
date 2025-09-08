"""
Advanced caching service for ChordMe application.

This module provides a comprehensive multi-layer caching system with:
- Redis-based caching with clustering support
- Intelligent cache invalidation strategies  
- TTL management and automatic cleanup
- Performance monitoring and analytics
- Graceful degradation when cache is unavailable
"""

import json
import time
import logging
import hashlib
import functools
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union, Callable, Set
from dataclasses import dataclass, asdict
from flask import current_app
import redis
from redis.exceptions import RedisError, ConnectionError


logger = logging.getLogger(__name__)


@dataclass
class CacheMetrics:
    """Metrics for cache performance monitoring."""
    hits: int = 0
    misses: int = 0
    sets: int = 0
    deletes: int = 0
    evictions: int = 0
    errors: int = 0
    total_requests: int = 0
    avg_response_time_ms: float = 0.0
    hit_rate: float = 0.0
    memory_usage_bytes: int = 0
    keys_count: int = 0
    
    def update_hit_rate(self):
        """Update the hit rate based on hits and misses."""
        self.total_requests = self.hits + self.misses
        if self.total_requests > 0:
            self.hit_rate = self.hits / self.total_requests
        else:
            self.hit_rate = 0.0


@dataclass
class CacheConfig:
    """Configuration for cache behavior."""
    enabled: bool = True
    default_ttl: int = 3600  # 1 hour
    max_ttl: int = 86400  # 24 hours
    key_prefix: str = "chordme"
    compression_enabled: bool = True
    compression_threshold: int = 1024  # bytes
    warm_cache_on_startup: bool = True
    invalidation_strategy: str = "smart"  # "smart", "manual", "time_based"
    cluster_mode: bool = False
    
    
class CacheInvalidationStrategy:
    """Strategies for cache invalidation."""
    
    MANUAL = "manual"
    TIME_BASED = "time_based"
    SMART = "smart"  # Based on content changes
    

class CacheService:
    """Advanced Redis-based caching service with multi-layer support."""
    
    def __init__(self, config: Optional[CacheConfig] = None):
        self.config = config or CacheConfig()
        self.redis_client: Optional[redis.Redis] = None
        self.fallback_cache: Dict[str, Any] = {}  # In-memory fallback
        self.metrics = CacheMetrics()
        self._tags_to_keys: Dict[str, Set[str]] = {}  # For tag-based invalidation
        self._warmup_keys: Set[str] = set()
        
        self._init_redis()
        
    def _init_redis(self):
        """Initialize Redis client with graceful degradation."""
        if not self.config.enabled:
            logger.info("Cache disabled via configuration")
            return
            
        try:
            redis_url = current_app.config.get('REDIS_URL')
            if redis_url:
                self.redis_client = redis.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_timeout=5,
                    socket_connect_timeout=5,
                    retry_on_timeout=True,
                    health_check_interval=30
                )
                # Test connection
                self.redis_client.ping()
                logger.info("Redis cache initialized successfully")
                
                # Setup cache warming if enabled
                if self.config.warm_cache_on_startup:
                    self._schedule_cache_warming()
                    
            else:
                logger.warning("REDIS_URL not configured, using in-memory fallback")
                
        except Exception as e:
            logger.error(f"Redis initialization failed: {e}")
            self.redis_client = None
            
    def _schedule_cache_warming(self):
        """Schedule cache warming for frequently accessed content."""
        try:
            # Import here to avoid circular imports
            from .models import Song, User
            
            # Warm cache with popular songs (most accessed)
            # This would typically be based on analytics data
            warmup_keys = [
                'songs:popular:limit:10',
                'songs:recent:limit:10',
                'users:active:count',
                'api:health'
            ]
            
            for key in warmup_keys:
                self._warmup_keys.add(key)
                
            logger.info(f"Scheduled {len(warmup_keys)} keys for cache warming")
            
        except Exception as e:
            logger.error(f"Cache warming setup failed: {e}")
    
    def _make_key(self, key: str, namespace: Optional[str] = None) -> str:
        """Create a properly prefixed cache key."""
        parts = [self.config.key_prefix]
        if namespace:
            parts.append(namespace)
        parts.append(key)
        return ":".join(parts)
    
    def _serialize_value(self, value: Any) -> str:
        """Serialize value for cache storage with optional compression."""
        try:
            serialized = json.dumps(value, default=str)
            
            if (self.config.compression_enabled and 
                len(serialized) > self.config.compression_threshold):
                try:
                    import gzip
                    compressed = gzip.compress(serialized.encode())
                    return json.dumps({
                        "_compressed": True,
                        "_data": compressed.hex()
                    })
                except Exception:
                    # Fall back to uncompressed if compression fails
                    pass
                    
            return serialized
            
        except Exception as e:
            logger.error(f"Value serialization failed: {e}")
            raise
    
    def _deserialize_value(self, serialized: str) -> Any:
        """Deserialize value from cache storage."""
        try:
            data = json.loads(serialized)
            
            # Check if compressed
            if isinstance(data, dict) and data.get("_compressed"):
                import gzip
                compressed_data = bytes.fromhex(data["_data"])
                decompressed = gzip.decompress(compressed_data).decode()
                return json.loads(decompressed)
                
            return data
            
        except Exception as e:
            logger.error(f"Value deserialization failed: {e}")
            raise
    
    def get(self, key: str, namespace: Optional[str] = None) -> Optional[Any]:
        """Get value from cache with fallback support."""
        start_time = time.time()
        cache_key = self._make_key(key, namespace)
        
        try:
            # Try Redis first
            if self.redis_client:
                try:
                    value = self.redis_client.get(cache_key)
                    if value is not None:
                        self.metrics.hits += 1
                        self._update_response_time(start_time)
                        return self._deserialize_value(value)
                except RedisError as e:
                    logger.warning(f"Redis get failed for key {cache_key}: {e}")
                    self.metrics.errors += 1
            
            # Fallback to in-memory cache
            if cache_key in self.fallback_cache:
                cached_item = self.fallback_cache[cache_key]
                if cached_item["expires_at"] > time.time():
                    self.metrics.hits += 1
                    self._update_response_time(start_time)
                    return cached_item["value"]
                else:
                    # Expired, remove it
                    del self.fallback_cache[cache_key]
            
            self.metrics.misses += 1
            self._update_response_time(start_time)
            return None
            
        except Exception as e:
            logger.error(f"Cache get failed for key {cache_key}: {e}")
            self.metrics.errors += 1
            return None
        finally:
            self.metrics.update_hit_rate()
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None, 
            namespace: Optional[str] = None, tags: Optional[List[str]] = None) -> bool:
        """Set value in cache with TTL and tagging support."""
        cache_key = self._make_key(key, namespace)
        ttl = ttl or self.config.default_ttl
        ttl = min(ttl, self.config.max_ttl)  # Enforce max TTL
        
        try:
            serialized = self._serialize_value(value)
            
            # Try Redis first
            if self.redis_client:
                try:
                    result = self.redis_client.setex(cache_key, ttl, serialized)
                    if result:
                        self.metrics.sets += 1
                        self._handle_tags(cache_key, tags)
                        return True
                except RedisError as e:
                    logger.warning(f"Redis set failed for key {cache_key}: {e}")
                    self.metrics.errors += 1
            
            # Fallback to in-memory cache
            self.fallback_cache[cache_key] = {
                "value": value,
                "expires_at": time.time() + ttl,
                "tags": tags or []
            }
            self.metrics.sets += 1
            self._handle_tags(cache_key, tags)
            return True
            
        except Exception as e:
            logger.error(f"Cache set failed for key {cache_key}: {e}")
            self.metrics.errors += 1
            return False
    
    def delete(self, key: str, namespace: Optional[str] = None) -> bool:
        """Delete value from cache."""
        cache_key = self._make_key(key, namespace)
        
        try:
            deleted = False
            
            # Try Redis first
            if self.redis_client:
                try:
                    result = self.redis_client.delete(cache_key)
                    deleted = result > 0
                except RedisError as e:
                    logger.warning(f"Redis delete failed for key {cache_key}: {e}")
                    self.metrics.errors += 1
            
            # Also remove from fallback cache
            if cache_key in self.fallback_cache:
                del self.fallback_cache[cache_key]
                deleted = True
            
            if deleted:
                self.metrics.deletes += 1
                self._remove_key_from_tags(cache_key)
            
            return deleted
            
        except Exception as e:
            logger.error(f"Cache delete failed for key {cache_key}: {e}")
            self.metrics.errors += 1
            return False
    
    def invalidate_by_tags(self, tags: List[str]) -> int:
        """Invalidate all cache entries with specified tags."""
        invalidated_count = 0
        
        for tag in tags:
            if tag in self._tags_to_keys:
                keys_to_delete = list(self._tags_to_keys[tag])
                for cache_key in keys_to_delete:
                    # Extract original key and namespace
                    key_parts = cache_key.split(":", 2)
                    if len(key_parts) >= 2:
                        key = key_parts[-1]
                        namespace = key_parts[-2] if len(key_parts) > 2 else None
                        if self.delete(key, namespace):
                            invalidated_count += 1
                
                # Clear the tag mapping
                del self._tags_to_keys[tag]
        
        logger.info(f"Invalidated {invalidated_count} cache entries for tags: {tags}")
        return invalidated_count
    
    def invalidate_pattern(self, pattern: str, namespace: Optional[str] = None) -> int:
        """Invalidate all cache entries matching a pattern."""
        pattern_key = self._make_key(pattern, namespace)
        invalidated_count = 0
        
        try:
            # Try Redis pattern deletion
            if self.redis_client:
                try:
                    keys = self.redis_client.keys(pattern_key)
                    if keys:
                        deleted = self.redis_client.delete(*keys)
                        invalidated_count += deleted
                except RedisError as e:
                    logger.warning(f"Redis pattern delete failed: {e}")
            
            # Also clear from fallback cache
            keys_to_delete = [k for k in self.fallback_cache.keys() if k.startswith(pattern_key.replace("*", ""))]
            for key in keys_to_delete:
                del self.fallback_cache[key]
                invalidated_count += 1
            
            logger.info(f"Invalidated {invalidated_count} cache entries for pattern: {pattern}")
            return invalidated_count
            
        except Exception as e:
            logger.error(f"Pattern invalidation failed for {pattern}: {e}")
            return 0
    
    def warm_cache(self, key: str, value_func: Callable[[], Any], 
                   ttl: Optional[int] = None, namespace: Optional[str] = None,
                   tags: Optional[List[str]] = None) -> bool:
        """Warm cache by computing and storing a value if not already cached."""
        existing = self.get(key, namespace)
        if existing is not None:
            return True  # Already cached
        
        try:
            value = value_func()
            return self.set(key, value, ttl, namespace, tags)
        except Exception as e:
            logger.error(f"Cache warming failed for key {key}: {e}")
            return False
    
    def get_or_set(self, key: str, value_func: Callable[[], Any], 
                   ttl: Optional[int] = None, namespace: Optional[str] = None,
                   tags: Optional[List[str]] = None) -> Any:
        """Get value from cache or compute and cache it."""
        cached_value = self.get(key, namespace)
        if cached_value is not None:
            return cached_value
        
        try:
            value = value_func()
            self.set(key, value, ttl, namespace, tags)
            return value
        except Exception as e:
            logger.error(f"Get-or-set failed for key {key}: {e}")
            raise
    
    def clear_all(self, namespace: Optional[str] = None) -> bool:
        """Clear all cache entries, optionally for a specific namespace."""
        try:
            if namespace:
                pattern = f"{self.config.key_prefix}:{namespace}:*"
            else:
                pattern = f"{self.config.key_prefix}:*"
            
            return self.invalidate_pattern(pattern) >= 0
            
        except Exception as e:
            logger.error(f"Clear all failed: {e}")
            return False
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get comprehensive cache performance metrics."""
        try:
            redis_info = {}
            if self.redis_client:
                try:
                    info = self.redis_client.info()
                    redis_info = {
                        "connected": True,
                        "memory_usage_bytes": info.get("used_memory", 0),
                        "keys_count": info.get("db0", {}).get("keys", 0) if "db0" in info else 0,
                        "connections": info.get("connected_clients", 0),
                        "total_commands_processed": info.get("total_commands_processed", 0)
                    }
                except RedisError:
                    redis_info = {"connected": False}
            
            self.metrics.update_hit_rate()
            metrics_dict = asdict(self.metrics)
            metrics_dict.update(redis_info)
            metrics_dict["fallback_cache_size"] = len(self.fallback_cache)
            metrics_dict["tags_count"] = len(self._tags_to_keys)
            
            return metrics_dict
            
        except Exception as e:
            logger.error(f"Failed to get cache metrics: {e}")
            return {"error": str(e)}
    
    def health_check(self) -> Dict[str, Any]:
        """Perform cache health check."""
        health = {
            "healthy": True,
            "redis_connected": False,
            "fallback_available": True,
            "error": None
        }
        
        try:
            if self.redis_client:
                self.redis_client.ping()
                health["redis_connected"] = True
        except Exception as e:
            health["redis_connected"] = False
            health["error"] = str(e)
            if not self.fallback_cache:
                health["healthy"] = False
        
        return health
    
    def _handle_tags(self, cache_key: str, tags: Optional[List[str]]):
        """Handle tag associations for cache invalidation."""
        if tags:
            for tag in tags:
                if tag not in self._tags_to_keys:
                    self._tags_to_keys[tag] = set()
                self._tags_to_keys[tag].add(cache_key)
    
    def _remove_key_from_tags(self, cache_key: str):
        """Remove key from all tag associations."""
        tags_to_remove = []
        for tag, keys in self._tags_to_keys.items():
            if cache_key in keys:
                keys.remove(cache_key)
                if not keys:  # No more keys for this tag
                    tags_to_remove.append(tag)
        
        for tag in tags_to_remove:
            del self._tags_to_keys[tag]
    
    def _update_response_time(self, start_time: float):
        """Update average response time metric."""
        response_time = (time.time() - start_time) * 1000  # Convert to ms
        if self.metrics.avg_response_time_ms == 0:
            self.metrics.avg_response_time_ms = response_time
        else:
            # Simple moving average
            self.metrics.avg_response_time_ms = (
                self.metrics.avg_response_time_ms * 0.9 + response_time * 0.1
            )


# Global cache service instance
cache_service: Optional[CacheService] = None


def init_cache_service(config: Optional[CacheConfig] = None) -> CacheService:
    """Initialize the global cache service."""
    global cache_service
    cache_service = CacheService(config)
    return cache_service


def get_cache_service() -> CacheService:
    """Get the global cache service instance."""
    global cache_service
    if cache_service is None:
        cache_service = CacheService()
    return cache_service


def cached(ttl: int = 3600, namespace: Optional[str] = None, 
           tags: Optional[List[str]] = None, key_func: Optional[Callable] = None):
    """Decorator for caching function results."""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # Create key from function name and arguments
                arg_str = str(args) + str(sorted(kwargs.items()))
                key_hash = hashlib.md5(arg_str.encode()).hexdigest()[:8]
                cache_key = f"{func.__name__}:{key_hash}"
            
            cache = get_cache_service()
            
            def compute_value():
                return func(*args, **kwargs)
            
            return cache.get_or_set(cache_key, compute_value, ttl, namespace, tags)
        
        return wrapper
    return decorator