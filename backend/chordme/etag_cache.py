"""
ETag support for API response caching.

This module provides ETag generation and validation for HTTP caching:
- Automatic ETag generation for API responses
- Conditional request handling (If-None-Match)
- Cache-Control headers for browser caching
- Integration with the cache service for server-side caching
"""

import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union, Callable
from functools import wraps

from flask import request, Response, jsonify, make_response, g
from werkzeug.http import parse_cache_control_header, generate_etag

from .cache_service import get_cache_service

logger = logging.getLogger(__name__)


class ETagManager:
    """Manages ETag generation and validation for API responses."""
    
    def __init__(self):
        self.cache = get_cache_service()
    
    def generate_etag(self, data: Any, additional_data: Optional[Dict] = None) -> str:
        """
        Generate an ETag for response data.
        
        Args:
            data: The response data
            additional_data: Additional data to include in ETag calculation
            
        Returns:
            ETag string
        """
        try:
            # Convert data to JSON string for consistent hashing
            if isinstance(data, (dict, list)):
                data_str = json.dumps(data, sort_keys=True, default=str)
            else:
                data_str = str(data)
            
            # Include additional data if provided
            if additional_data:
                additional_str = json.dumps(additional_data, sort_keys=True, default=str)
                data_str = f"{data_str}:{additional_str}"
            
            # Generate hash
            etag_hash = hashlib.md5(data_str.encode()).hexdigest()
            return f'"{etag_hash}"'
            
        except Exception as e:
            logger.error(f"Failed to generate ETag: {e}")
            # Return a timestamp-based ETag as fallback
            return f'"{int(datetime.now().timestamp())}"'
    
    def check_if_none_match(self, etag: str) -> bool:
        """
        Check if the client's If-None-Match header matches the current ETag.
        
        Args:
            etag: Current ETag for the resource
            
        Returns:
            True if client has the current version (304 should be returned)
        """
        if_none_match = request.headers.get('If-None-Match')
        if not if_none_match:
            return False
        
        # Handle both quoted and unquoted ETags
        client_etags = [tag.strip().strip('"') for tag in if_none_match.split(',')]
        current_etag = etag.strip('"')
        
        return current_etag in client_etags or '*' in client_etags
    
    def create_cached_response(self, data: Any, etag: Optional[str] = None,
                             max_age: int = 3600, additional_headers: Optional[Dict] = None) -> Response:
        """
        Create a response with appropriate caching headers.
        
        Args:
            data: Response data
            etag: ETag for the response (generated if not provided)
            max_age: Cache max age in seconds
            additional_headers: Additional headers to include
            
        Returns:
            Flask Response object with caching headers
        """
        if etag is None:
            etag = self.generate_etag(data)
        
        # Check if client has current version
        if self.check_if_none_match(etag):
            response = make_response('', 304)
            response.headers['ETag'] = etag
            return response
        
        # Create full response
        if isinstance(data, dict) and 'status' not in data:
            # Wrap data in standard response format if not already wrapped
            response_data = {
                'status': 'success',
                'data': data
            }
        else:
            response_data = data
        
        response = make_response(jsonify(response_data))
        
        # Set caching headers
        response.headers['ETag'] = etag
        response.headers['Cache-Control'] = f'public, max-age={max_age}'
        response.headers['Vary'] = 'Accept-Encoding'
        
        # Add additional headers if provided
        if additional_headers:
            for key, value in additional_headers.items():
                response.headers[key] = value
        
        return response
    
    def cache_response(self, key: str, data: Any, ttl: int = 3600,
                      namespace: str = "api_responses", tags: Optional[list] = None) -> str:
        """
        Cache response data and return ETag.
        
        Args:
            key: Cache key
            data: Data to cache
            ttl: Time to live in seconds
            namespace: Cache namespace
            tags: Cache tags for invalidation
            
        Returns:
            ETag for the cached data
        """
        etag = self.generate_etag(data)
        
        # Cache both the data and the ETag
        cache_data = {
            'data': data,
            'etag': etag,
            'cached_at': datetime.now().isoformat()
        }
        
        self.cache.set(key, cache_data, ttl, namespace, tags)
        return etag
    
    def get_cached_response(self, key: str, namespace: str = "api_responses") -> Optional[Dict]:
        """
        Get cached response data.
        
        Args:
            key: Cache key
            namespace: Cache namespace
            
        Returns:
            Cached response data with ETag, or None if not found
        """
        return self.cache.get(key, namespace)


# Global ETag manager
etag_manager = ETagManager()


