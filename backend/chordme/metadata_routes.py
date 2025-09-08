#!/usr/bin/env python3
"""
Universal Music Metadata Service - Backend API endpoints
Provides metadata aggregation, normalization, and quality scoring
"""

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from flasgger import swag_from
import logging
from typing import Dict, List, Optional, Any
import json
import time
from datetime import datetime, timedelta

# Import existing auth and validation
from chordme.csrf_protection import csrf_protect
from chordme.rate_limiter import rate_limit

# Create the metadata routes blueprint
metadata_bp = Blueprint('metadata', __name__, url_prefix='/api/v1/metadata')

# Logger
logger = logging.getLogger(__name__)

class UniversalMetadataService:
    """Service for universal music metadata operations"""
    
    def __init__(self):
        self.cache = {}  # In-memory cache for demo (use Redis in production)
        self.cache_ttl = 24 * 60 * 60  # 24 hours
        self.quality_weights = {
            'completeness': 0.3,
            'accuracy': 0.3,
            'consistency': 0.25,
            'freshness': 0.15
        }
    
    def create_unified_metadata(self, platform_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create unified metadata from multiple platform sources"""
        
        # Extract data from each platform
        sources = []
        normalized_data = {}
        conflicts = []
        
        # Process Spotify data
        if 'spotify' in platform_data:
            spotify_data = platform_data['spotify']
            sources.append({
                'platform': 'spotify',
                'confidence': self._calculate_source_confidence('spotify', spotify_data),
                'retrievedAt': datetime.utcnow().isoformat(),
                'dataComplete': self._is_data_complete('spotify', spotify_data),
                'fields': self._get_available_fields('spotify', spotify_data)
            })
        
        # Process Apple Music data
        if 'apple_music' in platform_data:
            apple_data = platform_data['apple_music']
            sources.append({
                'platform': 'apple-music',
                'confidence': self._calculate_source_confidence('apple-music', apple_data),
                'retrievedAt': datetime.utcnow().isoformat(),
                'dataComplete': self._is_data_complete('apple-music', apple_data),
                'fields': self._get_available_fields('apple-music', apple_data)
            })
        
        # Detect conflicts between sources
        if len(sources) > 1:
            conflicts = self._detect_conflicts(platform_data)
        
        # Resolve conflicts and normalize data
        normalized_data = self._resolve_conflicts_and_normalize(platform_data, conflicts)
        
        # Calculate quality metrics
        quality = self._calculate_metadata_quality(sources, conflicts)
        
        return {
            'platforms': platform_data,
            'normalized': normalized_data,
            'quality': quality,
            'conflicts': conflicts,
            'lastUpdated': datetime.utcnow().isoformat(),
            'cacheExpiry': (datetime.utcnow() + timedelta(seconds=self.cache_ttl)).isoformat()
        }
    
    def _calculate_source_confidence(self, platform: str, data: Dict) -> float:
        """Calculate confidence score for a metadata source"""
        confidence = 0.5  # Base confidence
        
        if platform == 'spotify':
            confidence += 0.2  # Spotify generally has good metadata
            if data.get('popularity', 0) > 50:
                confidence += 0.1
            if data.get('external_ids', {}).get('isrc'):
                confidence += 0.1
        elif platform == 'apple-music':
            confidence += 0.15  # Apple Music has decent metadata
            if data.get('attributes', {}).get('isrc'):
                confidence += 0.1
        
        # Data completeness affects confidence
        if self._is_data_complete(platform, data):
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def _is_data_complete(self, platform: str, data: Dict) -> bool:
        """Check if track data is complete"""
        if platform == 'spotify':
            return bool(
                data.get('name') and 
                data.get('artists') and 
                data.get('album', {}).get('name') and 
                data.get('duration_ms')
            )
        elif platform == 'apple-music':
            attrs = data.get('attributes', {})
            return bool(
                attrs.get('name') and 
                attrs.get('artistName') and 
                attrs.get('albumName') and 
                attrs.get('durationInMillis')
            )
        return False
    
    def _get_available_fields(self, platform: str, data: Dict) -> List[str]:
        """Get available metadata fields from a track"""
        fields = []
        
        if platform == 'spotify':
            if data.get('name'):
                fields.append('title')
            if data.get('artists'):
                fields.append('artists')
            if data.get('album', {}).get('name'):
                fields.append('album')
            if data.get('duration_ms'):
                fields.append('duration')
            if data.get('album', {}).get('release_date'):
                fields.append('releaseDate')
            if data.get('external_ids', {}).get('isrc'):
                fields.append('isrc')
            if data.get('preview_url'):
                fields.append('previewUrl')
        elif platform == 'apple-music':
            attrs = data.get('attributes', {})
            if attrs.get('name'):
                fields.append('title')
            if attrs.get('artistName'):
                fields.append('artists')
            if attrs.get('albumName'):
                fields.append('album')
            if attrs.get('durationInMillis'):
                fields.append('duration')
            if attrs.get('releaseDate'):
                fields.append('releaseDate')
            if attrs.get('genreNames'):
                fields.append('genres')
            if attrs.get('isrc'):
                fields.append('isrc')
        
        return fields
    
    def _detect_conflicts(self, platform_data: Dict) -> List[Dict]:
        """Detect conflicts between metadata sources"""
        conflicts = []
        
        spotify_data = platform_data.get('spotify', {})
        apple_data = platform_data.get('apple_music', {})
        
        if not spotify_data or not apple_data:
            return conflicts
        
        # Check title conflicts
        spotify_title = spotify_data.get('name', '').lower().strip()
        apple_title = apple_data.get('attributes', {}).get('name', '').lower().strip()
        if spotify_title and apple_title and self._string_similarity(spotify_title, apple_title) < 0.9:
            conflicts.append({
                'field': 'title',
                'sources': [
                    {'platform': 'spotify', 'value': spotify_data.get('name'), 'confidence': 0.8},
                    {'platform': 'apple-music', 'value': apple_data.get('attributes', {}).get('name'), 'confidence': 0.7}
                ],
                'resolution': 'automatic'
            })
        
        # Check duration conflicts
        spotify_duration = spotify_data.get('duration_ms', 0)
        apple_duration = apple_data.get('attributes', {}).get('durationInMillis', 0)
        if abs(spotify_duration - apple_duration) > 5000:  # 5 second difference
            conflicts.append({
                'field': 'duration',
                'sources': [
                    {'platform': 'spotify', 'value': spotify_duration, 'confidence': 0.8},
                    {'platform': 'apple-music', 'value': apple_duration, 'confidence': 0.7}
                ],
                'resolution': 'automatic'
            })
        
        return conflicts
    
    def _string_similarity(self, str1: str, str2: str) -> float:
        """Calculate string similarity using simple ratio"""
        if str1 == str2:
            return 1.0
        if not str1 or not str2:
            return 0.0
        
        # Simple implementation - could use more sophisticated algorithms
        common_chars = set(str1) & set(str2)
        total_chars = set(str1) | set(str2)
        return len(common_chars) / len(total_chars) if total_chars else 0.0
    
    def _resolve_conflicts_and_normalize(self, platform_data: Dict, conflicts: List[Dict]) -> Dict:
        """Resolve conflicts and create normalized metadata"""
        spotify_data = platform_data.get('spotify', {})
        apple_data = platform_data.get('apple_music', {})
        
        # Start with basic normalization
        normalized = {
            'title': spotify_data.get('name') or apple_data.get('attributes', {}).get('name', ''),
            'artists': [],
            'album': spotify_data.get('album', {}).get('name') or apple_data.get('attributes', {}).get('albumName', ''),
            'durationMs': spotify_data.get('duration_ms') or apple_data.get('attributes', {}).get('durationInMillis', 0),
            'releaseDate': spotify_data.get('album', {}).get('release_date') or apple_data.get('attributes', {}).get('releaseDate'),
            'genres': apple_data.get('attributes', {}).get('genreNames', []),
            'isrc': spotify_data.get('external_ids', {}).get('isrc') or apple_data.get('attributes', {}).get('isrc'),
            'previewUrls': {
                'spotify': spotify_data.get('preview_url'),
                'appleMusic': apple_data.get('attributes', {}).get('previews', [{}])[0].get('url') if apple_data.get('attributes', {}).get('previews') else None
            },
            'externalUrls': {
                'spotify': spotify_data.get('external_urls', {}).get('spotify'),
                'appleMusic': apple_data.get('attributes', {}).get('url')
            }
        }
        
        # Handle artists array
        if spotify_data.get('artists'):
            normalized['artists'] = [artist.get('name', '') for artist in spotify_data['artists']]
        elif apple_data.get('attributes', {}).get('artistName'):
            normalized['artists'] = [apple_data['attributes']['artistName']]
        
        # Apply conflict resolutions
        for conflict in conflicts:
            if conflict['field'] in normalized:
                # Use confidence-based resolution
                best_source = max(conflict['sources'], key=lambda x: x['confidence'])
                normalized[conflict['field']] = best_source['value']
                conflict['resolvedValue'] = best_source['value']
                conflict['resolutionReason'] = 'Resolved using confidence-based strategy'
        
        return normalized
    
    def _calculate_metadata_quality(self, sources: List[Dict], conflicts: List[Dict]) -> Dict:
        """Calculate overall metadata quality score"""
        total_fields = 15  # Approximate number of metadata fields
        filled_fields = sum(len(source['fields']) for source in sources)
        completeness = min(filled_fields / total_fields, 1.0)
        
        # Calculate accuracy based on source confidence
        avg_confidence = sum(source['confidence'] for source in sources) / len(sources) if sources else 0
        accuracy = avg_confidence
        
        # Calculate consistency (lower conflict count = higher consistency)
        consistency = max(0, 1 - (len(conflicts) * 0.1))
        
        # Calculate freshness (all sources are fresh since just retrieved)
        freshness = 1.0
        
        # Overall quality is weighted average
        overall = (
            completeness * self.quality_weights['completeness'] +
            accuracy * self.quality_weights['accuracy'] +
            consistency * self.quality_weights['consistency'] +
            freshness * self.quality_weights['freshness']
        )
        
        return {
            'overall': overall,
            'completeness': completeness,
            'accuracy': accuracy,
            'consistency': consistency,
            'freshness': freshness,
            'sources': sources,
            'conflictCount': len(conflicts),
            'verificationStatus': 'verified' if overall > 0.8 else 'unverified' if overall > 0.6 else 'disputed'
        }

# Initialize the service
metadata_service = UniversalMetadataService()

@metadata_bp.route('/enrich', methods=['POST'])
@cross_origin()
@rate_limit(max_requests=100, window_seconds=60)  # 100 requests per minute
@swag_from({
    'tags': ['Metadata'],
    'summary': 'Enrich metadata from multiple sources',
    'description': 'Aggregate and normalize metadata from multiple music platforms with quality scoring',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'platforms': {
                    'type': 'object',
                    'properties': {
                        'spotify': {'type': 'object'},
                        'apple_music': {'type': 'object'}
                    }
                },
                'options': {
                    'type': 'object',
                    'properties': {
                        'conflictResolution': {
                            'type': 'string',
                            'enum': ['confidence', 'majority', 'newest', 'manual']
                        },
                        'qualityThreshold': {'type': 'number'},
                        'includeConflicts': {'type': 'boolean'}
                    }
                }
            },
            'required': ['platforms']
        }
    }],
    'responses': {
        200: {
            'description': 'Unified metadata with quality scoring',
            'schema': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'platforms': {'type': 'object'},
                            'normalized': {'type': 'object'},
                            'quality': {'type': 'object'},
                            'conflicts': {'type': 'array'},
                            'lastUpdated': {'type': 'string'},
                            'cacheExpiry': {'type': 'string'}
                        }
                    }
                }
            }
        },
        400: {'description': 'Invalid request data'},
        429: {'description': 'Rate limit exceeded'}
    }
})
def enrich_metadata():
    """Enrich metadata from multiple platform sources"""
    try:
        data = request.get_json()
        if not data or 'platforms' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Platform data is required'
            }), 400
        
        platform_data = data['platforms']
        if not platform_data:
            return jsonify({
                'status': 'error',
                'message': 'At least one platform must be provided'
            }), 400
        
        # Create unified metadata
        unified_metadata = metadata_service.create_unified_metadata(platform_data)
        
        # Apply quality threshold if specified
        options = data.get('options', {})
        quality_threshold = options.get('qualityThreshold', 0.0)
        if unified_metadata['quality']['overall'] < quality_threshold:
            return jsonify({
                'status': 'warning',
                'message': f"Metadata quality ({unified_metadata['quality']['overall']:.2f}) below threshold ({quality_threshold})",
                'data': unified_metadata
            }), 200
        
        return jsonify({
            'status': 'success',
            'data': unified_metadata
        }), 200
        
    except Exception as e:
        logger.error(f"Error enriching metadata: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to enrich metadata'
        }), 500

@metadata_bp.route('/batch-enrich', methods=['POST'])
@cross_origin()
@rate_limit(max_requests=10, window_seconds=60)  # 10 requests per minute for batch operations
@swag_from({
    'tags': ['Metadata'],
    'summary': 'Batch metadata enrichment',
    'description': 'Process multiple tracks for metadata enrichment in batches',
    'parameters': [{
        'name': 'body',
        'in': 'body',
        'required': True,
        'schema': {
            'type': 'object',
            'properties': {
                'tracks': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'id': {'type': 'string'},
                            'platforms': {'type': 'object'}
                        }
                    }
                },
                'options': {
                    'type': 'object',
                    'properties': {
                        'batchSize': {'type': 'integer'},
                        'includeFailures': {'type': 'boolean'}
                    }
                }
            },
            'required': ['tracks']
        }
    }],
    'responses': {
        200: {
            'description': 'Batch enrichment results',
            'schema': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'results': {'type': 'array'},
                            'totalProcessed': {'type': 'integer'},
                            'successCount': {'type': 'integer'},
                            'failureCount': {'type': 'integer'}
                        }
                    }
                }
            }
        }
    }
})
def batch_enrich_metadata():
    """Process multiple tracks for metadata enrichment"""
    try:
        data = request.get_json()
        tracks = data.get('tracks', [])
        options = data.get('options', {})
        
        if not tracks:
            return jsonify({
                'status': 'error',
                'message': 'No tracks provided'
            }), 400
        
        batch_size = options.get('batchSize', 10)
        include_failures = options.get('includeFailures', True)
        
        results = []
        success_count = 0
        failure_count = 0
        
        # Process tracks in batches
        for i in range(0, len(tracks), batch_size):
            batch = tracks[i:i + batch_size]
            
            for track in batch:
                try:
                    if 'platforms' not in track:
                        if include_failures:
                            results.append({
                                'id': track.get('id', 'unknown'),
                                'status': 'error',
                                'message': 'No platform data provided'
                            })
                        failure_count += 1
                        continue
                    
                    unified_metadata = metadata_service.create_unified_metadata(track['platforms'])
                    results.append({
                        'id': track.get('id', 'unknown'),
                        'status': 'success',
                        'metadata': unified_metadata
                    })
                    success_count += 1
                    
                except Exception as e:
                    if include_failures:
                        results.append({
                            'id': track.get('id', 'unknown'),
                            'status': 'error',
                            'message': str(e)
                        })
                    failure_count += 1
            
            # Add small delay between batches to prevent overwhelming
            if i + batch_size < len(tracks):
                time.sleep(0.1)
        
        return jsonify({
            'status': 'success',
            'data': {
                'results': results,
                'totalProcessed': len(tracks),
                'successCount': success_count,
                'failureCount': failure_count
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in batch metadata enrichment: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to process batch enrichment'
        }), 500

@metadata_bp.route('/quality-score', methods=['POST'])
@cross_origin()
@rate_limit(max_requests=200, window_seconds=60)
@swag_from({
    'tags': ['Metadata'],
    'summary': 'Calculate metadata quality score',
    'description': 'Calculate quality score for provided metadata',
    'responses': {
        200: {
            'description': 'Quality score calculated',
            'schema': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'qualityScore': {'type': 'number'},
                            'breakdown': {'type': 'object'}
                        }
                    }
                }
            }
        }
    }
})
def calculate_quality_score():
    """Calculate quality score for metadata"""
    try:
        data = request.get_json()
        platform_data = data.get('platforms', {})
        
        if not platform_data:
            return jsonify({
                'status': 'error',
                'message': 'Platform data is required'
            }), 400
        
        # Create temporary unified metadata to get quality score
        unified_metadata = metadata_service.create_unified_metadata(platform_data)
        
        return jsonify({
            'status': 'success',
            'data': {
                'qualityScore': unified_metadata['quality']['overall'],
                'breakdown': unified_metadata['quality']
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error calculating quality score: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to calculate quality score'
        }), 500

@metadata_bp.route('/health', methods=['GET'])
@cross_origin()
def health_check():
    """Health check endpoint for metadata service"""
    return jsonify({
        'status': 'healthy',
        'service': 'Universal Music Metadata System',
        'timestamp': datetime.utcnow().isoformat()
    }), 200