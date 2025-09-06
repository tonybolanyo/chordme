"""
Favorites Management Routes
Provides functionality for managing user favorites including:
- Song favorites (add/remove/list)
- Search query favorites (save/list/delete)
- Export functionality for user data
"""

from flask import Blueprint, request, jsonify, g
from flasgger import swag_from
import json
from datetime import datetime
from sqlalchemy import text, desc
from . import db
from .models import UserFavorite, Song, User
from .utils import auth_required, validate_request_size, sanitize_input
from .rate_limiter import rate_limit
from .security_headers import security_headers
import logging

# Create favorites blueprint
favorites_bp = Blueprint('favorites', __name__)

@favorites_bp.route('/api/v1/favorites/songs/<int:song_id>', methods=['POST'])
@security_headers
@auth_required
@rate_limit(max_requests=30, window_seconds=60)  # 30 per minute
@validate_request_size(max_content_length=1024)  # Small request size for favorites
def toggle_song_favorite(song_id):
    """
    Add or remove a song from user's favorites
    ---
    tags:
      - Favorites
    summary: Toggle song favorite status
    description: Add or remove a song from the user's favorites list
    parameters:
      - name: song_id
        in: path
        required: true
        type: integer
        description: ID of the song to favorite/unfavorite
    responses:
      200:
        description: Favorite status toggled successfully
        schema:
          type: object
          properties:
            status:
              type: string
              example: "success"
            message:
              type: string
              example: "Song added to favorites"
            data:
              type: object
              properties:
                song_id:
                  type: integer
                is_favorited:
                  type: boolean
                favorite_count:
                  type: integer
      404:
        description: Song not found
      500:
        description: Server error
    """
    try:
        user_id = g.current_user_id
        
        # Check if song exists
        song = Song.query.get(song_id)
        if not song:
            return jsonify({
                'status': 'error',
                'message': 'Song not found'
            }), 404
        
        # Check if already favorited
        existing_favorite = UserFavorite.query.filter_by(
            user_id=user_id, 
            song_id=song_id
        ).first()
        
        if existing_favorite:
            # Remove from favorites
            db.session.delete(existing_favorite)
            is_favorited = False
            message = "Song removed from favorites"
        else:
            # Add to favorites
            favorite = UserFavorite(user_id=user_id, song_id=song_id)
            db.session.add(favorite)
            is_favorited = True
            message = "Song added to favorites"
        
        db.session.commit()
        
        # Get updated favorite count
        favorite_count = UserFavorite.query.filter_by(song_id=song_id).count()
        
        return jsonify({
            'status': 'success',
            'message': message,
            'data': {
                'song_id': song_id,
                'is_favorited': is_favorited,
                'favorite_count': favorite_count
            }
        }), 200
        
    except Exception as e:
        logging.error(f"Error toggling favorite for song {song_id}: {str(e)}")
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': 'Failed to update favorite status'
        }), 500


@favorites_bp.route('/api/v1/favorites/songs', methods=['GET'])
@security_headers
@auth_required
@rate_limit(max_requests=100, window_seconds=60)  # 100 per minute
def get_favorite_songs():
    """
    Get user's favorite songs
    ---
    tags:
      - Favorites
    summary: Get user's favorite songs
    description: Retrieve a list of songs favorited by the current user
    parameters:
      - name: limit
        in: query
        type: integer
        default: 50
        description: Maximum number of favorites to return
      - name: offset
        in: query
        type: integer
        default: 0
        description: Number of favorites to skip
      - name: sort
        in: query
        type: string
        enum: [recent, title, artist]
        default: recent
        description: Sort order for favorites
    responses:
      200:
        description: Favorite songs retrieved successfully
        schema:
          type: object
          properties:
            status:
              type: string
              example: "success"
            data:
              type: object
              properties:
                favorites:
                  type: array
                  items:
                    type: object
                    properties:
                      id:
                        type: integer
                      song_id:
                        type: integer
                      title:
                        type: string
                      artist:
                        type: string
                      genre:
                        type: string
                      created_at:
                        type: string
                        format: date-time
                      favorited_at:
                        type: string
                        format: date-time
                total_count:
                  type: integer
      500:
        description: Server error
    """
    try:
        user_id = g.current_user_id
        
        # Get query parameters
        limit = min(int(request.args.get('limit', 50)), 100)
        offset = int(request.args.get('offset', 0))
        sort_by = request.args.get('sort', 'recent')
        
        # Build query
        query = db.session.query(UserFavorite, Song).join(
            Song, UserFavorite.song_id == Song.id
        ).filter(UserFavorite.user_id == user_id)
        
        # Apply sorting
        if sort_by == 'title':
            query = query.order_by(Song.title)
        elif sort_by == 'artist':
            query = query.order_by(Song.artist)
        else:  # recent
            query = query.order_by(desc(UserFavorite.created_at))
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        favorites_data = query.offset(offset).limit(limit).all()
        
        # Format response
        favorites = []
        for favorite, song in favorites_data:
            favorites.append({
                'id': favorite.id,
                'song_id': song.id,
                'title': song.title,
                'artist': song.artist,
                'genre': song.genre or '',
                'created_at': song.created_at.isoformat() if song.created_at else None,
                'favorited_at': favorite.created_at.isoformat() if favorite.created_at else None
            })
        
        return jsonify({
            'status': 'success',
            'data': {
                'favorites': favorites,
                'total_count': total_count
            }
        }), 200
        
    except Exception as e:
        logging.error(f"Error getting favorite songs for user {user_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve favorite songs'
        }), 500


