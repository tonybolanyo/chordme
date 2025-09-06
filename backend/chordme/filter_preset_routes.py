"""
Filter Preset Management Routes
Provides API endpoints for creating, managing, and sharing custom filter presets.
"""

from flask import Blueprint, request, jsonify, g
from flasgger import swag_from
from datetime import datetime
from . import db
from .models import FilterPreset, User
from .utils import auth_required, validate_request_size, sanitize_input
from .rate_limiter import rate_limit
from .security_headers import security_headers
import logging

# Create filter preset blueprint
filter_preset_bp = Blueprint('filter_presets', __name__)

logger = logging.getLogger(__name__)


@filter_preset_bp.route('/filter-presets', methods=['GET'])
@auth_required
@security_headers
@rate_limit(max_requests=100, window_seconds=300)  # 100 requests per 5 minutes
@swag_from({
    'tags': ['Filter Presets'],
    'summary': 'Get user filter presets',
    'description': 'Retrieve all filter presets accessible to the current user',
    'parameters': [
        {
            'name': 'include_public',
            'in': 'query',
            'type': 'boolean',
            'default': True,
            'description': 'Include public presets in results'
        },
        {
            'name': 'limit',
            'in': 'query',
            'type': 'integer',
            'default': 50,
            'description': 'Maximum number of presets to return'
        }
    ],
    'responses': {
        200: {
            'description': 'Filter presets retrieved successfully',
            'schema': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string', 'example': 'success'},
                    'data': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'id': {'type': 'integer'},
                                'name': {'type': 'string'},
                                'description': {'type': 'string'},
                                'filter_config': {'type': 'object'},
                                'is_public': {'type': 'boolean'},
                                'usage_count': {'type': 'integer'},
                                'created_at': {'type': 'string'},
                                'updated_at': {'type': 'string'}
                            }
                        }
                    }
                }
            }
        }
    }
})
def get_filter_presets():
    """Get all filter presets accessible to the current user."""
    try:
        include_public = request.args.get('include_public', 'true').lower() == 'true'
        limit = min(int(request.args.get('limit', 50)), 100)  # Cap at 100
        
        presets_query = FilterPreset.get_accessible_presets(g.current_user.id, include_public)
        presets = presets_query.limit(limit).all()
        
        return jsonify({
            'status': 'success',
            'data': [preset.to_dict() for preset in presets]
        }), 200
        
    except Exception as e:
        logger.error(f"Error retrieving filter presets: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve filter presets'
        }), 500


