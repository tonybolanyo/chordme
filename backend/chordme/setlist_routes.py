"""
Setlist API routes for collaboration, sharing, and management.
Extends the existing setlist functionality with collaboration features.
"""

from flask import Blueprint, request, jsonify, g
from flask_cors import cross_origin
from functools import wraps
from datetime import datetime, timezone

from chordme.models import (
    db, User, Setlist, SetlistSong, SetlistCollaborator, 
    SetlistVersion, SetlistTemplate, SetlistPerformance, Song
)
from chordme.utils import verify_jwt_token, auth_required
from chordme.error_codes import ERROR_CODES
import logging

logger = logging.getLogger(__name__)

# Create blueprint
setlist_bp = Blueprint('setlists', __name__, url_prefix='/api/v1/setlists')


def setlist_access_required(permission_level='view'):
    """
    Decorator to check setlist access permissions.
    
    Args:
        permission_level: Required permission level ('view', 'comment', 'edit', 'admin')
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get setlist_id from URL parameters
            setlist_id = kwargs.get('setlist_id') or request.view_args.get('setlist_id')
            
            if not setlist_id:
                return jsonify({'message': 'Setlist ID required'}), 400
            
            # Get user from token
            auth_header = request.headers.get('Authorization')
            if not auth_header:
                return jsonify({'message': 'Authorization required'}), 401
            
            try:
                user_data = verify_jwt_token(auth_header.split(' ')[1])
                user_id = user_data['user_id']
            except Exception as e:
                logger.warning(f"Token verification failed: {e}")
                return jsonify({'message': 'Invalid token'}), 401
            
            # Check setlist exists
            setlist = Setlist.query.get(setlist_id)
            if not setlist or setlist.is_deleted:
                return jsonify({'message': 'Setlist not found'}), 404
            
            # Check permissions
            has_access = False
            user_permission_level = None
            
            # Owner has full access
            if setlist.user_id == user_id:
                has_access = True
                user_permission_level = 'owner'
            # Check if public for view access
            elif permission_level == 'view' and setlist.is_public:
                has_access = True
                user_permission_level = 'view'
            else:
                # Check collaborator permissions
                collaborator = SetlistCollaborator.query.filter_by(
                    setlist_id=setlist_id, user_id=user_id, status='accepted'
                ).first()
                
                if collaborator:
                    user_permission_level = collaborator.permission_level
                    # Define permission hierarchy
                    permission_levels = ['view', 'comment', 'edit', 'admin']
                    required_index = permission_levels.index(permission_level)
                    user_index = permission_levels.index(user_permission_level)
                    has_access = user_index >= required_index
            
            if not has_access:
                return jsonify({'message': 'Access denied'}), 403
            
            # Add setlist and user info to kwargs
            kwargs['setlist'] = setlist
            kwargs['current_user_id'] = user_id
            kwargs['user_permission_level'] = user_permission_level
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


@setlist_bp.route('', methods=['GET'])
@cross_origin()
@auth_required
def list_setlists():
    """
    List setlists accessible to the current user.
    Includes owned, shared, and public setlists.
    """
    try:
        user_id = g.current_user_id
        
        # Parse query parameters
        include_shared = request.args.get('include_shared', 'true').lower() == 'true'
        include_public = request.args.get('include_public', 'false').lower() == 'true'
        status = request.args.get('status')
        event_type = request.args.get('event_type')
        search = request.args.get('search', '').strip()
        limit = min(int(request.args.get('limit', 50)), 100)
        offset = int(request.args.get('offset', 0))
        sort = request.args.get('sort', 'updated_at')
        order = request.args.get('order', 'desc')
        
        # Build base query for owned setlists
        owned_query = Setlist.query.filter_by(user_id=user_id, is_deleted=False)
        
        # Build query for shared setlists
        shared_setlist_ids = []
        if include_shared:
            shared_collaborations = SetlistCollaborator.query.filter_by(
                user_id=user_id, status='accepted'
            ).all()
            shared_setlist_ids = [c.setlist_id for c in shared_collaborations]
        
        # Combine queries
        if shared_setlist_ids:
            combined_query = owned_query.union(
                Setlist.query.filter(
                    Setlist.id.in_(shared_setlist_ids),
                    Setlist.is_deleted == False
                )
            )
        else:
            combined_query = owned_query
        
        # Apply filters
        if status:
            combined_query = combined_query.filter(Setlist.status == status)
        if event_type:
            combined_query = combined_query.filter(Setlist.event_type == event_type)
        if search:
            search_filter = f"%{search}%"
            combined_query = combined_query.filter(
                db.or_(
                    Setlist.name.ilike(search_filter),
                    Setlist.description.ilike(search_filter),
                    Setlist.venue.ilike(search_filter)
                )
            )
        
        # Apply sorting
        if sort == 'name':
            sort_column = Setlist.name
        elif sort == 'created_at':
            sort_column = Setlist.created_at
        elif sort == 'last_performed':
            sort_column = Setlist.last_performed
        else:
            sort_column = Setlist.updated_at
        
        if order == 'desc':
            sort_column = sort_column.desc()
        
        # Get total count
        total = combined_query.count()
        
        # Apply pagination
        setlists = combined_query.order_by(sort_column).offset(offset).limit(limit).all()
        
        # Format response
        setlist_data = []
        for setlist in setlists:
            data = setlist.to_dict()
            
            # Add permission level for current user
            if setlist.user_id == user_id:
                data['permission_level'] = 'owner'
            else:
                collaborator = SetlistCollaborator.query.filter_by(
                    setlist_id=setlist.id, user_id=user_id, status='accepted'
                ).first()
                data['permission_level'] = collaborator.permission_level if collaborator else 'view'
            
            # Add collaborator count
            data['collaborator_count'] = SetlistCollaborator.query.filter_by(
                setlist_id=setlist.id, status='accepted'
            ).count()
            
            setlist_data.append(data)
        
        return jsonify({
            'setlists': setlist_data,
            'pagination': {
                'total': total,
                'limit': limit,
                'offset': offset,
                'has_more': offset + limit < total
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error listing setlists: {e}")
        return jsonify({'message': 'Failed to list setlists'}), 500


@setlist_bp.route('/<int:setlist_id>', methods=['GET'])
@cross_origin()
@setlist_access_required('view')
def get_setlist(setlist_id, **kwargs):
    """
    Get detailed setlist information including songs, collaborators, etc.
    """
    try:
        setlist = kwargs['setlist']
        user_permission_level = kwargs['user_permission_level']
        
        # Parse query parameters
        include_songs = request.args.get('include_songs', 'true').lower() == 'true'
        include_collaborators = request.args.get('include_collaborators', 'false').lower() == 'true'
        include_versions = request.args.get('include_versions', 'false').lower() == 'true'
        include_performances = request.args.get('include_performances', 'false').lower() == 'true'
        
        # Get basic setlist data
        data = setlist.to_dict(include_songs=include_songs, include_versions=include_versions)
        data['permission_level'] = user_permission_level
        
        # Include collaborators if requested
        if include_collaborators:
            collaborators = SetlistCollaborator.query.filter_by(
                setlist_id=setlist_id, status='accepted'
            ).all()
            data['collaborators'] = [
                collab.to_dict(include_user=True) for collab in collaborators
            ]
        
        # Include performances if requested and user has access
        if include_performances and user_permission_level in ['owner', 'admin', 'edit']:
            performances = SetlistPerformance.query.filter_by(setlist_id=setlist_id).all()
            data['performances'] = [perf.to_dict() for perf in performances]
        
        # Update view count (only for non-owners)
        if setlist.user_id != kwargs['current_user_id']:
            setlist.view_count += 1
            db.session.commit()
        
        return jsonify(data), 200
        
    except Exception as e:
        logger.error(f"Error getting setlist {setlist_id}: {e}")
        return jsonify({'message': 'Failed to get setlist'}), 500


@setlist_bp.route('', methods=['POST'])
@cross_origin()
@auth_required
def create_setlist():
    """
    Create a new setlist.
    """
    try:
        user_id = g.current_user_id
        data = request.get_json()
        
        if not data or not data.get('name'):
            return jsonify({'message': 'Setlist name is required'}), 400
        
        # Create setlist
        setlist = Setlist(
            name=data['name'],
            user_id=user_id,
            description=data.get('description'),
            event_type=data.get('event_type', 'performance'),
            venue=data.get('venue'),
            event_date=datetime.fromisoformat(data['event_date']) if data.get('event_date') else None,
            estimated_duration=data.get('estimated_duration'),
            template_id=data.get('template_id'),
            is_public=data.get('is_public', False),
            is_recurring=data.get('is_recurring', False),
            recurring_pattern=data.get('recurring_pattern'),
            tags=data.get('tags', []),
            notes=data.get('notes')
        )
        
        db.session.add(setlist)
        db.session.commit()
        
        # Create initial version
        version = SetlistVersion(
            setlist_id=setlist.id,
            version_number=1,
            name=f"{setlist.name} v1",
            created_by=user_id,
            version_note="Initial version"
        )
        db.session.add(version)
        db.session.commit()
        
        return jsonify(setlist.to_dict()), 201
        
    except Exception as e:
        logger.error(f"Error creating setlist: {e}")
        return jsonify({'message': 'Failed to create setlist'}), 500


@setlist_bp.route('/<int:setlist_id>/collaborators', methods=['GET'])
@cross_origin()
@setlist_access_required('view')
def get_collaborators(setlist_id, **kwargs):
    """
    Get list of setlist collaborators.
    """
    try:
        collaborators = SetlistCollaborator.query.filter_by(setlist_id=setlist_id).all()
        
        collaborator_data = []
        for collab in collaborators:
            data = collab.to_dict(include_user=True)
            collaborator_data.append(data)
        
        return jsonify({'collaborators': collaborator_data}), 200
        
    except Exception as e:
        logger.error(f"Error getting collaborators for setlist {setlist_id}: {e}")
        return jsonify({'message': 'Failed to get collaborators'}), 500


@setlist_bp.route('/<int:setlist_id>/collaborators', methods=['POST'])
@cross_origin()
@setlist_access_required('admin')
def add_collaborator(setlist_id, **kwargs):
    """
    Add a collaborator to the setlist.
    """
    try:
        current_user_id = kwargs['current_user_id']
        data = request.get_json()
        
        if not data or not data.get('user_email'):
            return jsonify({'message': 'User email is required'}), 400
        
        user_email = data['user_email']
        permission_level = data.get('permission_level', 'view')
        message = data.get('message', '')
        
        # Validate permission level
        if permission_level not in ['view', 'comment', 'edit', 'admin']:
            return jsonify({'message': 'Invalid permission level'}), 400
        
        # Find user by email
        user = User.query.filter_by(email=user_email).first()
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Check if user is already a collaborator
        existing_collab = SetlistCollaborator.query.filter_by(
            setlist_id=setlist_id, user_id=user.id
        ).first()
        
        if existing_collab:
            return jsonify({'message': 'User is already a collaborator'}), 400
        
        # Create collaboration
        collaboration = SetlistCollaborator(
            setlist_id=setlist_id,
            user_id=user.id,
            permission_level=permission_level,
            invited_by=current_user_id
        )
        
        db.session.add(collaboration)
        db.session.commit()
        
        return jsonify(collaboration.to_dict(include_user=True)), 201
        
    except Exception as e:
        logger.error(f"Error adding collaborator to setlist {setlist_id}: {e}")
        return jsonify({'message': 'Failed to add collaborator'}), 500


@setlist_bp.route('/<int:setlist_id>/collaborators/<int:collaborator_id>', methods=['PUT'])
@cross_origin()
@setlist_access_required('admin')
def update_collaborator_permission(setlist_id, collaborator_id, **kwargs):
    """
    Update collaborator permission level.
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('permission_level'):
            return jsonify({'message': 'Permission level is required'}), 400
        
        permission_level = data['permission_level']
        
        # Validate permission level
        if permission_level not in ['view', 'comment', 'edit', 'admin']:
            return jsonify({'message': 'Invalid permission level'}), 400
        
        # Find collaborator
        collaborator = SetlistCollaborator.query.filter_by(
            id=collaborator_id, setlist_id=setlist_id
        ).first()
        
        if not collaborator:
            return jsonify({'message': 'Collaborator not found'}), 404
        
        # Update permission
        collaborator.permission_level = permission_level
        db.session.commit()
        
        return jsonify(collaborator.to_dict(include_user=True)), 200
        
    except Exception as e:
        logger.error(f"Error updating collaborator {collaborator_id}: {e}")
        return jsonify({'message': 'Failed to update collaborator'}), 500


@setlist_bp.route('/<int:setlist_id>/collaborators/<int:collaborator_id>', methods=['DELETE'])
@cross_origin()
@setlist_access_required('admin')
def remove_collaborator(setlist_id, collaborator_id, **kwargs):
    """
    Remove a collaborator from the setlist.
    """
    try:
        # Find collaborator
        collaborator = SetlistCollaborator.query.filter_by(
            id=collaborator_id, setlist_id=setlist_id
        ).first()
        
        if not collaborator:
            return jsonify({'message': 'Collaborator not found'}), 404
        
        # Remove collaborator
        db.session.delete(collaborator)
        db.session.commit()
        
        return jsonify({'message': 'Collaborator removed successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error removing collaborator {collaborator_id}: {e}")
        return jsonify({'message': 'Failed to remove collaborator'}), 500