"""
Cache monitoring and analytics API endpoints.

This module provides endpoints for:
- Cache performance metrics
- Cache health monitoring
- Cache management operations
- Cache analytics and insights
"""

from flask import Blueprint, jsonify, request
from flasgger import swag_from
import logging

from .cache_service import get_cache_service
from .utils import auth_required
from .monitoring import monitor_request_metrics

logger = logging.getLogger(__name__)

cache_bp = Blueprint('cache', __name__, url_prefix='/api/v1/cache')


@cache_bp.route('/health', methods=['GET'])
@swag_from({
    'tags': ['Cache Management'],
    'summary': 'Get cache health status',
    'description': 'Returns comprehensive health information about the caching system including Redis connectivity and fallback status.',
    'responses': {
        200: {
            'description': 'Cache health information',
            'schema': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string', 'example': 'success'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'healthy': {'type': 'boolean', 'description': 'Overall cache health'},
                            'redis_connected': {'type': 'boolean', 'description': 'Redis connection status'},
                            'fallback_available': {'type': 'boolean', 'description': 'In-memory fallback availability'},
                            'error': {'type': 'string', 'description': 'Error message if any'}
                        }
                    }
                }
            }
        }
    }
})
@monitor_request_metrics
def cache_health():
    """Get cache system health status."""
    cache = get_cache_service()
    health_data = cache.health_check()
    
    return jsonify({
        'status': 'success',
        'data': health_data
    })


@cache_bp.route('/metrics', methods=['GET'])
@swag_from({
    'tags': ['Cache Management'],
    'summary': 'Get cache performance metrics',
    'description': 'Returns detailed performance metrics including hit rates, response times, and memory usage.',
    'responses': {
        200: {
            'description': 'Cache performance metrics',
            'schema': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string', 'example': 'success'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'hits': {'type': 'integer', 'description': 'Cache hits count'},
                            'misses': {'type': 'integer', 'description': 'Cache misses count'},
                            'hit_rate': {'type': 'number', 'description': 'Cache hit rate (0-1)'},
                            'avg_response_time_ms': {'type': 'number', 'description': 'Average response time in milliseconds'},
                            'memory_usage_bytes': {'type': 'integer', 'description': 'Memory usage in bytes'},
                            'keys_count': {'type': 'integer', 'description': 'Total number of cached keys'},
                            'connected': {'type': 'boolean', 'description': 'Redis connection status'}
                        }
                    }
                }
            }
        }
    }
})
@monitor_request_metrics
def cache_metrics():
    """Get comprehensive cache performance metrics."""
    cache = get_cache_service()
    metrics_data = cache.get_metrics()
    
    return jsonify({
        'status': 'success',
        'data': metrics_data
    })


@cache_bp.route('/clear', methods=['POST'])
@swag_from({
    'tags': ['Cache Management'],
    'summary': 'Clear cache entries',
    'description': 'Clear cache entries by namespace, pattern, or tags. Requires authentication.',
    'security': [{'Bearer': []}],
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'required': False,
            'schema': {
                'type': 'object',
                'properties': {
                    'namespace': {'type': 'string', 'description': 'Namespace to clear'},
                    'pattern': {'type': 'string', 'description': 'Key pattern to match'},
                    'tags': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Tags to invalidate'},
                    'all': {'type': 'boolean', 'description': 'Clear all cache entries'}
                }
            }
        }
    ],
    'responses': {
        200: {
            'description': 'Cache cleared successfully',
            'schema': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string', 'example': 'success'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'cleared_count': {'type': 'integer', 'description': 'Number of entries cleared'},
                            'operation': {'type': 'string', 'description': 'Type of clear operation performed'}
                        }
                    }
                }
            }
        },
        400: {'description': 'Invalid request parameters'},
        401: {'description': 'Authentication required'},
        500: {'description': 'Cache clear operation failed'}
    }
})
@auth_required
@monitor_request_metrics
def clear_cache():
    """Clear cache entries based on various criteria."""
    cache = get_cache_service()
    data = request.get_json() or {}
    
    cleared_count = 0
    operation = "none"
    
    if data.get('all'):
        # Clear all cache entries
        success = cache.clear_all()
        operation = "clear_all"
        cleared_count = "all" if success else 0
        
    elif 'namespace' in data:
        # Clear by namespace
        success = cache.clear_all(namespace=data['namespace'])
        operation = f"clear_namespace:{data['namespace']}"
        cleared_count = "namespace" if success else 0
        
    elif 'pattern' in data:
        # Clear by pattern
        cleared_count = cache.invalidate_pattern(data['pattern'])
        operation = f"clear_pattern:{data['pattern']}"
        
    elif 'tags' in data:
        # Clear by tags
        cleared_count = cache.invalidate_by_tags(data['tags'])
        operation = f"clear_tags:{','.join(data['tags'])}"
        
    else:
        return jsonify({
            'status': 'error',
            'error': {
                'code': 'INVALID_CLEAR_PARAMS',
                'message': 'Must specify namespace, pattern, tags, or all=true',
                'category': 'validation',
                'retryable': False
            }
        }), 400
    
    logger.info(f"Cache clear operation: {operation}, cleared: {cleared_count}")
    
    return jsonify({
        'status': 'success',
        'data': {
            'cleared_count': cleared_count,
            'operation': operation
        }
    })