def etag_cached(ttl: int = 3600, key_func: Optional[Callable] = None,
               max_age: Optional[int] = None, tags: Optional[list] = None,
               namespace: str = "api_responses"):
    """
    Decorator for API endpoints with ETag caching support.
    
    Args:
        ttl: Server-side cache TTL in seconds
        key_func: Function to generate cache key from request
        max_age: Client-side cache max-age (defaults to ttl)
        tags: Cache tags for invalidation
        namespace: Cache namespace
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = f"{func.__name__}:{request.full_path}"
            
            # Try to get from cache first
            cached_response = etag_manager.get_cached_response(cache_key, namespace)
            
            if cached_response:
                # Check if client has current version
                etag = cached_response['etag']
                if etag_manager.check_if_none_match(etag):
                    response = make_response('', 304)
                    response.headers['ETag'] = etag
                    return response
                
                # Return cached data with ETag
                return etag_manager.create_cached_response(
                    cached_response['data'], 
                    etag,
                    max_age or ttl
                )
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            
            # Handle different return types
            if isinstance(result, Response):
                # Function returned a Response object
                return result
            elif isinstance(result, tuple):
                # Function returned (data, status_code) tuple
                data, status_code = result
            else:
                # Function returned data only
                data = result
                status_code = 200
            
            # Cache the response
            etag = etag_manager.cache_response(cache_key, data, ttl, namespace, tags)
            
            # Create response with caching headers
            response = etag_manager.create_cached_response(data, etag, max_age or ttl)
            response.status_code = status_code
            
            return response
        
        return wrapper
    return decorator


def invalidate_etag_cache(pattern: Optional[str] = None, tags: Optional[list] = None,
                         namespace: str = "api_responses"):
    """
    Invalidate ETag cached responses.
    
    Args:
        pattern: Key pattern to invalidate
        tags: Tags to invalidate
        namespace: Cache namespace
    """
    cache = get_cache_service()
    
    if tags:
        invalidated = cache.invalidate_by_tags(tags)
        logger.info(f"Invalidated {invalidated} ETag cached responses by tags: {tags}")
    elif pattern:
        invalidated = cache.invalidate_pattern(pattern, namespace)
        logger.info(f"Invalidated {invalidated} ETag cached responses by pattern: {pattern}")
    else:
        success = cache.clear_all(namespace)
        logger.info(f"Cleared all ETag cached responses in namespace: {namespace}")


def cache_control(max_age: int = 3600, private: bool = False, 
                 no_cache: bool = False, must_revalidate: bool = False):
    """
    Decorator to set Cache-Control headers.
    
    Args:
        max_age: Max age in seconds
        private: Whether cache is private to the user
        no_cache: Whether to prevent caching
        must_revalidate: Whether cache must revalidate
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            
            if isinstance(result, Response):
                response = result
            else:
                response = make_response(result)
            
            # Build Cache-Control header
            cache_control_parts = []
            
            if no_cache:
                cache_control_parts.append('no-cache')
            else:
                if private:
                    cache_control_parts.append('private')
                else:
                    cache_control_parts.append('public')
                
                cache_control_parts.append(f'max-age={max_age}')
            
            if must_revalidate:
                cache_control_parts.append('must-revalidate')
            
            response.headers['Cache-Control'] = ', '.join(cache_control_parts)
            
            return response
        
        return wrapper
    return decorator


def conditional_request(func: Callable) -> Callable:
    """
    Decorator to handle conditional requests (If-None-Match, If-Modified-Since).
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Store original function result
        result = func(*args, **kwargs)
        
        # Extract data from result
        if isinstance(result, Response):
            return result
        elif isinstance(result, tuple):
            data, status_code = result
        else:
            data = result
            status_code = 200
        
        # Generate ETag for current data
        etag = etag_manager.generate_etag(data)
        
        # Check conditional request headers
        if etag_manager.check_if_none_match(etag):
            response = make_response('', 304)
            response.headers['ETag'] = etag
            return response
        
        # Return full response with ETag
        response = etag_manager.create_cached_response(data, etag)
        response.status_code = status_code
        
        return response
    
    return wrapper


# Utility functions for common ETag patterns

def generate_collection_etag(items: list, last_modified: Optional[datetime] = None) -> str:
    """Generate ETag for a collection of items."""
    additional_data = {}
    if last_modified:
        additional_data['last_modified'] = last_modified.isoformat()
    
    return etag_manager.generate_etag(items, additional_data)


def generate_model_etag(model_instance, include_relationships: bool = False) -> str:
    """Generate ETag for a model instance."""
    if hasattr(model_instance, 'to_dict'):
        data = model_instance.to_dict()
    else:
        # Try to get basic attributes
        data = {c.name: getattr(model_instance, c.name) 
                for c in model_instance.__table__.columns}
    
    # Include last modified timestamp if available
    additional_data = {}
    if hasattr(model_instance, 'updated_at') and model_instance.updated_at:
        additional_data['updated_at'] = model_instance.updated_at.isoformat()
    
    return etag_manager.generate_etag(data, additional_data)


# Pre-configured decorators for common use cases

def cache_api_response(ttl: int = 3600, tags: Optional[list] = None):
    """Simple API response caching with ETag support."""
    return etag_cached(ttl=ttl, tags=tags)


def cache_song_response(ttl: int = 7200):
    """Cache song-related API responses."""
    return etag_cached(ttl=ttl, tags=['songs'], namespace="song_api")


def cache_user_response(ttl: int = 3600):
    """Cache user-related API responses."""
    return etag_cached(ttl=ttl, tags=['users'], namespace="user_api")


def cache_search_response(ttl: int = 1800):
    """Cache search API responses (shorter TTL due to changing results)."""
    return etag_cached(ttl=ttl, tags=['search'], namespace="search_api")