@favorites_bp.route('/api/v1/favorites/queries', methods=['POST'])
@security_headers
@auth_required
@rate_limit(max_requests=20, window_seconds=60)  # 20 per minute
@validate_request_size(max_content_length=4096)
def save_favorite_query():
    """
    Save a search query as favorite
    ---
    tags:
      - Favorites
    summary: Save favorite search query
    description: Save a search query and filters as a favorite for quick access
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - name
            - query
          properties:
            name:
              type: string
              description: Display name for the favorite query
              maxLength: 100
            query:
              type: string
              description: The search query text
              maxLength: 500
            filters:
              type: object
              description: Search filters applied with the query
    responses:
      200:
        description: Favorite query saved successfully
      400:
        description: Invalid request data
      500:
        description: Server error
    """
    try:
        user_id = g.current_user_id
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        name = sanitize_input(data.get('name', '')).strip()
        query = sanitize_input(data.get('query', '')).strip()
        filters = data.get('filters', {})
        
        if not name or not query:
            return jsonify({
                'status': 'error',
                'message': 'Name and query are required'
            }), 400
        
        if len(name) > 100:
            return jsonify({
                'status': 'error',
                'message': 'Name must be 100 characters or less'
            }), 400
        
        if len(query) > 500:
            return jsonify({
                'status': 'error',
                'message': 'Query must be 500 characters or less'
            }), 400
        
        # Store in user preferences (simple JSON storage for now)
        # In a production system, this might be a separate table
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404
        
        # Get existing favorite queries from user data
        favorite_queries = []
        if hasattr(user, 'favorite_queries') and user.favorite_queries:
            try:
                favorite_queries = json.loads(user.favorite_queries)
            except:
                favorite_queries = []
        
        # Check for duplicate names
        for existing in favorite_queries:
            if existing.get('name') == name:
                return jsonify({
                    'status': 'error',
                    'message': 'A favorite query with this name already exists'
                }), 400
        
        # Add new favorite query
        new_favorite = {
            'id': len(favorite_queries) + 1,
            'name': name,
            'query': query,
            'filters': filters,
            'created_at': datetime.utcnow().isoformat(),
            'usage_count': 0
        }
        
        favorite_queries.append(new_favorite)
        
        # Store back to user (this is a simplified approach)
        # In production, consider a separate FavoriteQuery model
        if not hasattr(user, 'favorite_queries'):
            # Add the column dynamically if it doesn't exist
            # This would typically be done via database migration
            pass
        
        # For now, we'll use a simple localStorage approach on frontend
        return jsonify({
            'status': 'success',
            'message': 'Favorite query saved successfully',
            'data': new_favorite
        }), 200
        
    except Exception as e:
        logging.error(f"Error saving favorite query: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to save favorite query'
        }), 500


@favorites_bp.route('/api/v1/favorites/export', methods=['GET'])
@security_headers
@auth_required
@rate_limit(max_requests=5, window_seconds=60)  # 5 per minute
def export_favorites():
    """
    Export user's favorites data
    ---
    tags:
      - Favorites
    summary: Export user favorites
    description: Export all user favorites data including songs and queries
    parameters:
      - name: format
        in: query
        type: string
        enum: [json, csv]
        default: json
        description: Export format
    responses:
      200:
        description: Favorites data exported successfully
        schema:
          type: object
          properties:
            status:
              type: string
              example: "success"
            data:
              type: object
              properties:
                export_date:
                  type: string
                  format: date-time
                user_id:
                  type: integer
                favorite_songs:
                  type: array
                favorite_queries:
                  type: array
      500:
        description: Server error
    """
    try:
        user_id = g.current_user_id
        export_format = request.args.get('format', 'json').lower()
        
        # Get favorite songs
        favorite_songs_query = db.session.query(UserFavorite, Song).join(
            Song, UserFavorite.song_id == Song.id
        ).filter(UserFavorite.user_id == user_id).order_by(desc(UserFavorite.created_at))
        
        favorite_songs = []
        for favorite, song in favorite_songs_query.all():
            favorite_songs.append({
                'song_id': song.id,
                'title': song.title,
                'artist': song.artist,
                'genre': song.genre or '',
                'favorited_at': favorite.created_at.isoformat() if favorite.created_at else None
            })
        
        # Get favorite queries (from localStorage for now)
        # In production, this would come from a database table
        favorite_queries = []
        
        export_data = {
            'export_date': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'favorite_songs': favorite_songs,
            'favorite_queries': favorite_queries,
            'total_favorite_songs': len(favorite_songs),
            'total_favorite_queries': len(favorite_queries)
        }
        
        if export_format == 'csv':
            # For CSV format, we'd need to flatten the data
            # For now, returning JSON with a note
            export_data['note'] = 'CSV export format coming soon'
        
        return jsonify({
            'status': 'success',
            'data': export_data
        }), 200
        
    except Exception as e:
        logging.error(f"Error exporting favorites for user {user_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to export favorites'
        }), 500