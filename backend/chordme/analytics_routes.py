"""
Analytics API Routes

Provides REST API endpoints for performance analytics and insights.
Implements privacy-compliant data collection and GDPR/CCPA compliance.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_cors import cross_origin
import logging
from typing import Dict, Any, List

from .models import db, User
from .analytics_service import PerformanceAnalyticsService
from .utils import auth_required
from .rate_limiter import rate_limit

logger = logging.getLogger(__name__)

# Create blueprint
analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/v1/analytics')


def get_current_user_id():
    """Get the current user ID from Flask's g object."""
    from flask import g
    return getattr(g, 'current_user_id', None)


@analytics_bp.route('/setlists/<int:setlist_id>', methods=['GET'])
@cross_origin()
@auth_required
@rate_limit(max_requests=30, window_seconds=60)
def get_setlist_analytics(setlist_id: int):
    """
    Get comprehensive analytics for a specific setlist.
    
    Privacy: Only returns data for setlists the user has access to.
    """
    try:
        user_id = get_current_user_id()
        
        # Get analytics data
        analytics_data = PerformanceAnalyticsService.get_setlist_analytics(
            setlist_id, user_id
        )
        
        # Add privacy notice
        analytics_data['privacy_notice'] = {
            'data_collection': 'Only performance data from your accessible setlists',
            'retention': 'Data retained according to your account settings',
            'sharing': 'Data is not shared with third parties'
        }
        
        return jsonify({
            'status': 'success',
            'data': analytics_data
        }), 200
        
    except PermissionError as e:
        logger.warning(f"Permission denied for setlist analytics {setlist_id}: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Access denied to this setlist'
        }), 403
        
    except Exception as e:
        logger.error(f"Error getting setlist analytics {setlist_id}: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve analytics data'
        }), 500


@analytics_bp.route('/songs/<int:song_id>', methods=['GET'])
@cross_origin()
@auth_required
@rate_limit(max_requests=30, window_seconds=60)
def get_song_analytics(song_id: int):
    """
    Get performance analytics for a specific song.
    
    Privacy: Only returns data for songs the user has access to.
    """
    try:
        user_id = get_current_user_id()
        
        # Get song analytics
        analytics_data = PerformanceAnalyticsService.get_song_analytics(
            song_id, user_id
        )
        
        # Add privacy notice
        analytics_data['privacy_notice'] = {
            'data_collection': 'Only performance data from your accessible songs',
            'retention': 'Data retained according to your account settings',
            'sharing': 'Data is not shared with third parties'
        }
        
        return jsonify({
            'status': 'success',
            'data': analytics_data
        }), 200
        
    except PermissionError as e:
        logger.warning(f"Permission denied for song analytics {song_id}: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Access denied to this song'
        }), 403
        
    except Exception as e:
        logger.error(f"Error getting song analytics {song_id}: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve song analytics'
        }), 500


@analytics_bp.route('/recommendations', methods=['GET'])
@cross_origin()
@auth_required
@rate_limit(max_requests=30, window_seconds=60)
def get_recommendations():
    """
    Get setlist optimization recommendations based on historical data.
    
    Privacy: Only uses user's own performance data for recommendations.
    """
    try:
        user_id = get_current_user_id()
        limit = int(request.args.get('limit', 10))
        
        if limit > 50:  # Prevent excessive data requests
            limit = 50
        
        recommendations = PerformanceAnalyticsService.get_recommendations(
            user_id, limit=limit
        )
        
        # Add privacy notice
        recommendations['privacy_notice'] = {
            'data_usage': 'Recommendations based only on your performance history',
            'personalization': 'No external data sources used',
            'retention': 'Recommendation data not stored permanently'
        }
        
        return jsonify({
            'status': 'success',
            'data': recommendations
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting recommendations for user {get_current_user_id()}: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to generate recommendations'
        }), 500


