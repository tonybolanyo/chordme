"""
Tests for the advanced caching system.

This module tests:
- Cache service functionality
- ETag response caching
- Query result caching  
- Cache invalidation strategies
- Performance monitoring
- Graceful degradation
"""

import pytest
import json
import time
from unittest.mock import patch, MagicMock, call
from datetime import datetime, timedelta

from chordme.cache_service import CacheService, CacheConfig, CacheMetrics
from chordme.etag_cache import ETagManager, etag_cached
from chordme.query_cache import cache_query, QueryCacheManager
from chordme import db
from chordme.models import User, Song


class TestCacheService:
    """Test the core cache service functionality."""
    
    @pytest.fixture
    def cache_config(self):
        """Test cache configuration."""
        return CacheConfig(
            enabled=True,
            default_ttl=300,  # 5 minutes for testing
            max_ttl=3600,
            key_prefix="test",
            compression_enabled=True,
            compression_threshold=100,
            warm_cache_on_startup=False
        )
    
    @pytest.fixture
    def cache_service(self, cache_config):
        """Test cache service instance."""
        with patch('chordme.cache_service.current_app') as mock_app:
            mock_app.config.get.return_value = None  # No Redis URL
            return CacheService(cache_config)
    
    def test_basic_cache_operations(self, cache_service):
        """Test basic get/set/delete operations."""
        # Test set and get
        assert cache_service.set("test_key", "test_value")
        assert cache_service.get("test_key") == "test_value"
        
        # Test delete
        assert cache_service.delete("test_key")
        assert cache_service.get("test_key") is None
        
        # Test non-existent key
        assert cache_service.get("non_existent") is None
        assert not cache_service.delete("non_existent")
    
    def test_ttl_expiration(self, cache_service):
        """Test TTL-based expiration."""
        # Set with short TTL
        cache_service.set("expiring_key", "value", ttl=1)
        assert cache_service.get("expiring_key") == "value"
        
        # Wait for expiration
        time.sleep(1.1)
        
        # Should be expired in fallback cache
        # Note: This test depends on the fallback cache implementation
        # In a real Redis setup, this would work differently
        assert cache_service.get("expiring_key") is None
    
    def test_namespace_support(self, cache_service):
        """Test namespace isolation."""
        cache_service.set("key", "value1", namespace="ns1")
        cache_service.set("key", "value2", namespace="ns2")
        
        assert cache_service.get("key", namespace="ns1") == "value1"
        assert cache_service.get("key", namespace="ns2") == "value2"
        assert cache_service.get("key") is None  # No namespace
    
    def test_tag_based_invalidation(self, cache_service):
        """Test cache invalidation by tags."""
        cache_service.set("key1", "value1", tags=["tag1", "tag2"])
        cache_service.set("key2", "value2", tags=["tag2", "tag3"])
        cache_service.set("key3", "value3", tags=["tag3"])
        
        # Invalidate by tag2
        invalidated = cache_service.invalidate_by_tags(["tag2"])
        assert invalidated == 2
        
        assert cache_service.get("key1") is None
        assert cache_service.get("key2") is None
        assert cache_service.get("key3") == "value3"
    
    def test_pattern_invalidation(self, cache_service):
        """Test pattern-based cache invalidation."""
        cache_service.set("user:1", "data1")
        cache_service.set("user:2", "data2") 
        cache_service.set("song:1", "data3")
        
        # Invalidate user patterns
        invalidated = cache_service.invalidate_pattern("user:*")
        assert invalidated >= 2  # May include prefix in count
        
        assert cache_service.get("user:1") is None
        assert cache_service.get("user:2") is None
        assert cache_service.get("song:1") == "data3"
    
    def test_get_or_set(self, cache_service):
        """Test get-or-set functionality."""
        call_count = 0
        
        def expensive_operation():
            nonlocal call_count
            call_count += 1
            return f"computed_value_{call_count}"
        
        # First call should compute
        result1 = cache_service.get_or_set("compute_key", expensive_operation)
        assert result1 == "computed_value_1"
        assert call_count == 1
        
        # Second call should use cache
        result2 = cache_service.get_or_set("compute_key", expensive_operation)
        assert result2 == "computed_value_1"
        assert call_count == 1  # Should not increment
    
    def test_cache_warming(self, cache_service):
        """Test cache warming functionality."""
        def warm_function():
            return "warmed_value"
        
        # Warm cache
        success = cache_service.warm_cache("warm_key", warm_function)
        assert success
        assert cache_service.get("warm_key") == "warmed_value"
        
        # Warming again should not overwrite
        def new_function():
            return "new_value"
        
        success = cache_service.warm_cache("warm_key", new_function)
        assert success  # Success because key exists
        assert cache_service.get("warm_key") == "warmed_value"  # Original value
    
    def test_compression(self, cache_config):
        """Test data compression for large values."""
        cache_config.compression_threshold = 10  # Very low for testing
        
        with patch('chordme.cache_service.current_app') as mock_app:
            mock_app.config.get.return_value = None
            cache_service = CacheService(cache_config)
        
        large_data = {"key": "x" * 100}  # Larger than threshold
        cache_service.set("large_key", large_data)
        
        retrieved = cache_service.get("large_key")
        assert retrieved == large_data
    
    def test_metrics_collection(self, cache_service):
        """Test cache metrics collection."""
        # Perform some cache operations
        cache_service.set("key1", "value1")
        cache_service.get("key1")  # Hit
        cache_service.get("key2")  # Miss
        cache_service.delete("key1")
        
        metrics = cache_service.get_metrics()
        
        assert metrics["hits"] >= 1
        assert metrics["misses"] >= 1
        assert metrics["sets"] >= 1
        assert metrics["deletes"] >= 1
        assert metrics["hit_rate"] > 0
    
    def test_health_check(self, cache_service):
        """Test cache health check."""
        health = cache_service.health_check()
        
        assert "healthy" in health
        assert "redis_connected" in health
        assert "fallback_available" in health
        assert health["fallback_available"] is True


