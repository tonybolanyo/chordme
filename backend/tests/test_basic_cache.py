"""
Simple tests for cache service functionality.
Tests basic cache operations without requiring full Flask app context.
"""

import pytest
import time
from unittest.mock import patch, MagicMock

# Import cache service components directly
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Import only CacheConfig at module level, CacheService will be imported in fixtures
from chordme.cache_service import CacheConfig


class TestBasicCacheService:
    """Test basic cache service functionality without Flask app context."""
    
    @pytest.fixture
    def cache_config(self):
        """Test cache configuration."""
        return CacheConfig(
            enabled=True,
            default_ttl=300,
            max_ttl=3600,
            key_prefix="test",
            compression_enabled=False,  # Disable for simpler testing
            warm_cache_on_startup=False
        )
    
    @pytest.fixture 
    def cache_service(self, cache_config):
        """Test cache service instance with mocked Flask app."""
        # Import CacheService inside the fixture to avoid import-time Flask context issues
        from chordme.cache_service import CacheService
        
        with patch('chordme.cache_service.current_app') as mock_app:
            mock_app.config.get.return_value = None  # No Redis URL
            return CacheService(cache_config)
    
    def test_basic_get_set_operations(self, cache_service):
        """Test basic cache get/set operations."""
        # Test setting and getting a value
        assert cache_service.set("test_key", "test_value")
        assert cache_service.get("test_key") == "test_value"
        
        # Test getting non-existent key
        assert cache_service.get("non_existent_key") is None
    
    def test_cache_deletion(self, cache_service):
        """Test cache deletion."""
        # Set a value then delete it
        cache_service.set("delete_key", "delete_value")
        assert cache_service.get("delete_key") == "delete_value"
        
        assert cache_service.delete("delete_key")
        assert cache_service.get("delete_key") is None
        
        # Deleting non-existent key should return False
        assert not cache_service.delete("non_existent")
    
    def test_namespace_isolation(self, cache_service):
        """Test namespace support."""
        cache_service.set("key", "value1", namespace="ns1")
        cache_service.set("key", "value2", namespace="ns2")
        cache_service.set("key", "value3")  # No namespace
        
        assert cache_service.get("key", namespace="ns1") == "value1"
        assert cache_service.get("key", namespace="ns2") == "value2"
        assert cache_service.get("key") == "value3"
    
    def test_ttl_support(self, cache_service):
        """Test TTL configuration."""
        # This tests that TTL is set, but not expiration (would require waiting)
        result = cache_service.set("ttl_key", "ttl_value", ttl=100)
        assert result is True
        assert cache_service.get("ttl_key") == "ttl_value"
    
    def test_tag_based_operations(self, cache_service):
        """Test tag-based cache operations."""
        cache_service.set("key1", "value1", tags=["tag1", "tag2"])
        cache_service.set("key2", "value2", tags=["tag2"])
        cache_service.set("key3", "value3", tags=["tag3"])
        
        # Invalidate by tag2
        invalidated = cache_service.invalidate_by_tags(["tag2"])
        assert invalidated == 2
        
        # key1 and key2 should be gone, key3 should remain
        assert cache_service.get("key1") is None
        assert cache_service.get("key2") is None
        assert cache_service.get("key3") == "value3"
    
    def test_get_or_set_pattern(self, cache_service):
        """Test get-or-set functionality."""
        call_count = 0
        
        def expensive_function():
            nonlocal call_count
            call_count += 1
            return f"computed_value_{call_count}"
        
        # First call should compute and cache
        result1 = cache_service.get_or_set("compute_key", expensive_function)
        assert result1 == "computed_value_1"
        assert call_count == 1
        
        # Second call should return cached value
        result2 = cache_service.get_or_set("compute_key", expensive_function)
        assert result2 == "computed_value_1"
        assert call_count == 1  # Function should not be called again
    
    def test_cache_warming(self, cache_service):
        """Test cache warming functionality."""
        def warm_function():
            return "warmed_value"
        
        # Cache should be empty initially
        assert cache_service.get("warm_key") is None
        
        # Warm the cache
        success = cache_service.warm_cache("warm_key", warm_function)
        assert success
        assert cache_service.get("warm_key") == "warmed_value"
        
        # Warming again should not overwrite (returns True because key exists)
        def new_function():
            return "new_value"
        
        success = cache_service.warm_cache("warm_key", new_function)
        assert success
        assert cache_service.get("warm_key") == "warmed_value"  # Original value preserved
    
    def test_cache_metrics(self, cache_service):
        """Test cache metrics collection."""
        # Perform some operations to generate metrics
        cache_service.set("metrics_key", "metrics_value")
        cache_service.get("metrics_key")  # Hit
        cache_service.get("missing_key")  # Miss
        cache_service.delete("metrics_key")
        
        metrics = cache_service.get_metrics()
        
        # Check that metrics are collected
        assert "hits" in metrics
        assert "misses" in metrics
        assert "sets" in metrics
        assert "deletes" in metrics
        assert "hit_rate" in metrics
        
        assert metrics["hits"] >= 1
        assert metrics["misses"] >= 1
        assert metrics["sets"] >= 1
        assert metrics["deletes"] >= 1
    
    def test_health_check(self, cache_service):
        """Test cache health check."""
        health = cache_service.health_check()
        
        assert isinstance(health, dict)
        assert "healthy" in health
        assert "redis_connected" in health
        assert "fallback_available" in health
        
        # Should report fallback as available
        assert health["fallback_available"] is True
        # Redis should not be connected (mocked to return None)
        assert health["redis_connected"] is False
    
    def test_pattern_invalidation(self, cache_service):
        """Test pattern-based cache invalidation."""
        # Set up test data
        cache_service.set("user:1", "user1_data")
        cache_service.set("user:2", "user2_data")
        cache_service.set("song:1", "song1_data")
        
        # Test pattern invalidation
        invalidated = cache_service.invalidate_pattern("user:*")
        
        # Should have invalidated user keys but not song keys
        assert invalidated >= 2  # At least the user keys
        assert cache_service.get("user:1") is None
        assert cache_service.get("user:2") is None
        assert cache_service.get("song:1") == "song1_data"
    
    def test_clear_all_cache(self, cache_service):
        """Test clearing all cache entries."""
        # Add some test data
        cache_service.set("key1", "value1")
        cache_service.set("key2", "value2", namespace="ns1")
        cache_service.set("key3", "value3", namespace="ns2")
        
        # Clear all cache
        success = cache_service.clear_all()
        assert success
        
        # All keys should be gone
        assert cache_service.get("key1") is None
        assert cache_service.get("key2", namespace="ns1") is None
        assert cache_service.get("key3", namespace="ns2") is None