@analytics_bp.route('/popular', methods=['GET'])
@cross_origin()
@auth_required
@rate_limit(max_requests=30, window_seconds=60)
def get_popular_songs():
    """
    Get popular songs and trending analysis.
    
    Privacy: Can be filtered to user's data only or anonymized public data.
    """
    try:
        user_id = get_current_user_id()
        
        # Parse query parameters
        timeframe = request.args.get('timeframe', '30d')
        limit = int(request.args.get('limit', 20))
        scope = request.args.get('scope', 'user')  # 'user' or 'public'
        
        # Validate parameters
        valid_timeframes = ['7d', '30d', '90d', '1y', 'all']
        if timeframe not in valid_timeframes:
            return jsonify({
                'status': 'error',
                'message': f'Invalid timeframe. Must be one of: {valid_timeframes}'
            }), 400
        
        if limit > 100:  # Prevent excessive data requests
            limit = 100
        
        # Get popular songs data
        if scope == 'user':
            popular_data = PerformanceAnalyticsService.get_popular_songs(
                user_id=user_id, timeframe=timeframe, limit=limit
            )
            privacy_notice = {
                'scope': 'Your accessible songs only',
                'data_source': 'Your performance history and public songs',
                'anonymization': 'Not applicable for personal data'
            }
        else:
            # Public scope - anonymized data only
            popular_data = PerformanceAnalyticsService.get_popular_songs(
                user_id=None, timeframe=timeframe, limit=limit
            )
            privacy_notice = {
                'scope': 'Public songs with anonymized performance data',
                'data_source': 'Aggregated anonymous performance statistics',
                'anonymization': 'All personal identifiers removed'
            }
        
        popular_data['privacy_notice'] = privacy_notice
        
        return jsonify({
            'status': 'success',
            'data': popular_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting popular songs: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve popular songs data'
        }), 500


@analytics_bp.route('/compare', methods=['POST'])
@cross_origin()
@auth_required
@rate_limit(max_requests=30, window_seconds=60)
def compare_setlists():
    """
    Compare performance metrics across different setlists.
    
    Privacy: Only compares setlists the user has access to.
    """
    try:
        user_id = get_current_user_id()
        data = request.get_json()
        
        if not data or 'setlist_ids' not in data:
            return jsonify({
                'status': 'error',
                'message': 'setlist_ids required'
            }), 400
        
        setlist_ids = data['setlist_ids']
        
        if not isinstance(setlist_ids, list) or len(setlist_ids) < 2:
            return jsonify({
                'status': 'error',
                'message': 'At least 2 setlist IDs required for comparison'
            }), 400
        
        if len(setlist_ids) > 10:  # Limit comparison size
            return jsonify({
                'status': 'error',
                'message': 'Maximum 10 setlists can be compared at once'
            }), 400
        
        # Perform comparison
        comparison_data = PerformanceAnalyticsService.compare_setlists(
            setlist_ids, user_id
        )
        
        # Add privacy notice
        comparison_data['privacy_notice'] = {
            'data_access': 'Only your accessible setlists included',
            'comparison_scope': 'Personal performance data only',
            'retention': 'Comparison results not stored'
        }
        
        return jsonify({
            'status': 'success',
            'data': comparison_data
        }), 200
        
    except PermissionError as e:
        logger.warning(f"Permission denied for setlist comparison: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Access denied to one or more setlists'
        }), 403
        
    except ValueError as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400
        
    except Exception as e:
        logger.error(f"Error comparing setlists: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to compare setlists'
        }), 500