@cache_bp.route('/warm', methods=['POST'])
@swag_from({
    'tags': ['Cache Management'],
    'summary': 'Warm cache with popular content',
    'description': 'Pre-populate cache with frequently accessed content to improve performance. Requires authentication.',
    'security': [{'Bearer': []}],
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'required': False,
            'schema': {
                'type': 'object',
                'properties': {
                    'types': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'Types of content to warm (songs, users, analytics)',
                        'example': ['songs', 'analytics']
                    },
                    'force': {'type': 'boolean', 'description': 'Force refresh existing cached items'}
                }
            }
        }
    ],
    'responses': {
        200: {
            'description': 'Cache warming completed',
            'schema': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string', 'example': 'success'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'warmed_count': {'type': 'integer', 'description': 'Number of items warmed'},
                            'types': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Content types warmed'},
                            'duration_ms': {'type': 'number', 'description': 'Time taken for warming operation'}
                        }
                    }
                }
            }
        },
        401: {'description': 'Authentication required'},
        500: {'description': 'Cache warming failed'}
    }
})
@auth_required
@monitor_request_metrics
def warm_cache():
    """Warm cache with frequently accessed content."""
    import time
    start_time = time.time()
    
    cache = get_cache_service()
    data = request.get_json() or {}
    types = data.get('types', ['songs', 'analytics'])
    force = data.get('force', False)
    
    warmed_count = 0
    
    try:
        # Import models here to avoid circular imports
        from .models import Song, User
        from .api import get_songs
        
        for content_type in types:
            if content_type == 'songs':
                # Warm popular songs
                warmed_count += _warm_popular_songs(cache, force)
                
            elif content_type == 'users':
                # Warm user statistics
                warmed_count += _warm_user_stats(cache, force)
                
            elif content_type == 'analytics':
                # Warm analytics data
                warmed_count += _warm_analytics(cache, force)
                
        duration_ms = (time.time() - start_time) * 1000
        
        logger.info(f"Cache warming completed: {warmed_count} items, {duration_ms:.2f}ms")
        
        return jsonify({
            'status': 'success',
            'data': {
                'warmed_count': warmed_count,
                'types': types,
                'duration_ms': round(duration_ms, 2)
            }
        })
        
    except Exception as e:
        logger.error(f"Cache warming failed: {e}")
        return jsonify({
            'status': 'error',
            'error': {
                'code': 'CACHE_WARMING_FAILED',
                'message': 'Failed to warm cache',
                'category': 'server_error',
                'retryable': True
            }
        }), 500


