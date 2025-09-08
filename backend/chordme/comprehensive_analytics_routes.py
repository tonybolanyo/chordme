"""
Comprehensive Analytics Dashboard API Routes

Provides REST API endpoints for a unified analytics dashboard including:
- User activity analytics with time-series data
- Song and chord progression popularity tracking
- Collaboration session analytics and patterns
- Performance mode usage statistics
- Geographic usage distribution (privacy-compliant)
- Real-time dashboard updates
- Customizable widget data
- Data export capabilities
"""

from flask import Blueprint, request, jsonify, current_app
from flask_cors import cross_origin
from sqlalchemy import func, text, desc, and_, or_
from datetime import datetime, timedelta, UTC
import logging
from typing import Dict, Any, List, Optional

from .models import (
    db, User, Song, Setlist, PerformanceSession, PerformanceEvent, 
    CollaborationSession, SessionParticipant, PerformanceAnalytics
)
from .utils import auth_required
from .rate_limiter import rate_limit
from .enhanced_analytics_service import EnhancedPerformanceAnalyticsService

logger = logging.getLogger(__name__)

# Create blueprint
comprehensive_analytics_bp = Blueprint('comprehensive_analytics', __name__, url_prefix='/api/v1/analytics/comprehensive')


def get_current_user_id():
    """Get the current user ID from Flask's g object."""
    from flask import g
    return getattr(g, 'current_user_id', None)


@comprehensive_analytics_bp.route('/dashboard', methods=['GET'])
@cross_origin()
@auth_required
@rate_limit(max_requests=50, window_seconds=3600)
def get_comprehensive_dashboard():
    """
    Get comprehensive analytics dashboard data.
    
    Returns unified analytics including user activity, song popularity,
    collaboration patterns, and performance statistics.
    """
    try:
        user_id = get_current_user_id()
        
        # Get query parameters
        timeframe = request.args.get('timeframe', '30d')
        include_anonymous = request.args.get('include_anonymous', 'false').lower() == 'true'
        
        # Validate timeframe
        valid_timeframes = ['7d', '30d', '90d', '1y', 'all']
        if timeframe not in valid_timeframes:
            return jsonify({
                'status': 'error',
                'message': f'Invalid timeframe. Must be one of: {valid_timeframes}'
            }), 400
        
        # Calculate date range
        if timeframe == 'all':
            start_date = None
        else:
            days = {'7d': 7, '30d': 30, '90d': 90, '1y': 365}[timeframe]
            start_date = datetime.now(UTC) - timedelta(days=days)
        
        # Get comprehensive analytics data
        dashboard_data = {
            'user_activity': _get_user_activity_analytics(user_id, start_date),
            'song_popularity': _get_song_popularity_analytics(user_id, start_date, include_anonymous),
            'collaboration_patterns': _get_collaboration_analytics(user_id, start_date),
            'performance_statistics': _get_performance_statistics(user_id, start_date),
            'geographic_distribution': _get_geographic_distribution(user_id, start_date) if include_anonymous else None,
            'summary_metrics': _get_summary_metrics(user_id, start_date),
            'real_time_status': _get_real_time_status(),
            'timeframe': timeframe,
            'generated_at': datetime.now(UTC).isoformat()
        }
        
        # Add privacy notice
        dashboard_data['privacy_notice'] = {
            'data_scope': 'Personal analytics data only' if not include_anonymous else 'Personal + anonymized public data',
            'retention': 'Data retained according to your privacy settings',
            'real_time': 'Dashboard updates automatically when new data is available'
        }
        
        return jsonify({
            'status': 'success',
            'data': dashboard_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting comprehensive dashboard: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve dashboard data'
        }), 500