@filter_preset_bp.route('/filter-presets', methods=['POST'])
@auth_required
@security_headers
@rate_limit(max_requests=20, window_seconds=3600)  # 20 creates per hour
@validate_request_size(max_content_length=1024 * 10)  # 10KB max
@swag_from({
    'tags': ['Filter Presets'],
    'summary': 'Create new filter preset',
    'description': 'Create a new custom filter preset',
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'required': ['name', 'filter_config'],
                'properties': {
                    'name': {'type': 'string', 'maxLength': 100},
                    'description': {'type': 'string', 'maxLength': 500},
                    'filter_config': {'type': 'object'},
                    'is_public': {'type': 'boolean', 'default': False},
                    'is_shared': {'type': 'boolean', 'default': False}
                }
            }
        }
    ],
    'responses': {
        201: {'description': 'Filter preset created successfully'},
        400: {'description': 'Invalid request data'},
        409: {'description': 'Preset name already exists for user'}
    }
})
def create_filter_preset():
    """Create a new filter preset."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'No data provided'}), 400
        
        # Validate required fields
        name = sanitize_input(data.get('name', '').strip())
        if not name:
            return jsonify({'status': 'error', 'message': 'Preset name is required'}), 400
        
        if len(name) > 100:
            return jsonify({'status': 'error', 'message': 'Preset name too long (max 100 characters)'}), 400
        
        filter_config = data.get('filter_config')
        if not filter_config or not isinstance(filter_config, dict):
            return jsonify({'status': 'error', 'message': 'Valid filter configuration is required'}), 400
        
        # Check if preset name already exists for this user
        existing = FilterPreset.query.filter_by(
            user_id=g.current_user.id,
            name=name
        ).first()
        
        if existing:
            return jsonify({
                'status': 'error',
                'message': 'A preset with this name already exists'
            }), 409
        
        # Create new preset
        preset = FilterPreset(
            name=name,
            user_id=g.current_user.id,
            filter_config=filter_config,
            description=sanitize_input(data.get('description', '')),
            is_public=bool(data.get('is_public', False)),
            is_shared=bool(data.get('is_shared', False))
        )
        
        # Validate filter configuration
        is_valid, error_msg = preset.validate_filter_config()
        if not is_valid:
            return jsonify({'status': 'error', 'message': error_msg}), 400
        
        db.session.add(preset)
        db.session.commit()
        
        logger.info(f"User {g.current_user.id} created filter preset '{name}'")
        
        return jsonify({
            'status': 'success',
            'message': 'Filter preset created successfully',
            'data': preset.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating filter preset: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to create filter preset'
        }), 500


@filter_preset_bp.route('/filter-presets/<int:preset_id>', methods=['GET'])
@auth_required
@security_headers
@rate_limit(max_requests=100, window_seconds=300)
@swag_from({
    'tags': ['Filter Presets'],
    'summary': 'Get specific filter preset',
    'description': 'Retrieve details of a specific filter preset',
    'parameters': [
        {
            'name': 'preset_id',
            'in': 'path',
            'required': True,
            'type': 'integer',
            'description': 'Filter preset ID'
        }
    ],
    'responses': {
        200: {'description': 'Filter preset retrieved successfully'},
        404: {'description': 'Filter preset not found'},
        403: {'description': 'Access denied to this preset'}
    }
})
def get_filter_preset(preset_id):
    """Get details of a specific filter preset."""
    try:
        preset = FilterPreset.query.get(preset_id)
        if not preset:
            return jsonify({'status': 'error', 'message': 'Filter preset not found'}), 404
        
        if not preset.can_user_access(g.current_user.id):
            return jsonify({'status': 'error', 'message': 'Access denied to this preset'}), 403
        
        # Increment usage count if accessing someone else's preset
        if preset.user_id != g.current_user.id:
            preset.increment_usage()
            db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': preset.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Error retrieving filter preset {preset_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve filter preset'
        }), 500


@filter_preset_bp.route('/filter-presets/<int:preset_id>', methods=['PUT'])
@auth_required
@security_headers
@rate_limit(max_requests=30, window_seconds=3600)  # 30 updates per hour
@validate_request_size(max_content_length=1024 * 10)
@swag_from({
    'tags': ['Filter Presets'],
    'summary': 'Update filter preset',
    'description': 'Update an existing filter preset (owner only)',
    'parameters': [
        {
            'name': 'preset_id',
            'in': 'path',
            'required': True,
            'type': 'integer'
        },
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'properties': {
                    'name': {'type': 'string', 'maxLength': 100},
                    'description': {'type': 'string', 'maxLength': 500},
                    'filter_config': {'type': 'object'},
                    'is_public': {'type': 'boolean'},
                    'is_shared': {'type': 'boolean'}
                }
            }
        }
    ],
    'responses': {
        200: {'description': 'Filter preset updated successfully'},
        404: {'description': 'Filter preset not found'},
        403: {'description': 'Only preset owner can edit'}
    }
})
def update_filter_preset(preset_id):
    """Update an existing filter preset."""
    try:
        preset = FilterPreset.query.get(preset_id)
        if not preset:
            return jsonify({'status': 'error', 'message': 'Filter preset not found'}), 404
        
        if not preset.can_user_edit(g.current_user.id):
            return jsonify({'status': 'error', 'message': 'Only preset owner can edit'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'No data provided'}), 400
        
        # Update fields if provided
        if 'name' in data:
            name = sanitize_input(data['name'].strip())
            if not name:
                return jsonify({'status': 'error', 'message': 'Preset name cannot be empty'}), 400
            
            # Check for name conflicts (excluding current preset)
            existing = FilterPreset.query.filter(
                FilterPreset.user_id == g.current_user.id,
                FilterPreset.name == name,
                FilterPreset.id != preset_id
            ).first()
            
            if existing:
                return jsonify({
                    'status': 'error',
                    'message': 'A preset with this name already exists'
                }), 409
            
            preset.name = name
        
        if 'description' in data:
            preset.description = sanitize_input(data['description'])
        
        if 'filter_config' in data:
            if not isinstance(data['filter_config'], dict):
                return jsonify({'status': 'error', 'message': 'Invalid filter configuration'}), 400
            
            preset.filter_config = data['filter_config']
            
            # Validate new configuration
            is_valid, error_msg = preset.validate_filter_config()
            if not is_valid:
                return jsonify({'status': 'error', 'message': error_msg}), 400
        
        if 'is_public' in data:
            preset.is_public = bool(data['is_public'])
        
        if 'is_shared' in data:
            preset.is_shared = bool(data['is_shared'])
        
        db.session.commit()
        
        logger.info(f"User {g.current_user.id} updated filter preset {preset_id}")
        
        return jsonify({
            'status': 'success',
            'message': 'Filter preset updated successfully',
            'data': preset.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating filter preset {preset_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to update filter preset'
        }), 500


@filter_preset_bp.route('/filter-presets/<int:preset_id>', methods=['DELETE'])
@auth_required
@security_headers
@rate_limit(max_requests=20, window_seconds=3600)  # 20 deletes per hour
@swag_from({
    'tags': ['Filter Presets'],
    'summary': 'Delete filter preset',
    'description': 'Delete a filter preset (owner only)',
    'parameters': [
        {
            'name': 'preset_id',
            'in': 'path',
            'required': True,
            'type': 'integer'
        }
    ],
    'responses': {
        200: {'description': 'Filter preset deleted successfully'},
        404: {'description': 'Filter preset not found'},
        403: {'description': 'Only preset owner can delete'}
    }
})
def delete_filter_preset(preset_id):
    """Delete a filter preset."""
    try:
        preset = FilterPreset.query.get(preset_id)
        if not preset:
            return jsonify({'status': 'error', 'message': 'Filter preset not found'}), 404
        
        if not preset.can_user_edit(g.current_user.id):
            return jsonify({'status': 'error', 'message': 'Only preset owner can delete'}), 403
        
        preset_name = preset.name
        db.session.delete(preset)
        db.session.commit()
        
        logger.info(f"User {g.current_user.id} deleted filter preset '{preset_name}'")
        
        return jsonify({
            'status': 'success',
            'message': 'Filter preset deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting filter preset {preset_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to delete filter preset'
        }), 500


@filter_preset_bp.route('/filter-presets/<int:preset_id>/share', methods=['POST'])
@auth_required
@security_headers
@rate_limit(max_requests=50, window_seconds=3600)  # 50 shares per hour
@validate_request_size(max_content_length=1024)
@swag_from({
    'tags': ['Filter Presets'],
    'summary': 'Share filter preset with user',
    'description': 'Share a filter preset with another user by email',
    'parameters': [
        {
            'name': 'preset_id',
            'in': 'path',
            'required': True,
            'type': 'integer'
        },
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'required': ['user_email'],
                'properties': {
                    'user_email': {'type': 'string', 'format': 'email'}
                }
            }
        }
    ],
    'responses': {
        200: {'description': 'Filter preset shared successfully'},
        404: {'description': 'Filter preset or user not found'},
        403: {'description': 'Only preset owner can share'}
    }
})
def share_filter_preset(preset_id):
    """Share a filter preset with another user."""
    try:
        preset = FilterPreset.query.get(preset_id)
        if not preset:
            return jsonify({'status': 'error', 'message': 'Filter preset not found'}), 404
        
        if not preset.can_user_edit(g.current_user.id):
            return jsonify({'status': 'error', 'message': 'Only preset owner can share'}), 403
        
        data = request.get_json()
        if not data or 'user_email' not in data:
            return jsonify({'status': 'error', 'message': 'User email is required'}), 400
        
        user_email = sanitize_input(data['user_email'].strip().lower())
        
        # Find user by email
        target_user = User.query.filter_by(email=user_email).first()
        if not target_user:
            return jsonify({'status': 'error', 'message': 'User not found'}), 404
        
        # Cannot share with yourself
        if target_user.id == g.current_user.id:
            return jsonify({'status': 'error', 'message': 'Cannot share preset with yourself'}), 400
        
        # Add user to shared list
        preset.share_with_user(target_user.id)
        db.session.commit()
        
        logger.info(f"User {g.current_user.id} shared preset {preset_id} with user {target_user.id}")
        
        return jsonify({
            'status': 'success',
            'message': f'Filter preset shared with {user_email}'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error sharing filter preset {preset_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to share filter preset'
        }), 500


@filter_preset_bp.route('/filter-presets/<int:preset_id>/unshare', methods=['POST'])
@auth_required
@security_headers
@rate_limit(max_requests=50, window_seconds=3600)
@validate_request_size(max_content_length=1024)
@swag_from({
    'tags': ['Filter Presets'],
    'summary': 'Unshare filter preset',
    'description': 'Remove sharing access for a user',
    'parameters': [
        {
            'name': 'preset_id',
            'in': 'path',
            'required': True,
            'type': 'integer'
        },
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'required': ['user_email'],
                'properties': {
                    'user_email': {'type': 'string', 'format': 'email'}
                }
            }
        }
    ],
    'responses': {
        200: {'description': 'Sharing access revoked successfully'},
        404: {'description': 'Filter preset or user not found'},
        403: {'description': 'Only preset owner can revoke access'}
    }
})
def unshare_filter_preset(preset_id):
    """Remove sharing access for a user."""
    try:
        preset = FilterPreset.query.get(preset_id)
        if not preset:
            return jsonify({'status': 'error', 'message': 'Filter preset not found'}), 404
        
        if not preset.can_user_edit(g.current_user.id):
            return jsonify({'status': 'error', 'message': 'Only preset owner can revoke access'}), 403
        
        data = request.get_json()
        if not data or 'user_email' not in data:
            return jsonify({'status': 'error', 'message': 'User email is required'}), 400
        
        user_email = sanitize_input(data['user_email'].strip().lower())
        
        # Find user by email
        target_user = User.query.filter_by(email=user_email).first()
        if not target_user:
            return jsonify({'status': 'error', 'message': 'User not found'}), 404
        
        # Remove user from shared list
        preset.unshare_with_user(target_user.id)
        db.session.commit()
        
        logger.info(f"User {g.current_user.id} revoked preset {preset_id} access from user {target_user.id}")
        
        return jsonify({
            'status': 'success',
            'message': f'Sharing access revoked for {user_email}'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error unsharing filter preset {preset_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to revoke sharing access'
        }), 500