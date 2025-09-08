"""
Apple Music Integration Routes
Handles Apple Music API integration endpoints for music metadata enrichment,
playlist synchronization, and music discovery features using MusicKit.
"""

from flask import Blueprint, request, jsonify, g
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from . import db
from .models import User, Song, SongVersion
from .utils import (
    auth_required, 
    validate_request_size, 
    sanitize_input,
    create_error_response,
    create_success_response,
    validate_positive_integer
)
from .rate_limiter import rate_limit
from .security_headers import security_headers
from .error_codes import ErrorCode
import os
import requests
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import logging
import json

logger = logging.getLogger(__name__)

# Create Apple Music blueprint
apple_music_bp = Blueprint('apple_music', __name__, url_prefix='/api/v1/apple-music')

# Apple Music API configuration
APPLE_MUSIC_DEVELOPER_TOKEN = os.environ.get('APPLE_MUSIC_DEVELOPER_TOKEN')
APPLE_MUSIC_API_BASE_URL = 'https://api.music.apple.com/v1'

class AppleMusicService:
    """Service class for Apple Music API interactions"""
    
    def __init__(self):
        self.developer_token = APPLE_MUSIC_DEVELOPER_TOKEN
        self.base_url = APPLE_MUSIC_API_BASE_URL
        
    def is_configured(self) -> bool:
        """Check if Apple Music API is properly configured"""
        return bool(self.developer_token)
    
    def _get_headers(self, user_token: Optional[str] = None) -> Dict[str, str]:
        """Get headers for Apple Music API requests"""
        headers = {
            'Authorization': f'Bearer {self.developer_token}',
            'Content-Type': 'application/json'
        }
        
        if user_token:
            headers['Music-User-Token'] = user_token
            
        return headers
    
    def _make_request(self, method: str, endpoint: str, params: Optional[Dict] = None, 
                     data: Optional[Dict] = None, user_token: Optional[str] = None) -> Dict:
        """Make a request to Apple Music API with error handling"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = self._get_headers(user_token)
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=data,
                timeout=10
            )
            
            # Handle rate limiting
            if response.status_code == 429:
                retry_after = response.headers.get('Retry-After', '60')
                logger.warning(f"Apple Music API rate limited. Retry after {retry_after} seconds")
                raise Exception(f"Rate limited. Retry after {retry_after} seconds")
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Apple Music API request failed: {e}")
            raise Exception(f"Apple Music API request failed: {str(e)}")
    
    def search_catalog(self, term: str, types: List[str], limit: int = 25, 
                      offset: int = 0, language: Optional[str] = None) -> Dict:
        """Search Apple Music catalog"""
        params = {
            'term': term,
            'types': ','.join(types),
            'limit': min(limit, 50),  # API maximum is 50
            'offset': offset
        }
        
        if language:
            params['l'] = language
            
        return self._make_request('GET', 'catalog/us/search', params=params)
    
    def get_song(self, song_id: str, user_token: Optional[str] = None) -> Dict:
        """Get song details by ID"""
        return self._make_request('GET', f'catalog/us/songs/{song_id}', user_token=user_token)
    
    def get_album(self, album_id: str, user_token: Optional[str] = None) -> Dict:
        """Get album details by ID"""
        return self._make_request('GET', f'catalog/us/albums/{album_id}', user_token=user_token)
    
    def get_artist(self, artist_id: str, user_token: Optional[str] = None) -> Dict:
        """Get artist details by ID"""
        return self._make_request('GET', f'catalog/us/artists/{artist_id}', user_token=user_token)
    
    def get_recommendations(self, recommendation_id: str, limit: int = 25, 
                          user_token: Optional[str] = None) -> Dict:
        """Get recommendations"""
        params = {'limit': min(limit, 50)}
        return self._make_request('GET', f'catalog/us/recommendations/{recommendation_id}', 
                                params=params, user_token=user_token)
    
    def cross_platform_match(self, track_data: Dict) -> Dict:
        """Find Apple Music tracks that match given track data"""
        # Build search query from track metadata
        query_parts = []
        
        if track_data.get('name'):
            query_parts.append(f'"{track_data["name"]}"')
        
        if track_data.get('artist_name'):
            query_parts.append(f'"{track_data["artist_name"]}"')
            
        if track_data.get('album_name'):
            query_parts.append(f'"{track_data["album_name"]}"')
        
        search_term = ' '.join(query_parts)
        
        results = self.search_catalog(
            term=search_term,
            types=['songs'],
            limit=20
        )
        
        # Score matches based on similarity
        matches = []
        if 'results' in results and 'songs' in results['results']:
            for song in results['results']['songs']['data']:
                confidence = self._calculate_match_confidence(track_data, song)
                if confidence > 0.3:  # Only include reasonable matches
                    matches.append({
                        'song': song,
                        'confidence': confidence,
                        'matched_by': self._get_match_criteria(track_data, song)
                    })
        
        # Sort by confidence
        matches.sort(key=lambda x: x['confidence'], reverse=True)
        
        return {
            'source_track': track_data,
            'matches': matches,
            'best_match': matches[0] if matches else None
        }
    
    def _calculate_match_confidence(self, source: Dict, candidate: Dict) -> float:
        """Calculate match confidence between source track and Apple Music candidate"""
        confidence = 0.0
        factors = 0
        
        # Compare track names
        if source.get('name') and candidate.get('attributes', {}).get('name'):
            name_similarity = self._string_similarity(
                source['name'].lower(),
                candidate['attributes']['name'].lower()
            )
            if name_similarity > 0.7:
                confidence += name_similarity * 0.4
            factors += 1
        
        # Compare artist names
        if source.get('artist_name') and candidate.get('attributes', {}).get('artistName'):
            artist_similarity = self._string_similarity(
                source['artist_name'].lower(),
                candidate['attributes']['artistName'].lower()
            )
            if artist_similarity > 0.7:
                confidence += artist_similarity * 0.3
            factors += 1
        
        # Compare album names
        if source.get('album_name') and candidate.get('attributes', {}).get('albumName'):
            album_similarity = self._string_similarity(
                source['album_name'].lower(),
                candidate['attributes']['albumName'].lower()
            )
            if album_similarity > 0.7:
                confidence += album_similarity * 0.2
            factors += 1
        
        # Compare duration (if available)
        if source.get('duration_ms') and candidate.get('attributes', {}).get('durationInMillis'):
            duration_diff = abs(source['duration_ms'] - candidate['attributes']['durationInMillis'])
            if duration_diff <= 5000:  # 5 second tolerance
                duration_similarity = 1 - (duration_diff / 5000)
                confidence += duration_similarity * 0.1
            factors += 1
        
        return confidence / factors if factors > 0 else 0
    
    def _string_similarity(self, str1: str, str2: str) -> float:
        """Calculate string similarity using simple character matching"""
        if str1 == str2:
            return 1.0
        
        # Simple character-based similarity
        set1 = set(str1.replace(' ', ''))
        set2 = set(str2.replace(' ', ''))
        
        if not set1 and not set2:
            return 1.0
        if not set1 or not set2:
            return 0.0
        
        intersection = len(set1.intersection(set2))
        union = len(set1.union(set2))
        
        return intersection / union if union > 0 else 0
    
    def _get_match_criteria(self, source: Dict, candidate: Dict) -> List[str]:
        """Get list of criteria that matched between tracks"""
        criteria = []
        
        # Check name match
        if (source.get('name') and candidate.get('attributes', {}).get('name') and
            self._string_similarity(source['name'].lower(), 
                                  candidate['attributes']['name'].lower()) > 0.7):
            criteria.append('title')
        
        # Check artist match
        if (source.get('artist_name') and candidate.get('attributes', {}).get('artistName') and
            self._string_similarity(source['artist_name'].lower(), 
                                  candidate['attributes']['artistName'].lower()) > 0.7):
            criteria.append('artist')
        
        # Check album match
        if (source.get('album_name') and candidate.get('attributes', {}).get('albumName') and
            self._string_similarity(source['album_name'].lower(), 
                                  candidate['attributes']['albumName'].lower()) > 0.7):
            criteria.append('album')
        
        # Check duration match
        if (source.get('duration_ms') and candidate.get('attributes', {}).get('durationInMillis') and
            abs(source['duration_ms'] - candidate['attributes']['durationInMillis']) <= 5000):
            criteria.append('duration')
        
        return criteria

# Initialize service
apple_music_service = AppleMusicService()

@apple_music_bp.route('/health', methods=['GET'])
@security_headers
def health_check():
    """Health check endpoint for Apple Music integration"""
    return create_success_response({
        'service': 'Apple Music Integration',
        'status': 'operational',
        'configured': apple_music_service.is_configured(),
        'timestamp': datetime.utcnow().isoformat()
    })

@apple_music_bp.route('/search', methods=['POST'])
@security_headers
@auth_required
def apple_music_search_catalog():
    """Search Apple Music catalog"""
    if not apple_music_service.is_configured():
        return create_error_response(
            ErrorCode.SERVICE_UNAVAILABLE,
            "Apple Music integration is not configured"
        ), 503
    
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or not data.get('term'):
            return create_error_response(
                ErrorCode.INVALID_REQUEST,
                "Search term is required"
            ), 400
        
        term = sanitize_input(data['term'])
        types = data.get('types', ['songs'])
        limit = validate_positive_integer(data.get('limit', 25))
        offset = validate_positive_integer(data.get('offset', 0))
        language = data.get('language')
        
        # Validate types
        valid_types = ['songs', 'artists', 'albums', 'playlists']
        if not all(t in valid_types for t in types):
            return create_error_response(
                ErrorCode.INVALID_REQUEST,
                f"Invalid search types. Allowed: {valid_types}"
            ), 400
        
        results = apple_music_service.search_catalog(
            term=term,
            types=types,
            limit=min(limit, 50),
            offset=offset,
            language=language
        )
        
        return create_success_response(results)
        
    except Exception as e:
        logger.error(f"Apple Music search failed: {e}")
        return create_error_response(
            ErrorCode.EXTERNAL_SERVICE_ERROR,
            "Apple Music search failed"
        ), 502

@apple_music_bp.route('/songs/<song_id>', methods=['GET'])
@security_headers
@auth_required
def apple_music_get_song_details(song_id):
    """Get Apple Music song details"""
    if not apple_music_service.is_configured():
        return create_error_response(
            ErrorCode.SERVICE_UNAVAILABLE,
            "Apple Music integration is not configured"
        ), 503
    
    try:
        song_id = sanitize_input(song_id)
        user_token = request.headers.get('Music-User-Token')
        
        results = apple_music_service.get_song(song_id, user_token)
        return create_success_response(results)
        
    except Exception as e:
        logger.error(f"Failed to get Apple Music song details: {e}")
        return create_error_response(
            ErrorCode.EXTERNAL_SERVICE_ERROR,
            "Failed to get song details"
        ), 502

@apple_music_bp.route('/cross-platform-match', methods=['POST'])
@security_headers
@auth_required
def apple_music_cross_platform_match():
    """Match a track from another platform to Apple Music"""
    if not apple_music_service.is_configured():
        return create_error_response(
            ErrorCode.SERVICE_UNAVAILABLE,
            "Apple Music integration is not configured"
        ), 503
    
    try:
        data = request.get_json()
        
        if not data or not data.get('track'):
            return create_error_response(
                ErrorCode.INVALID_REQUEST,
                "Track data is required"
            ), 400
        
        track_data = data['track']
        
        # Validate track data has minimum required fields
        if not track_data.get('name'):
            return create_error_response(
                ErrorCode.INVALID_REQUEST,
                "Track name is required"
            ), 400
        
        results = apple_music_service.cross_platform_match(track_data)
        return create_success_response(results)
        
    except Exception as e:
        logger.error(f"Cross-platform matching failed: {e}")
        return create_error_response(
            ErrorCode.EXTERNAL_SERVICE_ERROR,
            "Cross-platform matching failed"
        ), 502

@apple_music_bp.route('/recommendations/<recommendation_id>', methods=['GET'])
@security_headers
@auth_required
def apple_music_get_recommendations(recommendation_id):
    """Get Apple Music recommendations"""
    if not apple_music_service.is_configured():
        return create_error_response(
            ErrorCode.SERVICE_UNAVAILABLE,
            "Apple Music integration is not configured"
        ), 503
    
    try:
        recommendation_id = sanitize_input(recommendation_id)
        limit = validate_positive_integer(request.args.get('limit', 25))
        user_token = request.headers.get('Music-User-Token')
        
        results = apple_music_service.get_recommendations(
            recommendation_id, 
            min(limit, 50), 
            user_token
        )
        return create_success_response(results)
        
    except Exception as e:
        logger.error(f"Failed to get Apple Music recommendations: {e}")
        return create_error_response(
            ErrorCode.EXTERNAL_SERVICE_ERROR,
            "Failed to get recommendations"
        ), 502

@apple_music_bp.route('/link-metadata', methods=['POST'])
@security_headers
@auth_required
def apple_music_link_metadata():
    """Link Apple Music metadata to a ChordMe song"""
    try:
        data = request.get_json()
        
        if not data or not data.get('song_id') or not data.get('apple_music_id'):
            return create_error_response(
                ErrorCode.INVALID_REQUEST,
                "Song ID and Apple Music ID are required"
            ), 400
        
        song_id = sanitize_input(data['song_id'])
        apple_music_id = sanitize_input(data['apple_music_id'])
        
        # Get the song
        song = Song.query.filter_by(id=song_id, author_id=g.user_id).first()
        if not song:
            return create_error_response(
                ErrorCode.RESOURCE_NOT_FOUND,
                "Song not found"
            ), 404
        
        # Get Apple Music metadata
        if apple_music_service.is_configured():
            try:
                apple_music_data = apple_music_service.get_song(apple_music_id)
                
                # Store metadata in song's metadata field
                if not song.metadata:
                    song.metadata = {}
                
                song.metadata['apple_music'] = {
                    'id': apple_music_id,
                    'name': apple_music_data.get('data', [{}])[0].get('attributes', {}).get('name'),
                    'artist': apple_music_data.get('data', [{}])[0].get('attributes', {}).get('artistName'),
                    'album': apple_music_data.get('data', [{}])[0].get('attributes', {}).get('albumName'),
                    'url': apple_music_data.get('data', [{}])[0].get('attributes', {}).get('url'),
                    'preview_url': apple_music_data.get('data', [{}])[0].get('attributes', {}).get('previews', [{}])[0].get('url'),
                    'linked_at': datetime.utcnow().isoformat()
                }
                
                db.session.commit()
                
                return create_success_response({
                    'message': 'Apple Music metadata linked successfully',
                    'song_id': song_id,
                    'apple_music_id': apple_music_id,
                    'metadata': song.metadata.get('apple_music')
                })
                
            except Exception as e:
                logger.error(f"Failed to fetch Apple Music metadata: {e}")
                return create_error_response(
                    ErrorCode.EXTERNAL_SERVICE_ERROR,
                    "Failed to fetch Apple Music metadata"
                ), 502
        else:
            return create_error_response(
                ErrorCode.SERVICE_UNAVAILABLE,
                "Apple Music integration is not configured"
            ), 503
            
    except Exception as e:
        logger.error(f"Failed to link Apple Music metadata: {e}")
        db.session.rollback()
        return create_error_response(
            ErrorCode.INTERNAL_ERROR,
            "Failed to link metadata"
        ), 500