@analytics_bp.route('/export', methods=['POST'])
@cross_origin()
@auth_required
@rate_limit(max_requests=30, window_seconds=60)
def export_analytics():
    """
    Export analytics data in various formats.
    
    Privacy: Only exports user's own data with explicit consent.
    GDPR: Implements data portability rights.
    """
    try:
        user_id = get_current_user_id()
        data = request.get_json()
        
        # Validate export request
        export_type = data.get('export_type', 'comprehensive')
        format_type = data.get('format', 'json')
        consent_given = data.get('privacy_consent', False)
        
        if not consent_given:
            return jsonify({
                'status': 'error',
                'message': 'Privacy consent required for data export'
            }), 400
        
        valid_types = ['comprehensive', 'performances', 'songs', 'trends']
        valid_formats = ['json', 'csv']
        
        if export_type not in valid_types:
            return jsonify({
                'status': 'error',
                'message': f'Invalid export type. Must be one of: {valid_types}'
            }), 400
        
        if format_type not in valid_formats:
            return jsonify({
                'status': 'error',
                'message': f'Invalid format. Must be one of: {valid_formats}'
            }), 400
        
        # Generate export data
        export_data = PerformanceAnalyticsService.export_analytics_data(
            user_id, export_type=export_type, format=format_type
        )
        
        # Add GDPR compliance information
        export_data['gdpr_compliance'] = {
            'data_controller': 'ChordMe Application',
            'purpose': 'Personal analytics data export per GDPR Article 20',
            'retention': 'Export data not retained after download',
            'rights': 'You may request deletion of source data at any time',
            'contact': 'privacy@chordme.app'
        }
        
        # Log the export for audit purposes
        logger.info(f"Analytics data export requested by user {user_id}, type: {export_type}")
        
        return jsonify({
            'status': 'success',
            'data': export_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error exporting analytics data: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to export analytics data'
        }), 500


@analytics_bp.route('/privacy/settings', methods=['GET', 'PUT'])
@cross_origin()
@auth_required
@rate_limit(max_requests=30, window_seconds=60)
def analytics_privacy_settings():
    """
    Manage user's analytics privacy settings.
    
    GDPR/CCPA: Implements granular consent management.
    """
    try:
        user_id = get_current_user_id()
        user = User.query.get_or_404(user_id)
        
        if request.method == 'GET':
            # Get current privacy settings
            privacy_settings = getattr(user, 'analytics_privacy_settings', None)
            if not privacy_settings:
                # Default privacy settings
                privacy_settings = {
                    'collect_performance_data': True,
                    'include_in_trends': True,
                    'allow_recommendations': True,
                    'data_retention_days': 365,
                    'export_allowed': True
                }
            
            return jsonify({
                'status': 'success',
                'data': {
                    'privacy_settings': privacy_settings,
                    'gdpr_rights': {
                        'access': 'View all collected data',
                        'rectification': 'Correct inaccurate data',
                        'erasure': 'Delete personal data',
                        'portability': 'Export data in machine-readable format',
                        'restriction': 'Limit data processing',
                        'objection': 'Object to data processing'
                    }
                }
            }), 200
        
        elif request.method == 'PUT':
            # Update privacy settings
            settings_data = request.get_json()
            
            if not settings_data:
                return jsonify({
                    'status': 'error',
                    'message': 'Privacy settings data required'
                }), 400
            
            # Validate settings
            valid_settings = {
                'collect_performance_data': bool,
                'include_in_trends': bool,
                'allow_recommendations': bool,
                'data_retention_days': int,
                'export_allowed': bool
            }
            
            updated_settings = {}
            for key, value in settings_data.items():
                if key in valid_settings:
                    try:
                        updated_settings[key] = valid_settings[key](value)
                    except (ValueError, TypeError):
                        return jsonify({
                            'status': 'error',
                            'message': f'Invalid value for {key}'
                        }), 400
            
            # Validate retention period
            if 'data_retention_days' in updated_settings:
                retention_days = updated_settings['data_retention_days']
                if not (30 <= retention_days <= 2555):  # 1 month to 7 years
                    return jsonify({
                        'status': 'error',
                        'message': 'Data retention must be between 30 and 2555 days'
                    }), 400
            
            # Update user's privacy settings
            if not hasattr(user, 'analytics_privacy_settings'):
                user.analytics_privacy_settings = {}
            
            user.analytics_privacy_settings.update(updated_settings)
            db.session.commit()
            
            logger.info(f"Privacy settings updated for user {user_id}")
            
            return jsonify({
                'status': 'success',
                'message': 'Privacy settings updated successfully',
                'data': {
                    'updated_settings': updated_settings
                }
            }), 200
            
    except Exception as e:
        logger.error(f"Error managing privacy settings: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to manage privacy settings'
        }), 500


