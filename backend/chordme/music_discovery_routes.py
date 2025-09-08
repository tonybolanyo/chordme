"""
Music Discovery API Routes

Provides REST API endpoints for music discovery and recommendation features.
Extends the analytics system with intelligent discovery capabilities.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_cors import cross_origin
import logging
from datetime import datetime, UTC
from typing import Dict, Any, List

from .models import db, User
from .music_discovery_service import MusicDiscoveryService
from .utils import auth_required
from .rate_limiter import rate_limit

logger = logging.getLogger(__name__)

# Create blueprint - extend analytics with discovery endpoints
discovery_bp = Blueprint('discovery', __name__, url_prefix='/api/v1/analytics/discovery')


def get_current_user_id():
    """Get the current user ID from Flask's g object."""
    from flask import g
    return getattr(g, 'current_user_id', None)


@discovery_bp.route('/recommendations', methods=['GET'])
@cross_origin()
@auth_required
@rate_limit(max_requests=30, window_seconds=60)
def get_personalized_recommendations():
    """
    Get personalized song recommendations based on user activity and preferences.
    
    Privacy: Uses only user's own activity data and anonymous similarity patterns.
    ---
    tags:
      - Music Discovery
    parameters:
      - name: limit
        in: query
        type: integer
        default: 20
        description: Maximum number of recommendations to return (max 50)
    responses:
      200:
        description: Personalized recommendations retrieved successfully
        schema:
          type: object
          properties:
            status:
              type: string
              example: success
            data:
              type: object
              properties:
                user_id:
                  type: integer
                recommendations:
                  type: array
                  items:
                    type: object
                    properties:
                      song_id:
                        type: integer
                      title:
                        type: string
                      artist:
                        type: string
                      genre:
                        type: string
                      relevance_score:
                        type: number
                      explanation:
                        type: string
                      recommendation_type:
                        type: string
                recommendation_sources:
                  type: object
                privacy_notice:
                  type: object
                generated_at:
                  type: string
      403:
        description: Access denied
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Rate limit exceeded
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Server error
        schema:
          $ref: '#/definitions/Error'
    security:
      - Bearer: []
    """
    try:
        user_id = get_current_user_id()
        limit = min(int(request.args.get('limit', 20)), 50)  # Cap at 50
        
        recommendations = MusicDiscoveryService.get_personalized_recommendations(
            user_id, limit=limit
        )
        
        return jsonify({
            'status': 'success',
            'data': recommendations
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting personalized recommendations for user {get_current_user_id()}: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to generate personalized recommendations'
        }), 500


@discovery_bp.route('/similar/<int:song_id>', methods=['GET'])
@cross_origin()
@auth_required
@rate_limit(max_requests=30, window_seconds=60)
def get_similar_songs(song_id: int):
    """
    Find songs similar to the specified song using audio features.
    
    Privacy: Only analyzes publicly available song metadata.
    ---
    tags:
      - Music Discovery
    parameters:
      - name: song_id
        in: path
        type: integer
        required: true
        description: ID of the reference song
      - name: limit
        in: query
        type: integer
        default: 10
        description: Maximum number of similar songs to return (max 30)
    responses:
      200:
        description: Similar songs found successfully
        schema:
          type: object
          properties:
            status:
              type: string
              example: success
            data:
              type: object
              properties:
                reference_song:
                  type: object
                similar_songs:
                  type: array
                  items:
                    type: object
                    properties:
                      song_id:
                        type: integer
                      title:
                        type: string
                      artist:
                        type: string
                      similarity_score:
                        type: number
                      similarity_explanation:
                        type: string
                similarity_factors:
                  type: array
                  items:
                    type: string
                generated_at:
                  type: string
      403:
        description: Access denied or song not accessible
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Song not found
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Rate limit exceeded
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Server error
        schema:
          $ref: '#/definitions/Error'
    security:
      - Bearer: []
    """
    try:
        user_id = get_current_user_id()
        limit = min(int(request.args.get('limit', 10)), 30)  # Cap at 30
        
        similar_songs = MusicDiscoveryService.get_similar_songs(
            song_id, user_id, limit=limit
        )
        
        return jsonify({
            'status': 'success',
            'data': similar_songs
        }), 200
        
    except PermissionError as e:
        return jsonify({
            'status': 'error',
            'message': 'You do not have access to this song'
        }), 403
        
    except Exception as e:
        logger.error(f"Error finding similar songs for song {song_id}: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to find similar songs'
        }), 500