@comprehensive_analytics_bp.route('/user-activity', methods=['GET'])
@cross_origin()
@auth_required
@rate_limit(max_requests=30, window_seconds=3600)
def get_user_activity_analytics():
    """Get user activity analytics with time-series data."""
    try:
        user_id = get_current_user_id()
        
        # Get query parameters
        timeframe = request.args.get('timeframe', '30d')
        granularity = request.args.get('granularity', 'daily')  # daily, weekly, monthly
        
        # Validate parameters
        if granularity not in ['daily', 'weekly', 'monthly']:
            return jsonify({
                'status': 'error',
                'message': 'Invalid granularity. Must be daily, weekly, or monthly'
            }), 400
        
        # Calculate date range
        days = {'7d': 7, '30d': 30, '90d': 90, '1y': 365}.get(timeframe, 30)
        start_date = datetime.now(UTC) - timedelta(days=days)
        
        # Get time-series activity data
        activity_data = _get_user_activity_time_series(user_id, start_date, granularity)
        
        return jsonify({
            'status': 'success',
            'data': {
                'activity_timeline': activity_data,
                'timeframe': timeframe,
                'granularity': granularity,
                'generated_at': datetime.now(UTC).isoformat()
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting user activity analytics: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve user activity data'
        }), 500


@comprehensive_analytics_bp.route('/song-popularity', methods=['GET'])
@cross_origin()
@auth_required
@rate_limit(max_requests=30, window_seconds=3600)
def get_song_popularity_analytics():
    """Get song and chord progression popularity tracking."""
    try:
        user_id = get_current_user_id()
        
        # Get query parameters
        timeframe = request.args.get('timeframe', '30d')
        limit = min(int(request.args.get('limit', 20)), 100)
        include_chords = request.args.get('include_chords', 'false').lower() == 'true'
        
        # Calculate date range
        days = {'7d': 7, '30d': 30, '90d': 90, '1y': 365}.get(timeframe, 30)
        start_date = datetime.now(UTC) - timedelta(days=days)
        
        # Get song popularity data
        popularity_data = _get_song_popularity_data(user_id, start_date, limit, include_chords)
        
        return jsonify({
            'status': 'success',
            'data': popularity_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting song popularity analytics: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve song popularity data'
        }), 500


@comprehensive_analytics_bp.route('/collaboration-patterns', methods=['GET'])
@cross_origin()
@auth_required
@rate_limit(max_requests=30, window_seconds=3600)
def get_collaboration_patterns():
    """Get collaboration session analytics and patterns."""
    try:
        user_id = get_current_user_id()
        
        # Get query parameters
        timeframe = request.args.get('timeframe', '30d')
        
        # Calculate date range
        days = {'7d': 7, '30d': 30, '90d': 90, '1y': 365}.get(timeframe, 30)
        start_date = datetime.now(UTC) - timedelta(days=days)
        
        # Get collaboration analytics
        collaboration_data = _get_collaboration_patterns_data(user_id, start_date)
        
        return jsonify({
            'status': 'success',
            'data': collaboration_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting collaboration patterns: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve collaboration data'
        }), 500


@comprehensive_analytics_bp.route('/widgets/config', methods=['GET', 'POST'])
@cross_origin()
@auth_required
@rate_limit(max_requests=20, window_seconds=3600)
def manage_widget_config():
    """Get or update dashboard widget configuration."""
    try:
        user_id = get_current_user_id()
        user = User.query.get_or_404(user_id)
        
        if request.method == 'GET':
            # Get current widget configuration
            widget_config = user.analytics_privacy_settings.get('widget_config', {
                'layout': 'default',
                'enabled_widgets': [
                    'user_activity', 'song_popularity', 'performance_stats', 
                    'collaboration_summary', 'recent_insights'
                ],
                'widget_positions': {},
                'refresh_interval': 30,  # seconds
                'theme': 'light'
            })
            
            return jsonify({
                'status': 'success',
                'data': {
                    'widget_config': widget_config,
                    'available_widgets': _get_available_widgets()
                }
            }), 200
        
        elif request.method == 'POST':
            # Update widget configuration
            config_data = request.get_json()
            if not config_data:
                return jsonify({
                    'status': 'error',
                    'message': 'Widget configuration data required'
                }), 400
            
            # Validate configuration
            validated_config = _validate_widget_config(config_data)
            
            # Update user's widget configuration
            if not user.analytics_privacy_settings:
                user.analytics_privacy_settings = {}
            
            user.analytics_privacy_settings['widget_config'] = validated_config
            db.session.commit()
            
            return jsonify({
                'status': 'success',
                'message': 'Widget configuration updated successfully',
                'data': {'widget_config': validated_config}
            }), 200
            
    except Exception as e:
        logger.error(f"Error managing widget config: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to manage widget configuration'
        }), 500


