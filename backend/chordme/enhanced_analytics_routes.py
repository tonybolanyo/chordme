"""
Enhanced Performance Analytics API Routes

Provides REST API endpoints for:
- Performance session recording and analysis
- Problem section identification and tracking
- Performance insights and recommendations
- Session comparison and progress tracking
- Anonymous usage analytics
- Privacy-compliant data collection
"""

from flask import request, jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, UTC
import logging

from . import app, db
from .utils import auth_required, create_error_response, create_success_response, sanitize_input
from .rate_limiter import rate_limit
from .security_headers import security_headers
from .error_codes import ErrorCode
from .enhanced_analytics_service import EnhancedPerformanceAnalyticsService
from .models import User, PerformanceSession

logger = logging.getLogger(__name__)


@app.route('/api/v1/performance/sessions', methods=['POST'])
@security_headers
@rate_limit(max_requests=100, window_seconds=3600)  # 100 sessions per hour
@auth_required
def start_performance_session():
    """
    Start a new performance session for tracking.
    ---
    tags:
      - Performance Analytics
    summary: Start performance session
    description: Begin tracking a performance session with detailed analytics
    parameters:
      - in: body
        name: session_data
        required: true
        schema:
          type: object
          required:
            - session_type
          properties:
            session_type:
              type: string
              enum: ['practice', 'performance', 'rehearsal']
              description: Type of session
            song_id:
              type: integer
              description: ID of song being performed (optional)
            setlist_id:
              type: integer
              description: ID of setlist being performed (optional)
            device_type:
              type: string
              enum: ['mobile', 'tablet', 'desktop']
              description: Device being used
            analytics_consent:
              type: boolean
              default: false
              description: Whether user consents to detailed analytics
    responses:
      201:
        description: Session started successfully
        schema:
          type: object
          properties:
            session_id:
              type: integer
            message:
              type: string
      400:
        description: Invalid request data
      401:
        description: Unauthorized
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
        session_type = sanitize_input(data.get('session_type', ''))
        if session_type not in ['practice', 'performance', 'rehearsal']:
            return create_error_response(
                ErrorCode.INVALID_INPUT,
                "session_type must be 'practice', 'performance', or 'rehearsal'"
            ), 400
        
        # Validate optional fields
        song_id = data.get('song_id')
        setlist_id = data.get('setlist_id')
        device_type = sanitize_input(data.get('device_type', ''))
        analytics_consent = bool(data.get('analytics_consent', False))
        
        if device_type and device_type not in ['mobile', 'tablet', 'desktop']:
            device_type = None
        
        # Get current user ID from auth
        user_id = request.current_user.id
        
        # Start the session
        session_id = EnhancedPerformanceAnalyticsService.start_performance_session(
            user_id=user_id,
            session_type=session_type,
            song_id=song_id,
            setlist_id=setlist_id,
            device_type=device_type,
            analytics_consent=analytics_consent
        )
        
        return create_success_response({
            'session_id': session_id,
            'message': 'Performance session started successfully'
        }), 201
        
    except Exception as e:
        logger.error(f"Error starting performance session: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to start performance session"
        ), 500


@app.route('/api/v1/performance/sessions/<int:session_id>/events', methods=['POST'])
@security_headers
@rate_limit(max_requests=1000, window_seconds=3600)  # 1000 events per hour
@auth_required
def record_performance_event(session_id):
    """
    Record a performance event during a session.
    ---
    tags:
      - Performance Analytics
    summary: Record performance event
    description: Record user interactions during performance for analysis
    parameters:
      - in: path
        name: session_id
        required: true
        type: integer
        description: Performance session ID
      - in: body
        name: event_data
        required: true
        schema:
          type: object
          required:
            - event_type
          properties:
            event_type:
              type: string
              enum: ['pause', 'play', 'rewind', 'fast_forward', 'tempo_change', 'seek']
              description: Type of event that occurred
            position_seconds:
              type: number
              description: Position in content when event occurred
            chord_at_position:
              type: string
              description: Chord being played when event occurred
            section_name:
              type: string
              description: Song section (verse, chorus, etc.)
            tempo_bpm:
              type: integer
              description: New tempo for tempo_change events
            seek_target:
              type: number
              description: Target position for seek events
    responses:
      200:
        description: Event recorded successfully
      400:
        description: Invalid request data
      401:
        description: Unauthorized
      404:
        description: Session not found
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
        
        # Validate event type
        event_type = sanitize_input(data.get('event_type', ''))
        valid_events = ['pause', 'play', 'rewind', 'fast_forward', 'tempo_change', 'seek']
        if event_type not in valid_events:
            return create_error_response(
                ErrorCode.INVALID_INPUT,
                f"event_type must be one of: {', '.join(valid_events)}"
            ), 400
        
        # Get optional fields
        position_seconds = data.get('position_seconds')
        if position_seconds is not None:
            try:
                position_seconds = float(position_seconds)
                if position_seconds < 0:
                    position_seconds = 0
            except (ValueError, TypeError):
                position_seconds = None
        
        # Extract additional event data
        event_data = {}
        for key in ['tempo_bpm', 'seek_target']:
            if key in data:
                event_data[key] = data[key]
        
        # Record the event
        success = EnhancedPerformanceAnalyticsService.record_performance_event(
            session_id=session_id,
            event_type=event_type,
            position_seconds=position_seconds,
            chord_at_position=sanitize_input(data.get('chord_at_position', '')),
            section_name=sanitize_input(data.get('section_name', '')),
            **event_data
        )
        
        if not success:
            return create_error_response(
                ErrorCode.RESOURCE_NOT_FOUND,
                "Session not found or event recording failed"
            ), 404
        
        return create_success_response({
            'message': 'Event recorded successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error recording performance event: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to record performance event"
        ), 500


@app.route('/api/v1/performance/sessions/<int:session_id>/end', methods=['POST'])
@security_headers
@rate_limit(max_requests=100, window_seconds=3600)  # 100 session ends per hour
@auth_required
def end_performance_session(session_id):
    """
    End a performance session and calculate final metrics.
    ---
    tags:
      - Performance Analytics
    summary: End performance session
    description: Complete a performance session and trigger analysis
    parameters:
      - in: path
        name: session_id
        required: true
        type: integer
        description: Performance session ID
      - in: body
        name: session_completion
        schema:
          type: object
          properties:
            completion_percentage:
              type: number
              minimum: 0
              maximum: 100
              default: 100
              description: How much of content was completed
            session_rating:
              type: integer
              minimum: 1
              maximum: 5
              description: User's rating of the session
            difficulty_rating:
              type: integer
              minimum: 1
              maximum: 5
              description: User's difficulty rating
    responses:
      200:
        description: Session ended successfully
      400:
        description: Invalid request data
      401:
        description: Unauthorized
      404:
        description: Session not found
      500:
        description: Server error
    """
    try:
        data = request.get_json() or {}
        
        # Validate optional fields
        completion_percentage = data.get('completion_percentage', 100.0)
        try:
            completion_percentage = float(completion_percentage)
            completion_percentage = max(0.0, min(100.0, completion_percentage))
        except (ValueError, TypeError):
            completion_percentage = 100.0
        
        session_rating = data.get('session_rating')
        if session_rating is not None:
            try:
                session_rating = int(session_rating)
                if session_rating < 1 or session_rating > 5:
                    session_rating = None
            except (ValueError, TypeError):
                session_rating = None
        
        difficulty_rating = data.get('difficulty_rating')
        if difficulty_rating is not None:
            try:
                difficulty_rating = int(difficulty_rating)
                if difficulty_rating < 1 or difficulty_rating > 5:
                    difficulty_rating = None
            except (ValueError, TypeError):
                difficulty_rating = None
        
        # End the session
        success = EnhancedPerformanceAnalyticsService.end_performance_session(
            session_id=session_id,
            completion_percentage=completion_percentage,
            session_rating=session_rating,
            difficulty_rating=difficulty_rating
        )
        
        if not success:
            return create_error_response(
                ErrorCode.RESOURCE_NOT_FOUND,
                "Session not found or ending failed"
            ), 404
        
        return create_success_response({
            'message': 'Session ended successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error ending performance session: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to end performance session"
        ), 500


@app.route('/api/v1/performance/problem-sections', methods=['GET'])
@security_headers
@rate_limit(max_requests=50, window_seconds=3600)  # 50 requests per hour
@auth_required
def get_problem_sections():
    """
    Get identified problem sections with improvement suggestions.
    ---
    tags:
      - Performance Analytics
    summary: Get problem sections
    description: Retrieve problem sections identified during performances
    parameters:
      - in: query
        name: session_id
        type: integer
        description: Filter by specific session
      - in: query
        name: song_id
        type: integer
        description: Filter by specific song
      - in: query
        name: limit
        type: integer
        default: 10
        minimum: 1
        maximum: 50
        description: Maximum number of results
    responses:
      200:
        description: Problem sections retrieved successfully
        schema:
          type: object
          properties:
            problem_sections:
              type: array
              items:
                type: object
            total_count:
              type: integer
      401:
        description: Unauthorized
      500:
        description: Server error
    """
    try:
        # Get query parameters
        session_id = request.args.get('session_id', type=int)
        song_id = request.args.get('song_id', type=int)
        limit = request.args.get('limit', default=10, type=int)
        
        # Validate limit
        limit = max(1, min(50, limit))
        
        # Get current user ID
        user_id = request.current_user.id
        
        # Get problem sections
        problem_sections = EnhancedPerformanceAnalyticsService.get_problem_sections(
            session_id=session_id,
            song_id=song_id,
            user_id=user_id,
            limit=limit
        )
        
        return create_success_response({
            'problem_sections': problem_sections,
            'total_count': len(problem_sections)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting problem sections: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to get problem sections"
        ), 500


@app.route('/api/v1/performance/insights', methods=['GET'])
@security_headers
@rate_limit(max_requests=20, window_seconds=3600)  # 20 requests per hour
@auth_required
def get_performance_insights():
    """
    Get comprehensive performance insights and recommendations.
    ---
    tags:
      - Performance Analytics
    summary: Get performance insights
    description: Retrieve AI-powered insights and recommendations based on performance data
    parameters:
      - in: query
        name: song_id
        type: integer
        description: Filter insights for specific song
      - in: query
        name: period_days
        type: integer
        default: 30
        minimum: 7
        maximum: 365
        description: Number of days to analyze
    responses:
      200:
        description: Insights retrieved successfully
        schema:
          type: object
          properties:
            user_id:
              type: integer
            song_id:
              type: integer
            analysis_period:
              type: object
            summary_metrics:
              type: object
            problem_analysis:
              type: object
            ai_recommendations:
              type: array
            improvement_trends:
              type: object
            session_comparison:
              type: object
      401:
        description: Unauthorized
      500:
        description: Server error
    """
    try:
        # Get query parameters
        song_id = request.args.get('song_id', type=int)
        period_days = request.args.get('period_days', default=30, type=int)
        
        # Validate period
        period_days = max(7, min(365, period_days))
        
        # Get current user ID
        user_id = request.current_user.id
        
        # Get performance insights
        insights = EnhancedPerformanceAnalyticsService.get_performance_insights(
            user_id=user_id,
            song_id=song_id,
            period_days=period_days
        )
        
        return create_success_response(insights), 200
        
    except Exception as e:
        logger.error(f"Error getting performance insights: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to get performance insights"
        ), 500


@app.route('/api/v1/performance/analytics/anonymous', methods=['GET'])
@security_headers
@rate_limit(max_requests=10, window_seconds=3600)  # 10 requests per hour
def get_anonymous_usage_analytics():
    """
    Get anonymous usage analytics for feature optimization.
    ---
    tags:
      - Performance Analytics
    summary: Get anonymous analytics
    description: Retrieve anonymized usage analytics for product improvement
    parameters:
      - in: query
        name: time_period
        type: string
        enum: ['daily', 'weekly', 'monthly']
        default: 'weekly'
        description: Time period for analytics
    responses:
      200:
        description: Anonymous analytics retrieved successfully
        schema:
          type: object
          properties:
            time_period:
              type: string
            analysis_period:
              type: object
            session_metrics:
              type: object
            interaction_patterns:
              type: object
            feature_optimization_insights:
              type: array
      400:
        description: Invalid time period
      500:
        description: Server error
    """
    try:
        # Get query parameters
        time_period = request.args.get('time_period', default='weekly')
        
        # Validate time period
        if time_period not in ['daily', 'weekly', 'monthly']:
            return create_error_response(
                ErrorCode.INVALID_INPUT,
                "time_period must be 'daily', 'weekly', or 'monthly'"
            ), 400
        
        # Get anonymous analytics
        analytics = EnhancedPerformanceAnalyticsService.get_anonymous_usage_analytics(
            time_period=time_period
        )
        
        return create_success_response(analytics), 200
        
    except Exception as e:
        logger.error(f"Error getting anonymous analytics: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to get anonymous analytics"
        ), 500


@app.route('/api/v1/performance/privacy/settings', methods=['GET'])
@security_headers
@rate_limit(max_requests=50, window_seconds=3600)  # 50 requests per hour
@auth_required
def get_analytics_privacy_settings():
    """
    Get user's analytics privacy settings.
    ---
    tags:
      - Performance Analytics
      - Privacy
    summary: Get privacy settings
    description: Retrieve user's privacy preferences for performance analytics
    responses:
      200:
        description: Privacy settings retrieved successfully
        schema:
          type: object
          properties:
            anonymous_only:
              type: boolean
            data_retention_days:
              type: integer
            analytics_consent:
              type: boolean
            feature_optimization_consent:
              type: boolean
      401:
        description: Unauthorized
      500:
        description: Server error
    """
    try:
        user = request.current_user
        settings = user.analytics_privacy_settings or {}
        
        # Default privacy settings (privacy-first approach)
        default_settings = {
            'anonymous_only': True,
            'data_retention_days': 30,
            'analytics_consent': False,
            'feature_optimization_consent': True,  # Anonymous feature optimization is opt-out
            'detailed_tracking': False,
            'cross_session_analysis': False
        }
        
        # Merge with user settings
        privacy_settings = {**default_settings, **settings}
        
        return create_success_response(privacy_settings), 200
        
    except Exception as e:
        logger.error(f"Error getting privacy settings: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to get privacy settings"
        ), 500


@app.route('/api/v1/performance/privacy/settings', methods=['PUT'])
@security_headers
@rate_limit(max_requests=10, window_seconds=3600)  # 10 updates per hour
@auth_required
def update_analytics_privacy_settings():
    """
    Update user's analytics privacy settings.
    ---
    tags:
      - Performance Analytics
      - Privacy
    summary: Update privacy settings
    description: Update user's privacy preferences for performance analytics
    parameters:
      - in: body
        name: privacy_settings
        required: true
        schema:
          type: object
          properties:
            anonymous_only:
              type: boolean
              description: Only collect anonymous data
            data_retention_days:
              type: integer
              minimum: 7
              maximum: 365
              description: How long to retain analytics data
            analytics_consent:
              type: boolean
              description: Consent to detailed performance analytics
            feature_optimization_consent:
              type: boolean
              description: Allow anonymous data for feature optimization
            detailed_tracking:
              type: boolean
              description: Enable detailed interaction tracking
            cross_session_analysis:
              type: boolean
              description: Allow analysis across multiple sessions
    responses:
      200:
        description: Privacy settings updated successfully
      400:
        description: Invalid settings
      401:
        description: Unauthorized
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
        
        user = request.current_user
        current_settings = user.analytics_privacy_settings or {}
        
        # Validate and update settings
        new_settings = current_settings.copy()
        
        # Boolean settings
        for setting in ['anonymous_only', 'analytics_consent', 'feature_optimization_consent', 
                       'detailed_tracking', 'cross_session_analysis']:
            if setting in data:
                new_settings[setting] = bool(data[setting])
        
        # Data retention validation
        if 'data_retention_days' in data:
            try:
                retention_days = int(data['data_retention_days'])
                if 7 <= retention_days <= 365:
                    new_settings['data_retention_days'] = retention_days
                else:
                    return create_error_response(
                        ErrorCode.INVALID_INPUT,
                        "data_retention_days must be between 7 and 365"
                    ), 400
            except (ValueError, TypeError):
                return create_error_response(
                    ErrorCode.INVALID_INPUT,
                    "data_retention_days must be a valid integer"
                ), 400
        
        # Privacy consistency checks
        if new_settings.get('detailed_tracking', False) and new_settings.get('anonymous_only', True):
            new_settings['anonymous_only'] = False  # Detailed tracking requires non-anonymous data
        
        if not new_settings.get('analytics_consent', False):
            new_settings['detailed_tracking'] = False
            new_settings['cross_session_analysis'] = False
        
        # Update user settings
        user.analytics_privacy_settings = new_settings
        db.session.commit()
        
        return create_success_response({
            'message': 'Privacy settings updated successfully',
            'updated_settings': new_settings
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error updating privacy settings: {e}")
        return create_error_response(
            ErrorCode.DATABASE_ERROR,
            "Failed to update privacy settings"
        ), 500
    except Exception as e:
        logger.error(f"Error updating privacy settings: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to update privacy settings"
        ), 500


@app.route('/api/v1/performance/data/export', methods=['GET'])
@security_headers
@rate_limit(max_requests=5, window_seconds=3600)  # 5 exports per hour
@auth_required
def export_performance_data():
    """
    Export user's performance data for GDPR compliance.
    ---
    tags:
      - Performance Analytics
      - Privacy
      - GDPR
    summary: Export performance data
    description: Export all performance analytics data for the user
    responses:
      200:
        description: Performance data exported successfully
        schema:
          type: object
          properties:
            user_id:
              type: integer
            export_date:
              type: string
            performance_sessions:
              type: array
            analytics_snapshots:
              type: array
            privacy_settings:
              type: object
      401:
        description: Unauthorized
      500:
        description: Server error
    """
    try:
        user_id = request.current_user.id
        
        # Get all performance sessions for the user
        sessions = PerformanceSession.query.filter_by(user_id=user_id).all()
        
        # Get analytics snapshots
        from .models import PerformanceAnalytics
        analytics = PerformanceAnalytics.query.filter_by(user_id=user_id).all()
        
        export_data = {
            'user_id': user_id,
            'export_date': datetime.now(UTC).isoformat(),
            'performance_sessions': [session.to_dict(include_events=True) for session in sessions],
            'analytics_snapshots': [analytic.to_dict() for analytic in analytics],
            'privacy_settings': request.current_user.analytics_privacy_settings or {},
            'data_summary': {
                'total_sessions': len(sessions),
                'total_analytics_snapshots': len(analytics),
                'earliest_session': min(s.started_at for s in sessions).isoformat() if sessions else None,
                'latest_session': max(s.started_at for s in sessions).isoformat() if sessions else None
            }
        }
        
        return create_success_response(export_data), 200
        
    except Exception as e:
        logger.error(f"Error exporting performance data: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to export performance data"
        ), 500


@app.route('/api/v1/performance/data/delete', methods=['DELETE'])
@security_headers
@rate_limit(max_requests=2, window_seconds=86400)  # 2 deletions per day
@auth_required
def delete_performance_data():
    """
    Delete user's performance analytics data for GDPR compliance.
    ---
    tags:
      - Performance Analytics
      - Privacy
      - GDPR
    summary: Delete performance data
    description: Delete all or specified performance analytics data for the user
    parameters:
      - in: query
        name: delete_all
        type: boolean
        default: false
        description: Delete all performance data
      - in: query
        name: older_than_days
        type: integer
        description: Delete data older than specified days
    responses:
      200:
        description: Performance data deleted successfully
        schema:
          type: object
          properties:
            deleted_sessions:
              type: integer
            deleted_analytics:
              type: integer
            message:
              type: string
      401:
        description: Unauthorized
      500:
        description: Server error
    """
    try:
        user_id = request.current_user.id
        delete_all = request.args.get('delete_all', 'false').lower() == 'true'
        older_than_days = request.args.get('older_than_days', type=int)
        
        if delete_all:
            # Delete all performance data
            sessions = PerformanceSession.query.filter_by(user_id=user_id).all()
            analytics = PerformanceAnalytics.query.filter_by(user_id=user_id).all()
            
            for session in sessions:
                db.session.delete(session)
            for analytic in analytics:
                db.session.delete(analytic)
            
            deleted_sessions = len(sessions)
            deleted_analytics = len(analytics)
            
        elif older_than_days:
            # Delete data older than specified days
            cutoff_date = datetime.now(UTC) - timedelta(days=older_than_days)
            
            sessions = PerformanceSession.query.filter(
                PerformanceSession.user_id == user_id,
                PerformanceSession.started_at < cutoff_date
            ).all()
            
            analytics = PerformanceAnalytics.query.filter(
                PerformanceAnalytics.user_id == user_id,
                PerformanceAnalytics.created_at < cutoff_date
            ).all()
            
            for session in sessions:
                db.session.delete(session)
            for analytic in analytics:
                db.session.delete(analytic)
            
            deleted_sessions = len(sessions)
            deleted_analytics = len(analytics)
            
        else:
            return create_error_response(
                ErrorCode.INVALID_INPUT,
                "Must specify either delete_all=true or older_than_days parameter"
            ), 400
        
        db.session.commit()
        
        return create_success_response({
            'deleted_sessions': deleted_sessions,
            'deleted_analytics': deleted_analytics,
            'message': f'Successfully deleted {deleted_sessions} sessions and {deleted_analytics} analytics records'
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error deleting performance data: {e}")
        return create_error_response(
            ErrorCode.DATABASE_ERROR,
            "Failed to delete performance data"
        ), 500
    except Exception as e:
        logger.error(f"Error deleting performance data: {e}")
        return create_error_response(
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Failed to delete performance data"
        ), 500