class TestETagCache:
    """Test ETag-based response caching."""
    
    @pytest.fixture
    def etag_manager(self):
        """Test ETag manager instance."""
        with patch('chordme.etag_cache.get_cache_service') as mock_cache:
            mock_cache_instance = MagicMock()
            mock_cache.return_value = mock_cache_instance
            return ETagManager()
    
    def test_etag_generation(self, etag_manager):
        """Test ETag generation for different data types."""
        data1 = {"key": "value"}
        data2 = {"key": "value"}
        data3 = {"key": "different_value"}
        
        etag1 = etag_manager.generate_etag(data1)
        etag2 = etag_manager.generate_etag(data2)
        etag3 = etag_manager.generate_etag(data3)
        
        # Same data should generate same ETag
        assert etag1 == etag2
        
        # Different data should generate different ETag
        assert etag1 != etag3
        
        # ETags should be properly quoted
        assert etag1.startswith('"') and etag1.endswith('"')
    
    def test_if_none_match_checking(self, etag_manager):
        """Test If-None-Match header checking."""
        etag = '"abc123"'
        
        with patch('chordme.etag_cache.request') as mock_request:
            # Test no header
            mock_request.headers.get.return_value = None
            assert not etag_manager.check_if_none_match(etag)
            
            # Test matching ETag
            mock_request.headers.get.return_value = '"abc123"'
            assert etag_manager.check_if_none_match(etag)
            
            # Test non-matching ETag
            mock_request.headers.get.return_value = '"different"'
            assert not etag_manager.check_if_none_match(etag)
            
            # Test wildcard
            mock_request.headers.get.return_value = '*'
            assert etag_manager.check_if_none_match(etag)
    
    @patch('chordme.etag_cache.make_response')
    @patch('chordme.etag_cache.jsonify')
    def test_cached_response_creation(self, mock_jsonify, mock_make_response, etag_manager):
        """Test cached response creation with proper headers."""
        mock_response = MagicMock()
        mock_response.headers = {}
        mock_make_response.return_value = mock_response
        mock_jsonify.return_value = {"status": "success", "data": "test"}
        
        data = {"key": "value"}
        
        with patch.object(etag_manager, 'check_if_none_match', return_value=False):
            response = etag_manager.create_cached_response(data, max_age=3600)
            
            assert 'ETag' in mock_response.headers
            assert 'Cache-Control' in mock_response.headers
            assert 'public, max-age=3600' in mock_response.headers['Cache-Control']
    
    def test_etag_decorator(self, client):
        """Test the etag_cached decorator."""
        call_count = 0
        
        @etag_cached(ttl=300)
        def test_endpoint():
            nonlocal call_count
            call_count += 1
            return {"message": f"call_{call_count}"}
        
        # First call should execute function
        with patch('chordme.etag_cache.request') as mock_request:
            mock_request.full_path = '/test'
            mock_request.headers.get.return_value = None
            
            result1 = test_endpoint()
            assert call_count == 1
            
            # Second call should use cache
            result2 = test_endpoint()
            assert call_count == 1  # Should not increment


class TestQueryCache:
    """Test database query result caching."""
    
    def test_cache_query_decorator(self, client):
        """Test the cache_query decorator."""
        call_count = 0
        
        @cache_query(ttl=300, model_names=["Song"])
        def get_song_count():
            nonlocal call_count
            call_count += 1
            return 42
        
        # First call should execute query
        result1 = get_song_count()
        assert result1 == 42
        assert call_count == 1
        
        # Second call should use cache
        result2 = get_song_count()
        assert result2 == 42
        assert call_count == 1  # Should not increment
    
    def test_model_based_invalidation(self, client):
        """Test cache invalidation when models change."""
        cache_manager = QueryCacheManager()
        
        # Mock the cache service
        with patch('chordme.query_cache.get_cache_service') as mock_cache_service:
            mock_cache = MagicMock()
            mock_cache_service.return_value = mock_cache
            
            # Test invalidation
            cache_manager.invalidate_model_caches({"Song", "User"})
            
            # Should invalidate tags for both models
            mock_cache.invalidate_by_tags.assert_called_once()
            args = mock_cache.invalidate_by_tags.call_args[0][0]
            assert "model:Song" in args
            assert "model:User" in args
            assert "queries" in args
    
    @pytest.mark.skip(reason="Requires actual database operations")
    def test_sqlalchemy_event_integration(self, client):
        """Test SQLAlchemy event listener integration."""
        # This would require setting up actual database operations
        # and checking that cache invalidation occurs on model changes
        pass