@discovery_bp.route('/artists/<artist>/explore', methods=['GET'])
@cross_origin()
@auth_required
@rate_limit(max_requests=30, window_seconds=60)
def explore_artist(artist: str):
    """
    Explore songs by a specific artist with discovery insights.
    
    Privacy: Only shows songs accessible to the user.
    ---
    tags:
      - Music Discovery
    parameters:
      - name: artist
        in: path
        type: string
        required: true
        description: Name of the artist to explore
      - name: limit
        in: query
        type: integer
        default: 20
        description: Maximum number of songs to return (max 50)
    responses:
      200:
        description: Artist exploration data retrieved successfully
        schema:
          type: object
          properties:
            status:
              type: string
              example: success
            data:
              type: object
              properties:
                artist:
                  type: string
                total_songs:
                  type: integer
                songs:
                  type: array
                  items:
                    $ref: '#/definitions/Song'
                artist_characteristics:
                  type: object
                  properties:
                    primary_genres:
                      type: object
                    common_keys:
                      type: object
                    difficulty_levels:
                      type: object
                related_artists:
                  type: array
                  items:
                    type: string
                generated_at:
                  type: string
      400:
        description: Invalid artist name
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Rate limit exceeded
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Server error
        schema:
          $ref: '#/definitions/Error'
    security:
      - Bearer: []
    """
    try:
        user_id = get_current_user_id()
        limit = min(int(request.args.get('limit', 20)), 50)  # Cap at 50
        
        if not artist or len(artist.strip()) == 0:
            return jsonify({
                'status': 'error',
                'message': 'Artist name is required'
            }), 400
        
        exploration_data = MusicDiscoveryService.get_artist_exploration(
            artist, user_id, limit=limit
        )
        
        return jsonify({
            'status': 'success',
            'data': exploration_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error exploring artist {artist}: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to explore artist'
        }), 500


@discovery_bp.route('/genres/<genre>/explore', methods=['GET'])
@cross_origin()
@auth_required
@rate_limit(max_requests=30, window_seconds=60)
def explore_genre(genre: str):
    """
    Explore songs within a specific genre.
    
    Privacy: Only shows songs accessible to the user.
    ---
    tags:
      - Music Discovery
    parameters:
      - name: genre
        in: path
        type: string
        required: true
        description: Genre to explore
      - name: limit
        in: query
        type: integer
        default: 20
        description: Maximum number of songs to return (max 50)
    responses:
      200:
        description: Genre exploration data retrieved successfully
        schema:
          type: object
          properties:
            status:
              type: string
              example: success
            data:
              type: object
              properties:
                genre:
                  type: string
                total_songs:
                  type: integer
                songs:
                  type: array
                  items:
                    $ref: '#/definitions/Song'
                genre_characteristics:
                  type: object
                  properties:
                    popular_artists:
                      type: object
                    common_keys:
                      type: object
                    average_tempo:
                      type: number
                    difficulty_distribution:
                      type: object
                generated_at:
                  type: string
      400:
        description: Invalid genre name
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Rate limit exceeded
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Server error
        schema:
          $ref: '#/definitions/Error'
    security:
      - Bearer: []
    """
    try:
        user_id = get_current_user_id()
        limit = min(int(request.args.get('limit', 20)), 50)  # Cap at 50
        
        if not genre or len(genre.strip()) == 0:
            return jsonify({
                'status': 'error',
                'message': 'Genre name is required'
            }), 400
        
        exploration_data = MusicDiscoveryService.get_genre_exploration(
            genre, user_id, limit=limit
        )
        
        return jsonify({
            'status': 'success',
            'data': exploration_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error exploring genre {genre}: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to explore genre'
        }), 500


@discovery_bp.route('/trending', methods=['GET'])
@cross_origin()
@auth_required
@rate_limit(max_requests=30, window_seconds=60)
def get_trending_songs():
    """
    Get trending songs based on community activity.
    
    Privacy: Uses aggregated community data without exposing individual user activity.
    ---
    tags:
      - Music Discovery
    parameters:
      - name: timeframe
        in: query
        type: string
        enum: ['1d', '7d', '30d']
        default: '7d'
        description: Time period for trending analysis
      - name: limit
        in: query
        type: integer
        default: 20
        description: Maximum number of trending songs to return (max 50)
    responses:
      200:
        description: Trending songs retrieved successfully
        schema:
          type: object
          properties:
            status:
              type: string
              example: success
            data:
              type: object
              properties:
                timeframe:
                  type: string
                period:
                  type: object
                  properties:
                    start_date:
                      type: string
                    end_date:
                      type: string
                trending_songs:
                  type: array
                  items:
                    type: object
                    properties:
                      song_id:
                        type: integer
                      title:
                        type: string
                      artist:
                        type: string
                      trending_score:
                        type: number
                      view_count:
                        type: integer
                      favorite_count:
                        type: integer
                      trend_explanation:
                        type: string
                trending_factors:
                  type: array
                  items:
                    type: string
                generated_at:
                  type: string
      400:
        description: Invalid timeframe
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Rate limit exceeded
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Server error
        schema:
          $ref: '#/definitions/Error'
    security:
      - Bearer: []
    """
    try:
        user_id = get_current_user_id()
        timeframe = request.args.get('timeframe', '7d')
        limit = min(int(request.args.get('limit', 20)), 50)  # Cap at 50
        
        if timeframe not in ['1d', '7d', '30d']:
            return jsonify({
                'status': 'error',
                'message': 'Invalid timeframe. Must be 1d, 7d, or 30d'
            }), 400
        
        trending_data = MusicDiscoveryService.get_trending_songs(
            user_id, timeframe=timeframe, limit=limit
        )
        
        return jsonify({
            'status': 'success',
            'data': trending_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting trending songs: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get trending songs'
        }), 500


