"""
Spotify Integration Routes
Handles Spotify Web API integration endpoints for music metadata enrichment,
playlist synchronization, and music discovery features.
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
import base64
import secrets
import json

logger = logging.getLogger(__name__)

# Create Spotify blueprint
spotify_bp = Blueprint('spotify', __name__, url_prefix='/api/v1/spotify')

# Spotify API configuration
SPOTIFY_CLIENT_ID = os.environ.get('SPOTIFY_CLIENT_ID')
SPOTIFY_CLIENT_SECRET = os.environ.get('SPOTIFY_CLIENT_SECRET')
SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1'
SPOTIFY_ACCOUNTS_BASE_URL = 'https://accounts.spotify.com'

# Spotify API configuration
SPOTIFY_CLIENT_ID = os.environ.get('SPOTIFY_CLIENT_ID')
SPOTIFY_CLIENT_SECRET = os.environ.get('SPOTIFY_CLIENT_SECRET')
SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1'
SPOTIFY_ACCOUNTS_BASE_URL = 'https://accounts.spotify.com'

class SpotifyService:
    """Service class for Spotify Web API interactions"""
    
    @staticmethod
    def get_access_token() -> Optional[str]:
        """Get application access token using client credentials flow"""
        if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
            raise ValueError("Spotify API credentials not configured")
        
        auth_header = base64.b64encode(
            f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}".encode()
        ).decode()
        
        try:
            response = requests.post(
                f"{SPOTIFY_ACCOUNTS_BASE_URL}/api/token",
                headers={
                    'Authorization': f'Basic {auth_header}',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data={'grant_type': 'client_credentials'},
                timeout=10
            )
            
            if response.status_code == 200:
                token_data = response.json()
                return token_data.get('access_token')
            else:
                logger.error(f"Spotify token request failed: {response.status_code}")
                return None
                
        except requests.RequestException as e:
            logger.error(f"Spotify token request error: {e}")
            return None
    
    @staticmethod
    def search_tracks(query: str, limit: int = 20, offset: int = 0, market: str = 'US') -> Dict[str, Any]:
        """Search for tracks using Spotify Web API"""
        access_token = SpotifyService.get_access_token()
        if not access_token:
            raise ValueError("Unable to get Spotify access token")
        
        params = {
            'q': query,
            'type': 'track',
            'limit': min(limit, 50),  # Spotify limit
            'offset': offset,
            'market': market
        }
        
        try:
            response = requests.get(
                f"{SPOTIFY_API_BASE_URL}/search",
                headers={'Authorization': f'Bearer {access_token}'},
                params=params,
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 429:
                # Rate limited
                retry_after = response.headers.get('Retry-After', '1')
                raise ValueError(f"Rate limited. Retry after {retry_after} seconds")
            else:
                logger.error(f"Spotify search failed: {response.status_code}")
                raise ValueError("Search request failed")
                
        except requests.RequestException as e:
            logger.error(f"Spotify search error: {e}")
            raise ValueError("Network error during search")
    
    @staticmethod
    def get_track(track_id: str, market: str = 'US') -> Dict[str, Any]:
        """Get detailed track information"""
        access_token = SpotifyService.get_access_token()
        if not access_token:
            raise ValueError("Unable to get Spotify access token")
        
        params = {'market': market}
        
        try:
            response = requests.get(
                f"{SPOTIFY_API_BASE_URL}/tracks/{track_id}",
                headers={'Authorization': f'Bearer {access_token}'},
                params=params,
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                raise ValueError("Track not found")
            else:
                logger.error(f"Spotify track request failed: {response.status_code}")
                raise ValueError("Track request failed")
                
        except requests.RequestException as e:
            logger.error(f"Spotify track request error: {e}")
            raise ValueError("Network error during track request")
    
    @staticmethod
    def get_audio_features(track_id: str) -> Dict[str, Any]:
        """Get audio features for a track"""
        access_token = SpotifyService.get_access_token()
        if not access_token:
            raise ValueError("Unable to get Spotify access token")
        
        try:
            response = requests.get(
                f"{SPOTIFY_API_BASE_URL}/audio-features/{track_id}",
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                raise ValueError("Audio features not found")
            else:
                logger.error(f"Spotify audio features request failed: {response.status_code}")
                raise ValueError("Audio features request failed")
                
        except requests.RequestException as e:
            logger.error(f"Spotify audio features error: {e}")
            raise ValueError("Network error during audio features request")
    
    @staticmethod
    def get_recommendations(
        seed_tracks: List[str] = None,
        seed_artists: List[str] = None,
        seed_genres: List[str] = None,
        limit: int = 20,
        **audio_features_targets
    ) -> Dict[str, Any]:
        """Get recommendations based on seed data and audio features"""
        access_token = SpotifyService.get_access_token()
        if not access_token:
            raise ValueError("Unable to get Spotify access token")
        
        params = {'limit': min(limit, 100)}  # Spotify limit
        
        # Add seed parameters
        if seed_tracks:
            params['seed_tracks'] = ','.join(seed_tracks[:5])  # Max 5 seeds
        if seed_artists:
            params['seed_artists'] = ','.join(seed_artists[:5])
        if seed_genres:
            params['seed_genres'] = ','.join(seed_genres[:5])
        
        # Add audio feature targets
        valid_features = [
            'acousticness', 'danceability', 'energy', 'instrumentalness',
            'key', 'liveness', 'loudness', 'mode', 'popularity',
            'speechiness', 'tempo', 'time_signature', 'valence'
        ]
        
        for feature, value in audio_features_targets.items():
            if feature.replace('target_', '') in valid_features:
                params[feature] = value
        
        try:
            response = requests.get(
                f"{SPOTIFY_API_BASE_URL}/recommendations",
                headers={'Authorization': f'Bearer {access_token}'},
                params=params,
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Spotify recommendations failed: {response.status_code}")
                raise ValueError("Recommendations request failed")
                
        except requests.RequestException as e:
            logger.error(f"Spotify recommendations error: {e}")
            raise ValueError("Network error during recommendations request")

# API Routes

@spotify_bp.route('/search', methods=['POST'])
@auth_required
def spotify_search():
    """
    Search for tracks on Spotify
    ---
    tags:
      - Spotify Integration
    security:
      - Bearer: []
    parameters:
      - in: body
        name: search_params
        required: true
        schema:
          type: object
          properties:
            query:
              type: string
              description: Search query
              example: "Wonderwall Oasis"
            limit:
              type: integer
              minimum: 1
              maximum: 50
              default: 20
              description: Number of results to return
            offset:
              type: integer
              minimum: 0
              default: 0
              description: Offset for pagination
            market:
              type: string
              example: "US"
              description: Market code for track availability
          required:
            - query
    responses:
      200:
        description: Search results
        schema:
          type: object
          properties:
            status:
              type: string
              example: "success"
            data:
              type: object
              properties:
                tracks:
                  type: object
                  properties:
                    items:
                      type: array
                      items:
                        type: object
                        properties:
                          id:
                            type: string
                          name:
                            type: string
                          artists:
                            type: array
                            items:
                              type: object
                          album:
                            type: object
                          duration_ms:
                            type: integer
                          popularity:
                            type: integer
                    total:
                      type: integer
                    limit:
                      type: integer
                    offset:
                      type: integer
      400:
        description: Invalid request
        schema:
          $ref: '#/definitions/ValidationError'
      401:
        description: Unauthorized
        schema:
          $ref: '#/definitions/AuthenticationError'
      429:
        description: Rate limited
      500:
        description: Server error
        schema:
          $ref: '#/definitions/ServerError'
    """
    try:
        data = request.get_json()
        if not data:
            return create_error_response(
                ErrorCode.MISSING_REQUIRED_FIELD,
                "Request body is required",
                400
            )
        
        query = sanitize_input(data.get('query', '').strip())
        if not query:
            return create_error_response(
                ErrorCode.MISSING_REQUIRED_FIELD,
                "Query parameter is required",
                400
            )
        
        limit = data.get('limit', 20)
        if not validate_positive_integer(limit, max_value=50):
            return create_error_response(
                ErrorCode.INVALID_PARAMETER,
                "Limit must be between 1 and 50",
                400
            )
        
        offset = data.get('offset', 0)
        if not validate_positive_integer(offset, min_value=0):
            return create_error_response(
                ErrorCode.INVALID_PARAMETER,
                "Offset must be non-negative",
                400
            )
        
        market = sanitize_input(data.get('market', 'US'))
        
        # Perform search
        search_results = SpotifyService.search_tracks(
            query=query,
            limit=limit,
            offset=offset,
            market=market
        )
        
        return create_success_response(
            "Search completed successfully",
            search_results
        )
        
    except ValueError as e:
        logger.warning(f"Spotify search validation error: {e}")
        return create_error_response(
            ErrorCode.INVALID_PARAMETER,
            str(e),
            400
        )
    except Exception as e:
        logger.error(f"Spotify search error: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Search failed. Please try again.",
            500
        )

@spotify_bp.route('/track/<track_id>', methods=['GET'])
@auth_required
def get_spotify_track_details(track_id):
    """
    Get detailed information about a Spotify track
    ---
    tags:
      - Spotify Integration
    security:
      - Bearer: []
    parameters:
      - in: path
        name: track_id
        type: string
        required: true
        description: Spotify track ID
      - in: query
        name: market
        type: string
        default: "US"
        description: Market code for track availability
    responses:
      200:
        description: Track details
        schema:
          type: object
          properties:
            status:
              type: string
              example: "success"
            data:
              type: object
              properties:
                id:
                  type: string
                name:
                  type: string
                artists:
                  type: array
                album:
                  type: object
                duration_ms:
                  type: integer
                popularity:
                  type: integer
                preview_url:
                  type: string
                external_urls:
                  type: object
      400:
        description: Invalid track ID
      404:
        description: Track not found
      500:
        description: Server error
    """
    try:
        # Validate track ID format (Spotify IDs are 22 characters)
        if not track_id or len(track_id) != 22:
            return create_error_response(
                ErrorCode.INVALID_PARAMETER,
                "Invalid track ID format",
                400
            )
        
        market = sanitize_input(request.args.get('market', 'US'))
        
        # Get track details
        track_data = SpotifyService.get_track(track_id, market)
        
        return create_success_response(
            "Track retrieved successfully",
            track_data
        )
        
    except ValueError as e:
        if "not found" in str(e):
            return create_error_response(
                ErrorCode.RESOURCE_NOT_FOUND,
                "Track not found",
                404
            )
        else:
            return create_error_response(
                ErrorCode.INVALID_PARAMETER,
                str(e),
                400
            )
    except Exception as e:
        logger.error(f"Get Spotify track error: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to retrieve track. Please try again.",
            500
        )

@spotify_bp.route('/audio-features/<track_id>', methods=['GET'])
@auth_required
def get_spotify_audio_features_endpoint(track_id):
    """
    Get audio features for a Spotify track
    ---
    tags:
      - Spotify Integration
    security:
      - Bearer: []
    parameters:
      - in: path
        name: track_id
        type: string
        required: true
        description: Spotify track ID
    responses:
      200:
        description: Audio features
        schema:
          type: object
          properties:
            status:
              type: string
              example: "success"
            data:
              type: object
              properties:
                id:
                  type: string
                danceability:
                  type: number
                energy:
                  type: number
                key:
                  type: integer
                loudness:
                  type: number
                mode:
                  type: integer
                speechiness:
                  type: number
                acousticness:
                  type: number
                instrumentalness:
                  type: number
                liveness:
                  type: number
                valence:
                  type: number
                tempo:
                  type: number
                time_signature:
                  type: integer
      400:
        description: Invalid track ID
      404:
        description: Audio features not found
      500:
        description: Server error
    """
    try:
        # Validate track ID format
        if not track_id or len(track_id) != 22:
            return create_error_response(
                ErrorCode.INVALID_PARAMETER,
                "Invalid track ID format",
                400
            )
        
        # Get audio features
        audio_features = SpotifyService.get_audio_features(track_id)
        
        return create_success_response(
            "Audio features retrieved successfully",
            audio_features
        )
        
    except ValueError as e:
        if "not found" in str(e):
            return create_error_response(
                ErrorCode.RESOURCE_NOT_FOUND,
                "Audio features not found",
                404
            )
        else:
            return create_error_response(
                ErrorCode.INVALID_PARAMETER,
                str(e),
                400
            )
    except Exception as e:
        logger.error(f"Get Spotify audio features error: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to retrieve audio features. Please try again.",
            500
        )

@spotify_bp.route('/recommendations', methods=['POST'])
@auth_required
def get_spotify_recommendations_endpoint():
    """
    Get track recommendations from Spotify
    ---
    tags:
      - Spotify Integration
    security:
      - Bearer: []
    parameters:
      - in: body
        name: recommendation_params
        required: true
        schema:
          type: object
          properties:
            seed_tracks:
              type: array
              items:
                type: string
              maxItems: 5
              description: Track IDs for seeding recommendations
            seed_artists:
              type: array
              items:
                type: string
              maxItems: 5
              description: Artist IDs for seeding recommendations
            seed_genres:
              type: array
              items:
                type: string
              maxItems: 5
              description: Genres for seeding recommendations
            limit:
              type: integer
              minimum: 1
              maximum: 100
              default: 20
              description: Number of recommendations to return
            target_acousticness:
              type: number
              minimum: 0
              maximum: 1
            target_danceability:
              type: number
              minimum: 0
              maximum: 1
            target_energy:
              type: number
              minimum: 0
              maximum: 1
            target_tempo:
              type: number
              minimum: 0
            target_valence:
              type: number
              minimum: 0
              maximum: 1
    responses:
      200:
        description: Recommendations
        schema:
          type: object
          properties:
            status:
              type: string
              example: "success"
            data:
              type: object
              properties:
                tracks:
                  type: array
                  items:
                    type: object
                seeds:
                  type: array
                  items:
                    type: object
      400:
        description: Invalid request
      500:
        description: Server error
    """
    try:
        data = request.get_json()
        if not data:
            return create_error_response(
                ErrorCode.MISSING_REQUIRED_FIELD,
                "Request body is required",
                400
            )
        
        # Extract and validate parameters
        seed_tracks = data.get('seed_tracks', [])
        seed_artists = data.get('seed_artists', [])
        seed_genres = data.get('seed_genres', [])
        
        # Validate that at least one seed is provided
        if not any([seed_tracks, seed_artists, seed_genres]):
            return create_error_response(
                ErrorCode.MISSING_REQUIRED_FIELD,
                "At least one seed (tracks, artists, or genres) is required",
                400
            )
        
        # Validate seed limits (max 5 total across all types)
        total_seeds = len(seed_tracks) + len(seed_artists) + len(seed_genres)
        if total_seeds > 5:
            return create_error_response(
                ErrorCode.INVALID_PARAMETER,
                "Maximum 5 seeds allowed across all types",
                400
            )
        
        limit = data.get('limit', 20)
        if not validate_positive_integer(limit, max_value=100):
            return create_error_response(
                ErrorCode.INVALID_PARAMETER,
                "Limit must be between 1 and 100",
                400
            )
        
        # Extract audio feature targets
        audio_features = {}
        valid_targets = [
            'target_acousticness', 'target_danceability', 'target_energy',
            'target_instrumentalness', 'target_key', 'target_liveness',
            'target_loudness', 'target_mode', 'target_popularity',
            'target_speechiness', 'target_tempo', 'target_time_signature',
            'target_valence'
        ]
        
        for target in valid_targets:
            if target in data:
                audio_features[target] = data[target]
        
        # Get recommendations
        recommendations = SpotifyService.get_recommendations(
            seed_tracks=seed_tracks,
            seed_artists=seed_artists,
            seed_genres=seed_genres,
            limit=limit,
            **audio_features
        )
        
        return create_success_response(
            "Recommendations retrieved successfully",
            recommendations
        )
        
    except ValueError as e:
        logger.warning(f"Spotify recommendations validation error: {e}")
        return create_error_response(
            ErrorCode.INVALID_PARAMETER,
            str(e),
            400
        )
    except Exception as e:
        logger.error(f"Spotify recommendations error: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to get recommendations. Please try again.",
            500
        )


# Song metadata linking route (separate from spotify blueprint)
from . import app  # Import app here to avoid circular import

@app.route('/api/v1/songs/<int:song_id>/spotify-metadata', methods=['POST'])
@auth_required
def link_spotify_metadata_endpoint(song_id):
    """
    Link Spotify metadata to a song
    ---
    tags:
      - Spotify Integration
    security:
      - Bearer: []
    parameters:
      - in: path
        name: song_id
        type: integer
        required: true
        description: Song ID
      - in: body
        name: metadata
        required: true
        schema:
          type: object
          properties:
            spotify_track_id:
              type: string
              description: Spotify track ID
            auto_sync:
              type: boolean
              default: false
              description: Enable automatic metadata synchronization
          required:
            - spotify_track_id
    responses:
      200:
        description: Metadata linked successfully
      400:
        description: Invalid request
      404:
        description: Song not found
      500:
        description: Server error
    """
    try:
        # Check if song exists and user has permission
        song = Song.query.filter_by(id=song_id).first()
        if not song:
            return create_error_response(
                ErrorCode.RESOURCE_NOT_FOUND,
                "Song not found",
                404
            )
        
        # Check if user owns the song or has edit permission
        if song.author_id != g.user_id:
            # TODO: Check shared permissions when implemented
            return create_error_response(
                ErrorCode.ACCESS_DENIED,
                "You don't have permission to edit this song",
                403
            )
        
        data = request.get_json()
        if not data:
            return create_error_response(
                ErrorCode.MISSING_REQUIRED_FIELD,
                "Request body is required",
                400
            )
        
        spotify_track_id = data.get('spotify_track_id', '').strip()
        if not spotify_track_id or len(spotify_track_id) != 22:
            return create_error_response(
                ErrorCode.INVALID_PARAMETER,
                "Valid Spotify track ID is required",
                400
            )
        
        auto_sync = data.get('auto_sync', False)
        
        # Get track details to validate and store metadata
        try:
            track_data = SpotifyService.get_track(spotify_track_id)
            audio_features = SpotifyService.get_audio_features(spotify_track_id)
        except Exception as e:
            return create_error_response(
                ErrorCode.EXTERNAL_SERVICE_ERROR,
                f"Failed to retrieve Spotify metadata: {str(e)}",
                400
            )
        
        # Store metadata (extend song model or create metadata table as needed)
        # For now, we'll store it in the song's content as a comment
        metadata_comment = f"""
{{comment: Spotify Metadata}}
{{spotify_id: {spotify_track_id}}}
{{spotify_name: {track_data.get('name', '')}}}
{{spotify_artist: {', '.join([artist['name'] for artist in track_data.get('artists', [])])}}}
{{spotify_album: {track_data.get('album', {}).get('name', '')}}}
{{spotify_tempo: {audio_features.get('tempo', '')}}}
{{spotify_key: {audio_features.get('key', '')}}}
{{spotify_energy: {audio_features.get('energy', '')}}}
{{spotify_danceability: {audio_features.get('danceability', '')}}}
"""
        
        # Update song with metadata (basic implementation)
        if not song.content.startswith('{comment: Spotify Metadata}'):
            song.content = metadata_comment + '\n' + song.content
            song.updated_at = datetime.utcnow()
            db.session.commit()
        
        return create_success_response(
            "Spotify metadata linked successfully",
            {
                "spotify_track_id": spotify_track_id,
                "track_name": track_data.get('name'),
                "artist_name": ', '.join([artist['name'] for artist in track_data.get('artists', [])]),
                "auto_sync": auto_sync
            }
        )
        
    except Exception as e:
        logger.error(f"Link Spotify metadata error: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to link metadata. Please try again.",
            500
        )