@cache_bp.route('/analytics', methods=['GET'])
@swag_from({
    'tags': ['Cache Management'],
    'summary': 'Get cache analytics and insights',
    'description': 'Returns detailed analytics about cache usage patterns, efficiency, and recommendations.',
    'parameters': [
        {
            'name': 'period',
            'in': 'query',
            'type': 'string',
            'enum': ['hour', 'day', 'week'],
            'default': 'day',
            'description': 'Time period for analytics'
        }
    ],
    'responses': {
        200: {
            'description': 'Cache analytics data',
            'schema': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string', 'example': 'success'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'efficiency': {
                                'type': 'object',
                                'properties': {
                                    'hit_rate': {'type': 'number'},
                                    'avg_response_time_ms': {'type': 'number'},
                                    'efficiency_score': {'type': 'number'}
                                }
                            },
                            'usage_patterns': {
                                'type': 'object',
                                'properties': {
                                    'most_accessed_keys': {'type': 'array'},
                                    'cache_turnover_rate': {'type': 'number'}
                                }
                            },
                            'recommendations': {
                                'type': 'array',
                                'items': {'type': 'string'}
                            }
                        }
                    }
                }
            }
        }
    }
})
@monitor_request_metrics
def cache_analytics():
    """Get detailed cache analytics and insights."""
    cache = get_cache_service()
    period = request.args.get('period', 'day')
    
    metrics = cache.get_metrics()
    
    # Calculate efficiency score (0-100)
    hit_rate = metrics.get('hit_rate', 0)
    response_time = metrics.get('avg_response_time_ms', 0)
    
    # Efficiency score: prioritize hit rate, penalize slow response times
    efficiency_score = hit_rate * 100
    if response_time > 10:  # If response time > 10ms
        efficiency_score *= (10 / response_time)
    efficiency_score = min(100, max(0, efficiency_score))
    
    # Generate recommendations
    recommendations = []
    if hit_rate < 0.8:
        recommendations.append("Consider increasing cache TTL or warming frequently accessed content")
    if response_time > 50:
        recommendations.append("High response time detected - check Redis connectivity and memory")
    if metrics.get('memory_usage_bytes', 0) > 1024 * 1024 * 100:  # > 100MB
        recommendations.append("High memory usage - consider implementing cache eviction policies")
    if not metrics.get('connected', False):
        recommendations.append("Redis not connected - operating in fallback mode with reduced performance")
    
    analytics_data = {
        'efficiency': {
            'hit_rate': hit_rate,
            'avg_response_time_ms': response_time,
            'efficiency_score': round(efficiency_score, 2)
        },
        'usage_patterns': {
            'total_requests': metrics.get('total_requests', 0),
            'cache_size_keys': metrics.get('keys_count', 0),
            'fallback_cache_size': metrics.get('fallback_cache_size', 0)
        },
        'recommendations': recommendations,
        'period': period,
        'timestamp': time.time()
    }
    
    return jsonify({
        'status': 'success',
        'data': analytics_data
    })


def _warm_popular_songs(cache, force=False):
    """Warm cache with popular songs."""
    try:
        from .models import Song
        
        # This would typically query based on access analytics
        # For now, just cache recent songs
        def get_popular_songs():
            return Song.query.order_by(Song.created_at.desc()).limit(10).all()
        
        if force or cache.get('songs:popular:limit:10') is None:
            songs = get_popular_songs()
            cache.set('songs:popular:limit:10', [s.to_dict() for s in songs], 
                     ttl=3600, tags=['songs', 'popular'])
            return 1
        return 0
        
    except Exception as e:
        logger.error(f"Failed to warm popular songs: {e}")
        return 0


def _warm_user_stats(cache, force=False):
    """Warm cache with user statistics."""
    try:
        from .models import User
        
        def get_user_count():
            return User.query.count()
        
        if force or cache.get('users:count') is None:
            count = get_user_count()
            cache.set('users:count', count, ttl=1800, tags=['users', 'stats'])
            return 1
        return 0
        
    except Exception as e:
        logger.error(f"Failed to warm user stats: {e}")
        return 0


def _warm_analytics(cache, force=False):
    """Warm cache with analytics data."""
    try:
        def get_health_status():
            return {"status": "ok", "timestamp": time.time()}
        
        if force or cache.get('api:health') is None:
            health = get_health_status()
            cache.set('api:health', health, ttl=300, tags=['api', 'health'])
            return 1
        return 0
        
    except Exception as e:
        logger.error(f"Failed to warm analytics: {e}")
        return 0