@comprehensive_analytics_bp.route('/export/comprehensive', methods=['POST'])
@cross_origin()
@auth_required
@rate_limit(max_requests=5, window_seconds=3600)
def export_comprehensive_analytics():
    """Export comprehensive analytics data for external analysis."""
    try:
        user_id = get_current_user_id()
        data = request.get_json()
        
        # Validate export request
        export_config = data.get('export_config', {})
        format_type = export_config.get('format', 'json')
        timeframe = export_config.get('timeframe', '30d')
        include_sections = export_config.get('include_sections', [
            'user_activity', 'song_popularity', 'collaboration_patterns', 'performance_statistics'
        ])
        
        if not data.get('privacy_consent', False):
            return jsonify({
                'status': 'error',
                'message': 'Privacy consent required for comprehensive data export'
            }), 400
        
        # Calculate date range
        days = {'7d': 7, '30d': 30, '90d': 90, '1y': 365, 'all': None}.get(timeframe, 30)
        start_date = datetime.now(UTC) - timedelta(days=days) if days else None
        
        # Generate comprehensive export data
        export_data = {
            'export_metadata': {
                'user_id': user_id,
                'export_date': datetime.now(UTC).isoformat(),
                'timeframe': timeframe,
                'format': format_type,
                'included_sections': include_sections
            }
        }
        
        # Add requested sections
        if 'user_activity' in include_sections:
            export_data['user_activity'] = _get_user_activity_analytics(user_id, start_date)
        
        if 'song_popularity' in include_sections:
            export_data['song_popularity'] = _get_song_popularity_analytics(user_id, start_date, True)
        
        if 'collaboration_patterns' in include_sections:
            export_data['collaboration_patterns'] = _get_collaboration_analytics(user_id, start_date)
        
        if 'performance_statistics' in include_sections:
            export_data['performance_statistics'] = _get_performance_statistics(user_id, start_date)
        
        # Add compliance information
        export_data['gdpr_compliance'] = {
            'data_controller': 'ChordMe Application',
            'purpose': 'Comprehensive analytics data export per user request',
            'legal_basis': 'GDPR Article 20 - Right to data portability',
            'retention': 'Export data not retained after download',
            'contact': 'privacy@chordme.app'
        }
        
        return jsonify({
            'status': 'success',
            'data': export_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error exporting comprehensive analytics: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to export comprehensive analytics'
        }), 500


# Helper functions for analytics data retrieval

def _get_user_activity_analytics(user_id: int, start_date: Optional[datetime]) -> Dict[str, Any]:
    """Get user activity analytics data."""
    query = PerformanceSession.query.filter_by(user_id=user_id)
    if start_date:
        query = query.filter(PerformanceSession.started_at >= start_date)
    
    sessions = query.all()
    
    # Calculate metrics
    total_sessions = len(sessions)
    total_time = sum((s.ended_at - s.started_at).total_seconds() for s in sessions if s.ended_at)
    device_distribution = {}
    session_types = {}
    
    for session in sessions:
        # Device distribution
        device = session.device_type or 'unknown'
        device_distribution[device] = device_distribution.get(device, 0) + 1
        
        # Session type distribution
        session_types[session.session_type] = session_types.get(session.session_type, 0) + 1
    
    return {
        'total_sessions': total_sessions,
        'total_practice_time': int(total_time),
        'average_session_length': int(total_time / total_sessions) if total_sessions > 0 else 0,
        'device_distribution': device_distribution,
        'session_type_distribution': session_types,
        'most_active_day': _get_most_active_day(sessions),
        'consistency_score': _calculate_consistency_score(sessions)
    }