@analytics_bp.route('/data/delete', methods=['POST'])
@cross_origin()
@auth_required
@rate_limit(max_requests=30, window_seconds=60)
def delete_analytics_data():
    """
    Delete user's analytics data (GDPR Right to Erasure).
    
    GDPR: Implements right to erasure/right to be forgotten.
    """
    try:
        user_id = get_current_user_id()
        data = request.get_json()
        
        # Require explicit confirmation
        confirmation = data.get('confirmation', '')
        delete_type = data.get('delete_type', 'all')
        
        if confirmation != 'I understand this action cannot be undone':
            return jsonify({
                'status': 'error',
                'message': 'Explicit confirmation required for data deletion'
            }), 400
        
        valid_delete_types = ['all', 'performances', 'songs', 'personal_data']
        if delete_type not in valid_delete_types:
            return jsonify({
                'status': 'error',
                'message': f'Invalid delete type. Must be one of: {valid_delete_types}'
            }), 400
        
        # Perform deletion based on type
        deleted_items = []
        
        if delete_type in ['all', 'performances']:
            # Delete performance analytics (but not the performance records themselves)
            from .models import SetlistPerformance, SetlistPerformanceSong, Setlist
            
            user_performances = db.session.query(SetlistPerformance).join(
                Setlist, SetlistPerformance.setlist_id == Setlist.id
            ).filter(Setlist.user_id == user_id).all()
            
            for performance in user_performances:
                # Clear analytics fields but keep basic performance record
                performance.notes = None
                performance.improvements_needed = None
                performance.highlights = None
                performance.overall_rating = None
                performance.technical_rating = None
                performance.audience_engagement = None
                
                # Clear detailed song performance data
                for song_performance in performance.performance_songs:
                    song_performance.performance_rating = None
                    song_performance.technical_issues = None
                    song_performance.audience_response = None
                    song_performance.performance_notes = None
                    song_performance.improvement_notes = None
            
            deleted_items.append('Performance analytics data')
        
        if delete_type in ['all', 'personal_data']:
            # Clear user's analytics privacy settings
            user = User.query.get(user_id)
            if hasattr(user, 'analytics_privacy_settings'):
                user.analytics_privacy_settings = {}
            
            deleted_items.append('Personal analytics settings')
        
        db.session.commit()
        
        # Log the deletion for compliance purposes
        logger.info(f"Analytics data deletion completed for user {user_id}, type: {delete_type}")
        
        return jsonify({
            'status': 'success',
            'message': 'Analytics data deleted successfully',
            'data': {
                'deleted_items': deleted_items,
                'deletion_date': datetime.utcnow().isoformat(),
                'compliance_note': 'Deletion performed per GDPR Article 17'
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error deleting analytics data: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to delete analytics data'
        }), 500


@analytics_bp.errorhandler(429)
def handle_rate_limit(e):
    """Handle rate limiting for analytics endpoints."""
    return jsonify({
        'status': 'error',
        'message': 'Rate limit exceeded. Analytics endpoints have usage limits to protect performance.',
        'retry_after': getattr(e, 'retry_after', 60)
    }), 429


@analytics_bp.errorhandler(404)
def handle_not_found(e):
    """Handle 404 errors for analytics endpoints."""
    return jsonify({
        'status': 'error',
        'message': 'Analytics endpoint not found'
    }), 404


# Register the blueprint in the main app
def register_analytics_routes(app):
    """Register analytics routes with the Flask app."""
    app.register_blueprint(analytics_bp)
    logger.info("Analytics routes registered")