if __name__ == "__main__":
    # Simple test runner
    config = CacheConfig(
        enabled=True,
        default_ttl=300,
        warm_cache_on_startup=False
    )
    
    with patch('chordme.cache_service.current_app') as mock_app:
        mock_app.config.get.return_value = None
        cache = CacheService(config)
    
    # Test basic operations
    print("Testing basic cache operations...")
    
    # Set and get
    cache.set("test", "value")
    assert cache.get("test") == "value"
    print("✓ Set/Get works")
    
    # Delete
    assert cache.delete("test")
    assert cache.get("test") is None
    print("✓ Delete works")
    
    # Namespaces
    cache.set("key", "val1", namespace="ns1")
    cache.set("key", "val2", namespace="ns2")
    assert cache.get("key", namespace="ns1") == "val1"
    assert cache.get("key", namespace="ns2") == "val2"
    print("✓ Namespaces work")
    
    # Tags
    cache.set("tagged1", "val1", tags=["tag1"])
    cache.set("tagged2", "val2", tags=["tag1"])
    invalidated = cache.invalidate_by_tags(["tag1"])
    assert invalidated == 2
    print("✓ Tag invalidation works")
    
    # Health check
    health = cache.health_check()
    assert health["fallback_available"]
    print("✓ Health check works")
    
    print("All basic tests passed! ✓")