class TestCacheIntegration:
    """Test cache system integration."""
    
    def test_cache_routes_health(self, client):
        """Test cache health endpoint."""
        response = client.get('/api/v1/cache/health')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'healthy' in data['data']
        assert 'redis_connected' in data['data']
        assert 'fallback_available' in data['data']
    
    def test_cache_routes_metrics(self, client):
        """Test cache metrics endpoint."""
        response = client.get('/api/v1/cache/metrics')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'hits' in data['data']
        assert 'misses' in data['data']
        assert 'hit_rate' in data['data']
    
    def test_cache_routes_clear_unauthorized(self, client):
        """Test cache clear endpoint requires authentication."""
        response = client.post('/api/v1/cache/clear')
        assert response.status_code == 401
    
    def test_cache_routes_clear_authorized(self, client, auth_token):
        """Test cache clear endpoint with authentication."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        response = client.post('/api/v1/cache/clear', 
                             json={'all': True},
                             headers=headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'cleared_count' in data['data']
    
    def test_cache_routes_warm_authorized(self, client, auth_token):
        """Test cache warming endpoint."""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        response = client.post('/api/v1/cache/warm',
                             json={'types': ['songs']},
                             headers=headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'warmed_count' in data['data']
    
    def test_cache_routes_analytics(self, client):
        """Test cache analytics endpoint."""
        response = client.get('/api/v1/cache/analytics')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'efficiency' in data['data']
        assert 'usage_patterns' in data['data']
        assert 'recommendations' in data['data']


class TestCachePerformance:
    """Test cache performance and edge cases."""
    
    def test_cache_performance_under_load(self, cache_service):
        """Test cache performance with many operations."""
        # Set many items
        for i in range(1000):
            cache_service.set(f"key_{i}", f"value_{i}")
        
        # Get all items
        start_time = time.time()
        for i in range(1000):
            value = cache_service.get(f"key_{i}")
            assert value == f"value_{i}"
        
        elapsed = time.time() - start_time
        # Should be very fast (under 1 second for 1000 operations)
        assert elapsed < 1.0
    
    def test_cache_memory_management(self, cache_service):
        """Test cache size limits and eviction."""
        # This test depends on the cache configuration
        # For fallback cache, it should respect maxCacheSize
        initial_size = len(cache_service.fallback_cache)
        
        # Fill cache beyond limit (if limit is enforced)
        for i in range(50):  # Small number for testing
            cache_service.set(f"test_key_{i}", f"test_value_{i}")
        
        # Check that cache doesn't grow indefinitely
        final_size = len(cache_service.fallback_cache)
        assert final_size <= 50  # Should respect some reasonable limit
    
    def test_concurrent_cache_access(self, cache_service):
        """Test cache behavior under concurrent access."""
        import threading
        import queue
        
        results = queue.Queue()
        
        def cache_worker(worker_id):
            try:
                # Each worker performs cache operations
                cache_service.set(f"worker_{worker_id}", f"data_{worker_id}")
                value = cache_service.get(f"worker_{worker_id}")
                results.put((worker_id, value))
            except Exception as e:
                results.put((worker_id, f"error: {e}"))
        
        # Start multiple threads
        threads = []
        for i in range(10):
            thread = threading.Thread(target=cache_worker, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # Check results
        while not results.empty():
            worker_id, value = results.get()
            if isinstance(value, str) and value.startswith("error"):
                pytest.fail(f"Worker {worker_id} failed: {value}")
            else:
                assert value == f"data_{worker_id}"
    
    def test_cache_graceful_degradation(self):
        """Test cache graceful degradation when Redis is unavailable."""
        config = CacheConfig(enabled=True)
        
        with patch('chordme.cache_service.current_app') as mock_app:
            # Simulate Redis connection failure
            mock_app.config.get.return_value = "redis://invalid:6379"
            
            with patch('chordme.cache_service.redis.from_url') as mock_redis:
                mock_redis.side_effect = Exception("Connection failed")
                
                # Should still create cache service
                cache_service = CacheService(config)
                assert cache_service.redis_client is None
                
                # Should fall back to in-memory cache
                assert cache_service.set("test", "value")
                assert cache_service.get("test") == "value"