def _get_user_activity_time_series(user_id: int, start_date: datetime, granularity: str) -> List[Dict[str, Any]]:
    """Get time-series user activity data."""
    # Build SQL query based on granularity
    if granularity == 'daily':
        date_trunc = "DATE(started_at)"
    elif granularity == 'weekly':
        date_trunc = "DATE(started_at, 'weekday 0', '-6 days')"
    else:  # monthly
        date_trunc = "DATE(started_at, 'start of month')"
    
    query = text(f"""
        SELECT {date_trunc} as period,
               COUNT(*) as session_count,
               AVG(CASE WHEN ended_at IS NOT NULL 
                        THEN (julianday(ended_at) - julianday(started_at)) * 86400 
                        ELSE 0 END) as avg_duration,
               COUNT(DISTINCT device_type) as device_variety
        FROM performance_sessions 
        WHERE user_id = :user_id 
        AND started_at >= :start_date
        GROUP BY {date_trunc}
        ORDER BY period
    """)
    
    result = db.session.execute(query, {'user_id': user_id, 'start_date': start_date}).fetchall()
    
    return [
        {
            'period': row[0],
            'session_count': row[1],
            'average_duration': row[2] or 0,
            'device_variety': row[3]
        }
        for row in result
    ]


def _get_song_popularity_analytics(user_id: int, start_date: Optional[datetime], include_anonymous: bool) -> Dict[str, Any]:
    """Get song popularity analytics."""
    # Get user's songs performance data
    user_query = db.session.query(
        Song.id, Song.title, Song.artist, 
        func.count(PerformanceSession.id).label('performance_count')
    ).join(
        PerformanceSession, Song.id == PerformanceSession.song_id
    ).filter(Song.user_id == user_id)
    
    if start_date:
        user_query = user_query.filter(PerformanceSession.started_at >= start_date)
    
    user_songs = user_query.group_by(Song.id).order_by(desc('performance_count')).limit(20).all()
    
    # Get chord popularity (basic implementation)
    chord_popularity = _get_chord_popularity(user_id, start_date)
    
    return {
        'top_songs': [
            {
                'song_id': song.id,
                'title': song.title,
                'artist': song.artist,
                'performance_count': song.performance_count
            }
            for song in user_songs
        ],
        'chord_popularity': chord_popularity,
        'trending_analysis': _get_trending_analysis(user_id, start_date)
    }


def _get_song_popularity_data(user_id: int, start_date: datetime, limit: int, include_chords: bool) -> Dict[str, Any]:
    """Get detailed song popularity data."""
    # Implementation for detailed song popularity
    return _get_song_popularity_analytics(user_id, start_date, False)


def _get_collaboration_analytics(user_id: int, start_date: Optional[datetime]) -> Dict[str, Any]:
    """Get collaboration session analytics."""
    query = CollaborationSession.query.join(
        SessionParticipant, CollaborationSession.id == SessionParticipant.session_id
    ).filter(SessionParticipant.user_id == user_id)
    
    if start_date:
        query = query.filter(CollaborationSession.created_at >= start_date)
    
    sessions = query.all()
    
    total_collaborations = len(sessions)
    total_participants = sum(len(s.participants) for s in sessions)
    
    return {
        'total_collaboration_sessions': total_collaborations,
        'average_participants': total_participants / total_collaborations if total_collaborations > 0 else 0,
        'collaboration_frequency': _calculate_collaboration_frequency(sessions),
        'most_collaborative_songs': _get_most_collaborative_songs(user_id, start_date),
        'collaboration_patterns': _analyze_collaboration_patterns(sessions)
    }


def _get_collaboration_patterns_data(user_id: int, start_date: datetime) -> Dict[str, Any]:
    """Get detailed collaboration patterns."""
    return _get_collaboration_analytics(user_id, start_date)


