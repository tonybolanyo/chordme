"""
YouTube Integration Routes
Handles YouTube video search, management, and synchronization endpoints
"""

from flask import request, jsonify, g
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from . import app, db
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
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)

# YouTube API configuration
YOUTUBE_API_KEY = os.environ.get('YOUTUBE_API_KEY')
YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3'

class YouTubeService:
    """Service class for YouTube API interactions"""
    
    @staticmethod
    def search_videos(query: str, max_results: int = 10, **kwargs) -> Dict[str, Any]:
        """Search for YouTube videos"""
        if not YOUTUBE_API_KEY:
            raise ValueError("YouTube API key not configured")
        
        params = {
            'part': 'snippet,contentDetails,statistics',
            'type': 'video',
            'key': YOUTUBE_API_KEY,
            'q': query,
            'maxResults': min(max_results, 50),  # Limit max results
        }
        
        # Add optional parameters
        for key in ['order', 'videoDuration', 'videoDefinition', 'regionCode', 'relevanceLanguage']:
            if key in kwargs and kwargs[key]:
                params[key] = kwargs[key]
        
        try:
            response = requests.get(f"{YOUTUBE_API_BASE_URL}/search", params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if 'error' in data:
                raise ValueError(f"YouTube API error: {data['error']['message']}")
            
            # Process and format results
            results = []
            for item in data.get('items', []):
                video_data = {
                    'videoId': item['id']['videoId'],
                    'title': item['snippet']['title'],
                    'description': item['snippet']['description'][:500],  # Truncate long descriptions
                    'channelTitle': item['snippet']['channelTitle'],
                    'thumbnails': item['snippet']['thumbnails'],
                    'publishedAt': item['snippet']['publishedAt'],
                    'duration': item.get('contentDetails', {}).get('duration', ''),
                    'viewCount': int(item.get('statistics', {}).get('viewCount', 0)),
                    'likeCount': int(item.get('statistics', {}).get('likeCount', 0)),
                }
                results.append(video_data)
            
            return {
                'videos': results,
                'total': len(results),
                'query': query,
            }
            
        except requests.RequestException as e:
            logger.error(f"YouTube API request failed: {e}")
            raise ValueError(f"YouTube API request failed: {str(e)}")
        except Exception as e:
            logger.error(f"YouTube search error: {e}")
            raise ValueError(f"YouTube search failed: {str(e)}")
    
    @staticmethod
    def get_video_details(video_id: str) -> Dict[str, Any]:
        """Get detailed information about a specific video"""
        if not YOUTUBE_API_KEY:
            raise ValueError("YouTube API key not configured")
        
        if not re.match(r'^[a-zA-Z0-9_-]+$', video_id):
            raise ValueError("Invalid video ID format")
        
        params = {
            'part': 'snippet,contentDetails,statistics',
            'id': video_id,
            'key': YOUTUBE_API_KEY,
        }
        
        try:
            response = requests.get(f"{YOUTUBE_API_BASE_URL}/videos", params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if 'error' in data:
                raise ValueError(f"YouTube API error: {data['error']['message']}")
            
            items = data.get('items', [])
            if not items:
                raise ValueError("Video not found")
            
            item = items[0]
            return {
                'videoId': video_id,
                'title': item['snippet']['title'],
                'channelTitle': item['snippet']['channelTitle'],
                'description': item['snippet']['description'],
                'thumbnails': item['snippet']['thumbnails'],
                'publishedAt': item['snippet']['publishedAt'],
                'duration': item['contentDetails']['duration'],
                'viewCount': int(item.get('statistics', {}).get('viewCount', 0)),
                'likeCount': int(item.get('statistics', {}).get('likeCount', 0)),
                'tags': item['snippet'].get('tags', []),
                'categoryId': item['snippet'].get('categoryId'),
                'defaultLanguage': item['snippet'].get('defaultLanguage'),
                'defaultAudioLanguage': item['snippet'].get('defaultAudioLanguage'),
            }
            
        except requests.RequestException as e:
            logger.error(f"YouTube API request failed: {e}")
            raise ValueError(f"YouTube API request failed: {str(e)}")
        except Exception as e:
            logger.error(f"YouTube video details error: {e}")
            raise ValueError(f"Failed to get video details: {str(e)}")


@app.route('/api/v1/youtube/search', methods=['POST'])
@security_headers
@rate_limit(max_requests=30, window_seconds=60)  # 30 calls per minute
@validate_request_size(max_content_length=1024)  # 1KB max
@auth_required
def search_youtube_videos():
    """
    Search for YouTube videos
    ---
    tags:
      - YouTube
    summary: Search YouTube videos
    description: Search for YouTube videos based on query and filters
    parameters:
      - in: body
        name: search_params
        required: true
        schema:
          type: object
          required:
            - query
          properties:
            query:
              type: string
              description: Search query
              example: "Wonderwall Oasis"
            maxResults:
              type: integer
              minimum: 1
              maximum: 25
              default: 10
              description: Maximum number of results
            order:
              type: string
              enum: ["date", "rating", "relevance", "title", "viewCount"]
              default: "relevance"
              description: Sort order
            videoDuration:
              type: string
              enum: ["any", "long", "medium", "short"]
              default: "any"
              description: Video duration filter
            videoDefinition:
              type: string
              enum: ["any", "high", "standard"]
              default: "any"
              description: Video quality filter
            regionCode:
              type: string
              description: Two-letter country code for regional results
            relevanceLanguage:
              type: string
              description: Language code for relevant results
    responses:
      200:
        description: Search results
        schema:
          type: object
          properties:
            videos:
              type: array
              items:
                type: object
                properties:
                  videoId:
                    type: string
                  title:
                    type: string
                  description:
                    type: string
                  channelTitle:
                    type: string
                  thumbnails:
                    type: object
                  publishedAt:
                    type: string
                  duration:
                    type: string
                  viewCount:
                    type: integer
                  likeCount:
                    type: integer
            total:
              type: integer
            query:
              type: string
      400:
        description: Invalid request
      401:
        description: Unauthorized
      429:
        description: Rate limit exceeded
      500:
        description: Server error
    """
    try:
        data = request.get_json()
        if not data:
            return create_error_response(
                ErrorCode.MISSING_REQUIRED_FIELD, 
                "Request body is required"
            ), 400
        
        # Validate required fields
        query = sanitize_input(data.get('query', '').strip())
        if not query:
            return create_error_response(
                ErrorCode.MISSING_REQUIRED_FIELD, 
                "Query is required"
            ), 400
        
        if len(query) > 200:
            return create_error_response(
                ErrorCode.INVALID_INPUT, 
                "Query too long (max 200 characters)"
            ), 400
        
        # Validate optional parameters
        max_results = data.get('maxResults', 10)
        if not validate_positive_integer(max_results) or max_results > 25:
            return create_error_response(
                ErrorCode.INVALID_INPUT, 
                "maxResults must be between 1 and 25"
            ), 400
        
        # Build search parameters
        search_params = {
            'order': data.get('order', 'relevance'),
            'videoDuration': data.get('videoDuration', 'any'),
            'videoDefinition': data.get('videoDefinition', 'any'),
        }
        
        # Add optional filters
        if 'regionCode' in data:
            region_code = sanitize_input(data['regionCode'])
            if len(region_code) == 2:
                search_params['regionCode'] = region_code
        
        if 'relevanceLanguage' in data:
            lang = sanitize_input(data['relevanceLanguage'])
            if len(lang) <= 5:
                search_params['relevanceLanguage'] = lang
        
        # Perform search
        results = YouTubeService.search_videos(query, max_results, **search_params)
        
        return create_success_response(results), 200
        
    except ValueError as e:
        logger.warning(f"YouTube search validation error: {e}")
        return create_error_response(
            ErrorCode.YOUTUBE_API_ERROR, 
            str(e)
        ), 400
    except Exception as e:
        logger.error(f"YouTube search error: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR, 
            "Search failed"
        ), 500


@app.route('/api/v1/youtube/video/<video_id>', methods=['GET'])
@security_headers
@rate_limit(max_requests=60, window_seconds=60)  # 60 calls per minute
@auth_required
def get_youtube_video_details(video_id):
    """
    Get YouTube video details
    ---
    tags:
      - YouTube
    summary: Get YouTube video details
    description: Get detailed information about a specific YouTube video
    parameters:
      - in: path
        name: video_id
        required: true
        type: string
        description: YouTube video ID
    responses:
      200:
        description: Video details
        schema:
          type: object
          properties:
            videoId:
              type: string
            title:
              type: string
            channelTitle:
              type: string
            description:
              type: string
            thumbnails:
              type: object
            publishedAt:
              type: string
            duration:
              type: string
            viewCount:
              type: integer
            likeCount:
              type: integer
            tags:
              type: array
              items:
                type: string
            categoryId:
              type: string
            defaultLanguage:
              type: string
            defaultAudioLanguage:
              type: string
      400:
        description: Invalid video ID
      401:
        description: Unauthorized
      404:
        description: Video not found
      429:
        description: Rate limit exceeded
      500:
        description: Server error
    """
    try:
        video_id = sanitize_input(video_id)
        if not video_id:
            return create_error_response(
                ErrorCode.INVALID_INPUT, 
                "Video ID is required"
            ), 400
        
        # Get video details
        video_details = YouTubeService.get_video_details(video_id)
        
        return create_success_response(video_details), 200
        
    except ValueError as e:
        if "not found" in str(e).lower():
            return create_error_response(
                ErrorCode.RESOURCE_NOT_FOUND, 
                "Video not found"
            ), 404
        else:
            logger.warning(f"YouTube video details validation error: {e}")
            return create_error_response(
                ErrorCode.YOUTUBE_API_ERROR, 
                str(e)
            ), 400
    except Exception as e:
        logger.error(f"YouTube video details error: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR, 
            "Failed to get video details"
        ), 500


@app.route('/api/v1/songs/<int:song_id>/youtube', methods=['POST'])
@security_headers
@rate_limit(max_requests=10, window_seconds=60)  # 10 calls per minute
@validate_request_size(max_content_length=2048)  # 2KB max
@auth_required
def link_youtube_video_to_song(song_id):
    """
    Link YouTube video to song
    ---
    tags:
      - YouTube
      - Songs
    summary: Link YouTube video to song
    description: Associate a YouTube video with a song for synchronized playback
    parameters:
      - in: path
        name: song_id
        required: true
        type: integer
        description: Song ID
      - in: body
        name: video_data
        required: true
        schema:
          type: object
          required:
            - videoId
          properties:
            videoId:
              type: string
              description: YouTube video ID
            title:
              type: string
              description: Video title (optional override)
            startTime:
              type: number
              minimum: 0
              description: Start time offset in seconds
            endTime:
              type: number
              minimum: 0
              description: End time offset in seconds
            syncEnabled:
              type: boolean
              default: false
              description: Enable chord synchronization
            chordMapping:
              type: array
              description: Chord timing mappings for synchronization
              items:
                type: object
                properties:
                  chordName:
                    type: string
                  startTime:
                    type: number
                  endTime:
                    type: number
                  barNumber:
                    type: integer
                  beatPosition:
                    type: number
    responses:
      200:
        description: Video linked successfully
      400:
        description: Invalid request
      401:
        description: Unauthorized
      403:
        description: Permission denied
      404:
        description: Song not found
      429:
        description: Rate limit exceeded
      500:
        description: Server error
    """
    try:
        data = request.get_json()
        if not data:
            return create_error_response(
                ErrorCode.MISSING_REQUIRED_FIELD, 
                "Request body is required"
            ), 400
        
        # Validate video ID
        video_id = sanitize_input(data.get('videoId', '').strip())
        if not video_id:
            return create_error_response(
                ErrorCode.MISSING_REQUIRED_FIELD, 
                "Video ID is required"
            ), 400
        
        if not re.match(r'^[a-zA-Z0-9_-]+$', video_id):
            return create_error_response(
                ErrorCode.INVALID_INPUT, 
                "Invalid video ID format"
            ), 400
        
        # Get and validate song
        song = Song.query.filter_by(id=song_id, user_id=g.current_user_id).first()
        if not song:
            return create_error_response(
                ErrorCode.RESOURCE_NOT_FOUND, 
                "Song not found"
            ), 404
        
        # Validate optional parameters
        start_time = data.get('startTime')
        end_time = data.get('endTime')
        
        if start_time is not None:
            if not isinstance(start_time, (int, float)) or start_time < 0:
                return create_error_response(
                    ErrorCode.INVALID_INPUT, 
                    "startTime must be a non-negative number"
                ), 400
        
        if end_time is not None:
            if not isinstance(end_time, (int, float)) or end_time < 0:
                return create_error_response(
                    ErrorCode.INVALID_INPUT, 
                    "endTime must be a non-negative number"
                ), 400
            
            if start_time is not None and end_time <= start_time:
                return create_error_response(
                    ErrorCode.INVALID_INPUT, 
                    "endTime must be greater than startTime"
                ), 400
        
        # Validate chord mapping if provided
        chord_mapping = data.get('chordMapping', [])
        if chord_mapping and not isinstance(chord_mapping, list):
            return create_error_response(
                ErrorCode.INVALID_INPUT, 
                "chordMapping must be an array"
            ), 400
        
        # Validate each chord mapping entry
        for i, mapping in enumerate(chord_mapping):
            if not isinstance(mapping, dict):
                return create_error_response(
                    ErrorCode.INVALID_INPUT, 
                    f"chordMapping[{i}] must be an object"
                ), 400
            
            required_fields = ['chordName', 'startTime', 'endTime']
            for field in required_fields:
                if field not in mapping:
                    return create_error_response(
                        ErrorCode.MISSING_REQUIRED_FIELD, 
                        f"chordMapping[{i}] missing required field: {field}"
                    ), 400
        
        # Try to get video details to validate it exists
        try:
            video_details = YouTubeService.get_video_details(video_id)
        except ValueError as e:
            return create_error_response(
                ErrorCode.YOUTUBE_API_ERROR, 
                f"Unable to validate video: {str(e)}"
            ), 400
        
        # Create or update YouTube video data for the song
        youtube_data = {
            'video_id': video_id,
            'video_title': data.get('title') or video_details.get('title'),
            'start_time': start_time,
            'end_time': end_time,
            'sync_enabled': data.get('syncEnabled', False),
            'chord_mapping': chord_mapping,
            'linked_at': datetime.utcnow().isoformat(),
            'video_details': video_details,
        }
        
        # Store YouTube data in song metadata (JSON field)
        if not song.metadata:
            song.metadata = {}
        
        song.metadata['youtube'] = youtube_data
        song.updated_at = datetime.utcnow()
        
        try:
            db.session.commit()
            
            response_data = {
                'message': 'YouTube video linked successfully',
                'videoId': video_id,
                'songId': song_id,
                'linkedAt': youtube_data['linked_at'],
            }
            
            return create_success_response(response_data), 200
            
        except IntegrityError as e:
            db.session.rollback()
            logger.error(f"Database error linking YouTube video: {e}")
            return create_error_response(
                ErrorCode.DATABASE_ERROR, 
                "Failed to link video"
            ), 500
        
    except Exception as e:
        logger.error(f"YouTube video linking error: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR, 
            "Failed to link video"
        ), 500


@app.route('/api/v1/songs/<int:song_id>/youtube', methods=['GET'])
@security_headers
@rate_limit(max_requests=60, window_seconds=60)  # 60 calls per minute
@auth_required
def get_song_youtube_data(song_id):
    """
    Get YouTube data for a song
    ---
    tags:
      - YouTube
      - Songs
    summary: Get YouTube data for song
    description: Get YouTube video information linked to a song
    parameters:
      - in: path
        name: song_id
        required: true
        type: integer
        description: Song ID
    responses:
      200:
        description: YouTube data for the song
        schema:
          type: object
          properties:
            videoId:
              type: string
            videoTitle:
              type: string
            startTime:
              type: number
            endTime:
              type: number
            syncEnabled:
              type: boolean
            chordMapping:
              type: array
            linkedAt:
              type: string
            videoDetails:
              type: object
      404:
        description: Song not found or no YouTube data
      401:
        description: Unauthorized
      429:
        description: Rate limit exceeded
      500:
        description: Server error
    """
    try:
        # Get and validate song
        song = Song.query.filter_by(id=song_id, user_id=g.current_user_id).first()
        if not song:
            return create_error_response(
                ErrorCode.RESOURCE_NOT_FOUND, 
                "Song not found"
            ), 404
        
        # Check if song has YouTube data
        youtube_data = song.metadata.get('youtube') if song.metadata else None
        if not youtube_data:
            return create_error_response(
                ErrorCode.RESOURCE_NOT_FOUND, 
                "No YouTube video linked to this song"
            ), 404
        
        # Format response data
        response_data = {
            'videoId': youtube_data.get('video_id'),
            'videoTitle': youtube_data.get('video_title'),
            'startTime': youtube_data.get('start_time'),
            'endTime': youtube_data.get('end_time'),
            'syncEnabled': youtube_data.get('sync_enabled', False),
            'chordMapping': youtube_data.get('chord_mapping', []),
            'linkedAt': youtube_data.get('linked_at'),
            'videoDetails': youtube_data.get('video_details', {}),
        }
        
        return create_success_response(response_data), 200
        
    except Exception as e:
        logger.error(f"Error getting song YouTube data: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR, 
            "Failed to get YouTube data"
        ), 500


@app.route('/api/v1/songs/<int:song_id>/youtube', methods=['DELETE'])
@security_headers
@rate_limit(max_requests=10, window_seconds=60)  # 10 calls per minute
@auth_required
def unlink_youtube_video_from_song(song_id):
    """
    Unlink YouTube video from song
    ---
    tags:
      - YouTube
      - Songs
    summary: Unlink YouTube video from song
    description: Remove YouTube video association from a song
    parameters:
      - in: path
        name: song_id
        required: true
        type: integer
        description: Song ID
    responses:
      200:
        description: Video unlinked successfully
      404:
        description: Song not found or no YouTube data
      401:
        description: Unauthorized
      429:
        description: Rate limit exceeded
      500:
        description: Server error
    """
    try:
        # Get and validate song
        song = Song.query.filter_by(id=song_id, user_id=g.current_user_id).first()
        if not song:
            return create_error_response(
                ErrorCode.RESOURCE_NOT_FOUND, 
                "Song not found"
            ), 404
        
        # Check if song has YouTube data
        if not song.metadata or 'youtube' not in song.metadata:
            return create_error_response(
                ErrorCode.RESOURCE_NOT_FOUND, 
                "No YouTube video linked to this song"
            ), 404
        
        # Remove YouTube data
        del song.metadata['youtube']
        song.updated_at = datetime.utcnow()
        
        try:
            db.session.commit()
            
            response_data = {
                'message': 'YouTube video unlinked successfully',
                'songId': song_id,
            }
            
            return create_success_response(response_data), 200
            
        except IntegrityError as e:
            db.session.rollback()
            logger.error(f"Database error unlinking YouTube video: {e}")
            return create_error_response(
                ErrorCode.DATABASE_ERROR, 
                "Failed to unlink video"
            ), 500
        
    except Exception as e:
        logger.error(f"YouTube video unlinking error: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR, 
            "Failed to unlink video"
        ), 500


@app.route('/api/v1/youtube/suggest/<int:song_id>', methods=['GET'])
@security_headers
@rate_limit(max_requests=20, window_seconds=60)  # 20 calls per minute
@auth_required
def suggest_youtube_videos_for_song(song_id):
    """
    Suggest YouTube videos for a song
    ---
    tags:
      - YouTube
      - Songs
    summary: Suggest YouTube videos for song
    description: Get suggested YouTube videos based on song title and artist
    parameters:
      - in: path
        name: song_id
        required: true
        type: integer
        description: Song ID
      - in: query
        name: maxResults
        type: integer
        minimum: 1
        maximum: 10
        default: 5
        description: Maximum number of suggestions
    responses:
      200:
        description: Suggested videos
        schema:
          type: object
          properties:
            suggestions:
              type: array
              items:
                type: object
            songId:
              type: integer
            query:
              type: string
      404:
        description: Song not found
      401:
        description: Unauthorized
      429:
        description: Rate limit exceeded
      500:
        description: Server error
    """
    try:
        # Get and validate song
        song = Song.query.filter_by(id=song_id, user_id=g.current_user_id).first()
        if not song:
            return create_error_response(
                ErrorCode.RESOURCE_NOT_FOUND, 
                "Song not found"
            ), 404
        
        max_results = request.args.get('maxResults', 5, type=int)
        if max_results < 1 or max_results > 10:
            max_results = 5
        
        # Build search query from song title and metadata
        query_parts = []
        
        # Use song title
        if song.title:
            query_parts.append(song.title)
        
        # Try to extract artist from metadata or title
        artist = None
        if song.metadata and 'artist' in song.metadata:
            artist = song.metadata['artist']
        elif song.content:
            # Try to extract artist from ChordPro content
            artist_match = re.search(r'\{artist:\s*([^}]+)\}', song.content, re.IGNORECASE)
            if artist_match:
                artist = artist_match.group(1).strip()
        
        if artist:
            query_parts.append(artist)
        
        # Add keywords to help find the original song
        query_parts.append('official')
        
        query = ' '.join(query_parts)
        
        if not query.strip():
            return create_error_response(
                ErrorCode.INVALID_INPUT, 
                "Unable to generate search query from song data"
            ), 400
        
        # Search for videos
        try:
            results = YouTubeService.search_videos(
                query, 
                max_results, 
                order='relevance',
                videoDuration='any'
            )
            
            response_data = {
                'suggestions': results['videos'],
                'songId': song_id,
                'query': query,
                'total': len(results['videos']),
            }
            
            return create_success_response(response_data), 200
            
        except ValueError as e:
            logger.warning(f"YouTube suggestion search error: {e}")
            return create_error_response(
                ErrorCode.YOUTUBE_API_ERROR, 
                str(e)
            ), 400
        
    except Exception as e:
        logger.error(f"YouTube suggestion error: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR, 
            "Failed to get suggestions"
        ), 500