@discovery_bp.route('/preferences', methods=['GET', 'PUT'])
@cross_origin()
@auth_required
@rate_limit(max_requests=30, window_seconds=60)
def manage_discovery_preferences():
    """
    Manage user's music discovery and recommendation preferences.
    
    Privacy: User has full control over discovery personalization settings.
    ---
    tags:
      - Music Discovery
    parameters:
      - name: body
        in: body
        required: false
        description: Discovery preferences (for PUT requests)
        schema:
          type: object
          properties:
            enable_personalized_recommendations:
              type: boolean
              description: Enable personalized song recommendations
            enable_collaborative_filtering:
              type: boolean
              description: Enable recommendations based on similar users
            enable_trending_notifications:
              type: boolean
              description: Enable notifications for trending songs
            preferred_genres:
              type: array
              items:
                type: string
              description: List of preferred music genres
            discovery_privacy_level:
              type: string
              enum: ['private', 'anonymous', 'public']
              description: Privacy level for discovery data sharing
    responses:
      200:
        description: Discovery preferences retrieved or updated successfully
        schema:
          type: object
          properties:
            status:
              type: string
              example: success
            data:
              type: object
              properties:
                discovery_preferences:
                  type: object
                privacy_controls:
                  type: object
      400:
        description: Invalid preferences data
        schema:
          $ref: '#/definitions/Error'
      429:
        description: Rate limit exceeded
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Server error
        schema:
          $ref: '#/definitions/Error'
    security:
      - Bearer: []
    """
    try:
        user_id = get_current_user_id()
        user = User.query.get_or_404(user_id)
        
        if request.method == 'GET':
            # Get current discovery preferences
            discovery_prefs = getattr(user, 'analytics_privacy_settings', {}).get('discovery_preferences', {})
            
            # Set defaults if not configured
            if not discovery_prefs:
                discovery_prefs = {
                    'enable_personalized_recommendations': True,
                    'enable_collaborative_filtering': True,
                    'enable_trending_notifications': False,
                    'preferred_genres': [],
                    'discovery_privacy_level': 'anonymous'
                }
            
            return jsonify({
                'status': 'success',
                'data': {
                    'discovery_preferences': discovery_prefs,
                    'privacy_controls': {
                        'data_usage': 'Control how your activity is used for recommendations',
                        'collaborative_filtering': 'Enable recommendations based on users with similar taste',
                        'privacy_levels': {
                            'private': 'No personalization, generic recommendations only',
                            'anonymous': 'Anonymous data used for improved recommendations',
                            'public': 'Activity visible for community-based recommendations'
                        }
                    }
                }
            }), 200
        
        else:  # PUT request
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'status': 'error',
                    'message': 'Request body is required'
                }), 400
            
            # Validate preferences
            valid_privacy_levels = ['private', 'anonymous', 'public']
            privacy_level = data.get('discovery_privacy_level', 'anonymous')
            
            if privacy_level not in valid_privacy_levels:
                return jsonify({
                    'status': 'error',
                    'message': f'Invalid privacy level. Must be one of: {valid_privacy_levels}'
                }), 400
            
            # Update discovery preferences
            analytics_settings = user.analytics_privacy_settings or {}
            discovery_prefs = {
                'enable_personalized_recommendations': data.get('enable_personalized_recommendations', True),
                'enable_collaborative_filtering': data.get('enable_collaborative_filtering', True),
                'enable_trending_notifications': data.get('enable_trending_notifications', False),
                'preferred_genres': data.get('preferred_genres', []),
                'discovery_privacy_level': privacy_level,
                'updated_at': datetime.now(UTC).isoformat()
            }
            
            analytics_settings['discovery_preferences'] = discovery_prefs
            user.analytics_privacy_settings = analytics_settings
            
            # Mark field as modified for SQLAlchemy
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(user, 'analytics_privacy_settings')
            
            db.session.commit()
            
            logger.info(f"Discovery preferences updated for user {user_id}")
            
            return jsonify({
                'status': 'success',
                'message': 'Discovery preferences updated successfully',
                'data': {
                    'updated_preferences': discovery_prefs
                }
            }), 200
        
    except Exception as e:
        logger.error(f"Error managing discovery preferences for user {get_current_user_id()}: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to manage discovery preferences'
        }), 500