def _get_performance_statistics(user_id: int, start_date: Optional[datetime]) -> Dict[str, Any]:
    """Get performance mode usage statistics."""
    # Get performance analytics data
    analytics_query = PerformanceAnalytics.query.filter_by(user_id=user_id)
    if start_date:
        analytics_query = analytics_query.filter(PerformanceAnalytics.period_start >= start_date)
    
    analytics = analytics_query.all()
    
    if not analytics:
        return {
            'total_practice_time': 0,
            'completion_rate': 0,
            'improvement_score': 0,
            'problem_areas': []
        }
    
    total_practice_time = sum(a.total_practice_time for a in analytics)
    avg_completion_rate = sum(a.completion_rate for a in analytics) / len(analytics)
    avg_improvement_score = sum(a.improvement_score for a in analytics) / len(analytics)
    
    return {
        'total_practice_time': total_practice_time,
        'completion_rate': avg_completion_rate,
        'improvement_score': avg_improvement_score,
        'problem_areas': _get_top_problem_areas(analytics),
        'performance_trends': _analyze_performance_trends(analytics)
    }


def _get_geographic_distribution(user_id: int, start_date: Optional[datetime]) -> Dict[str, Any]:
    """Get privacy-compliant geographic usage distribution."""
    # This would integrate with server logs or analytics service
    # For privacy, only showing general regions, not specific locations
    return {
        'note': 'Geographic analytics require additional privacy consent',
        'available': False,
        'privacy_compliant': True
    }


def _get_summary_metrics(user_id: int, start_date: Optional[datetime]) -> Dict[str, Any]:
    """Get summary metrics for the dashboard."""
    sessions_query = PerformanceSession.query.filter_by(user_id=user_id)
    if start_date:
        sessions_query = sessions_query.filter(PerformanceSession.started_at >= start_date)
    
    sessions = sessions_query.all()
    total_sessions = len(sessions)
    
    # Get song count
    songs_query = Song.query.filter_by(user_id=user_id)
    if start_date:
        songs_query = songs_query.filter(Song.created_at >= start_date)
    total_songs = songs_query.count()
    
    # Get collaboration count
    collab_count = CollaborationSession.query.join(
        SessionParticipant, CollaborationSession.id == SessionParticipant.session_id
    ).filter(SessionParticipant.user_id == user_id).count()
    
    return {
        'total_sessions': total_sessions,
        'total_songs': total_songs,
        'total_collaborations': collab_count,
        'active_period': 'last_30_days' if start_date else 'all_time'
    }


def _get_real_time_status() -> Dict[str, Any]:
    """Get real-time dashboard status."""
    return {
        'websocket_connected': True,  # This would check actual WebSocket status
        'last_update': datetime.now(UTC).isoformat(),
        'update_frequency': '30s'
    }


def _get_available_widgets() -> List[Dict[str, Any]]:
    """Get list of available dashboard widgets."""
    return [
        {'id': 'user_activity', 'name': 'User Activity', 'description': 'Practice sessions and activity trends'},
        {'id': 'song_popularity', 'name': 'Song Popularity', 'description': 'Most played songs and trending music'},
        {'id': 'performance_stats', 'name': 'Performance Stats', 'description': 'Practice completion and improvement metrics'},
        {'id': 'collaboration_summary', 'name': 'Collaboration', 'description': 'Collaborative session insights'},
        {'id': 'recent_insights', 'name': 'Recent Insights', 'description': 'Latest AI recommendations and tips'},
        {'id': 'problem_sections', 'name': 'Problem Areas', 'description': 'Identified difficulty areas to focus on'},
        {'id': 'progress_trends', 'name': 'Progress Trends', 'description': 'Long-term improvement tracking'}
    ]


def _validate_widget_config(config_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and sanitize widget configuration."""
    available_widgets = {w['id'] for w in _get_available_widgets()}
    
    validated = {
        'layout': config_data.get('layout', 'default'),
        'enabled_widgets': [w for w in config_data.get('enabled_widgets', []) if w in available_widgets],
        'widget_positions': config_data.get('widget_positions', {}),
        'refresh_interval': max(10, min(300, config_data.get('refresh_interval', 30))),  # 10s to 5min
        'theme': config_data.get('theme', 'light') if config_data.get('theme') in ['light', 'dark'] else 'light'
    }
    
    return validated


# Placeholder helper functions - these would be implemented with more sophisticated analytics

def _get_most_active_day(sessions: List) -> str:
    """Get the most active day of the week."""
    if not sessions:
        return 'N/A'
    
    day_counts = {}
    for session in sessions:
        day = session.started_at.strftime('%A')
        day_counts[day] = day_counts.get(day, 0) + 1
    
    return max(day_counts, key=day_counts.get) if day_counts else 'N/A'


def _calculate_consistency_score(sessions: List) -> float:
    """Calculate practice consistency score."""
    if len(sessions) < 2:
        return 0.0
    
    # Simple consistency based on regular practice
    dates = [s.started_at.date() for s in sessions]
    unique_dates = len(set(dates))
    total_span = (max(dates) - min(dates)).days + 1
    
    return (unique_dates / total_span) * 100 if total_span > 0 else 0.0


def _get_chord_popularity(user_id: int, start_date: Optional[datetime]) -> List[Dict[str, Any]]:
    """Get chord popularity data."""
    # This would analyze chord usage from song content
    return [
        {'chord': 'C', 'count': 45, 'percentage': 15.2},
        {'chord': 'G', 'count': 42, 'percentage': 14.1},
        {'chord': 'Am', 'count': 38, 'percentage': 12.8},
        {'chord': 'F', 'count': 35, 'percentage': 11.8}
    ]


def _get_trending_analysis(user_id: int, start_date: Optional[datetime]) -> Dict[str, Any]:
    """Get trending analysis for songs."""
    return {
        'trending_up': ['Song A', 'Song B'],
        'trending_down': ['Song C'],
        'new_favorites': ['Song D']
    }


def _calculate_collaboration_frequency(sessions: List) -> str:
    """Calculate collaboration frequency."""
    if len(sessions) < 2:
        return 'irregular'
    
    # Simple frequency calculation
    days_span = (sessions[-1].created_at - sessions[0].created_at).days
    avg_days_between = days_span / len(sessions) if len(sessions) > 1 else days_span
    
    if avg_days_between <= 3:
        return 'very_frequent'
    elif avg_days_between <= 7:
        return 'frequent'
    elif avg_days_between <= 14:
        return 'regular'
    else:
        return 'occasional'


def _get_most_collaborative_songs(user_id: int, start_date: Optional[datetime]) -> List[Dict[str, Any]]:
    """Get most collaborative songs."""
    # This would analyze which songs are most often used in collaboration
    return []


def _analyze_collaboration_patterns(sessions: List) -> Dict[str, Any]:
    """Analyze collaboration patterns."""
    return {
        'peak_hours': ['19:00-21:00'],
        'average_duration': 45,  # minutes
        'most_common_roles': ['editor', 'viewer']
    }


def _get_top_problem_areas(analytics: List) -> List[Dict[str, Any]]:
    """Get top problem areas from analytics."""
    all_problems = []
    for analytic in analytics:
        all_problems.extend(analytic.most_common_problems)
    
    problem_counts = {}
    for problem in all_problems:
        problem_counts[problem] = problem_counts.get(problem, 0) + 1
    
    return [
        {'problem_type': problem, 'frequency': count}
        for problem, count in sorted(problem_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]


def _analyze_performance_trends(analytics: List) -> Dict[str, Any]:
    """Analyze performance trends."""
    if len(analytics) < 2:
        return {'trend': 'insufficient_data'}
    
    # Simple trend analysis
    completion_rates = [a.completion_rate for a in analytics]
    improvement_scores = [a.improvement_score for a in analytics]
    
    completion_trend = 'improving' if completion_rates[-1] > completion_rates[0] else 'declining'
    improvement_trend = 'improving' if improvement_scores[-1] > improvement_scores[0] else 'declining'
    
    return {
        'completion_trend': completion_trend,
        'improvement_trend': improvement_trend,
        'consistency': 'stable'
    }