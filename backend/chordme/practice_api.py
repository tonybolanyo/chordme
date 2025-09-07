"""
Practice Mode API endpoints for ChordMe backend
"""

from flask import Blueprint, request, jsonify, current_app
from flask_cors import cross_origin
from datetime import datetime, timedelta
import json
import os

from chordme.utils import auth_required
from chordme.models import db, User
from chordme.session_recording import SessionRecordingManager, record_session_event

# Create Blueprint
practice_bp = Blueprint('practice', __name__, url_prefix='/api/v1/practice')

# In-memory storage for practice data (replace with database in production)
practice_sessions = {}
practice_achievements = {}
practice_statistics = {}

@practice_bp.route('/session', methods=['POST'])
@cross_origin()
@auth_required
def start_practice_session():
    """Start a new practice session"""
    try:
        data = request.get_json()
        user_id = request.current_user.id
        
        session_id = f"practice_{user_id}_{datetime.now().timestamp()}"
        
        session_data = {
            'id': session_id,
            'user_id': user_id,
            'song_id': data.get('songId'),
            'start_time': datetime.utcnow().isoformat(),
            'goals': data.get('goals', []),
            'metronome_config': data.get('metronome', {}),
            'difficulty': data.get('difficulty', 'intermediate'),
            'recording_enabled': data.get('enableRecording', False),
            'status': 'active'
        }
        
        practice_sessions[session_id] = session_data
        
        # Record session start event
        record_session_event(session_id, 'practice_session_started', user_id, session_data)
        
        return jsonify({
            'success': True,
            'session': session_data
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error starting practice session: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to start practice session'
        }), 500

@practice_bp.route('/session/<session_id>', methods=['PUT'])
@cross_origin()
@auth_required
def end_practice_session(session_id):
    """End a practice session"""
    try:
        user_id = request.current_user.id
        data = request.get_json()
        
        if session_id not in practice_sessions:
            return jsonify({
                'success': False,
                'message': 'Session not found'
            }), 404
        
        session = practice_sessions[session_id]
        
        # Verify session belongs to user
        if session['user_id'] != user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 403
        
        # Update session with end data
        session.update({
            'end_time': datetime.utcnow().isoformat(),
            'duration': data.get('duration', 0),
            'statistics': data.get('statistics', {}),
            'achievements': data.get('achievements', []),
            'status': 'completed'
        })
        
        # Update user's overall statistics
        update_user_statistics(user_id, session)
        
        # Record session end event
        record_session_event(session_id, 'practice_session_ended', user_id, session)
        
        return jsonify({
            'success': True,
            'session': session,
            'statistics': get_user_statistics(user_id)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error ending practice session: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to end practice session'
        }), 500

@practice_bp.route('/session/<session_id>', methods=['GET'])
@cross_origin()
@auth_required
def get_practice_session(session_id):
    """Get a specific practice session"""
    try:
        user_id = request.current_user.id
        
        if session_id not in practice_sessions:
            return jsonify({
                'success': False,
                'message': 'Session not found'
            }), 404
        
        session = practice_sessions[session_id]
        
        # Verify session belongs to user
        if session['user_id'] != user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 403
        
        return jsonify({
            'success': True,
            'session': session
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting practice session: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get practice session'
        }), 500

@practice_bp.route('/sessions', methods=['GET'])
@cross_origin()
@auth_required
def get_practice_sessions():
    """Get user's practice sessions"""
    try:
        user_id = request.current_user.id
        
        # Filter sessions for current user
        user_sessions = {
            session_id: session_data 
            for session_id, session_data in practice_sessions.items()
            if session_data['user_id'] == user_id
        }
        
        # Convert to list and sort by start time
        sessions_list = list(user_sessions.values())
        sessions_list.sort(key=lambda x: x['start_time'], reverse=True)
        
        return jsonify({
            'success': True,
            'sessions': sessions_list
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting practice sessions: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get practice sessions'
        }), 500

@practice_bp.route('/statistics', methods=['GET'])
@cross_origin()
@auth_required
def get_practice_statistics():
    """Get user's practice statistics"""
    try:
        user_id = request.current_user.id
        stats = get_user_statistics(user_id)
        
        return jsonify({
            'success': True,
            'statistics': stats
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting practice statistics: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get practice statistics'
        }), 500

@practice_bp.route('/statistics', methods=['PUT'])
@cross_origin()
@auth_required
def update_practice_statistics():
    """Update user's practice statistics"""
    try:
        user_id = request.current_user.id
        data = request.get_json()
        
        if user_id not in practice_statistics:
            practice_statistics[user_id] = {
                'total_practice_time': 0,
                'sessions_count': 0,
                'average_accuracy': 0,
                'chord_change_accuracy': 0,
                'tempo_consistency': 0,
                'sections_completed': 0,
                'streak': 0,
                'last_practice_date': datetime.utcnow().isoformat(),
                'improvement_rate': 0
            }
        
        # Update statistics
        stats = practice_statistics[user_id]
        stats.update(data)
        stats['last_updated'] = datetime.utcnow().isoformat()
        
        return jsonify({
            'success': True,
            'statistics': stats
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error updating practice statistics: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update practice statistics'
        }), 500

@practice_bp.route('/achievements', methods=['GET'])
@cross_origin()
@auth_required
def get_practice_achievements():
    """Get user's practice achievements"""
    try:
        user_id = request.current_user.id
        
        if user_id not in practice_achievements:
            practice_achievements[user_id] = create_default_achievements()
        
        return jsonify({
            'success': True,
            'achievements': practice_achievements[user_id]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting practice achievements: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get practice achievements'
        }), 500

@practice_bp.route('/achievements', methods=['PUT'])
@cross_origin()
@auth_required
def update_practice_achievements():
    """Update user's practice achievements"""
    try:
        user_id = request.current_user.id
        data = request.get_json()
        
        achievements = data.get('achievements', [])
        practice_achievements[user_id] = achievements
        
        return jsonify({
            'success': True,
            'achievements': achievements
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error updating practice achievements: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update practice achievements'
        }), 500

@practice_bp.route('/feedback', methods=['POST'])
@cross_origin()
@auth_required
def record_timing_feedback():
    """Record chord timing feedback"""
    try:
        user_id = request.current_user.id
        data = request.get_json()
        
        session_id = data.get('sessionId')
        feedback = data.get('feedback')
        
        if session_id:
            # Record feedback as session event
            record_session_event(session_id, 'timing_feedback', user_id, {
                'feedback': feedback,
                'timestamp': datetime.utcnow().isoformat()
            })
        
        return jsonify({
            'success': True,
            'message': 'Feedback recorded'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error recording timing feedback: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to record timing feedback'
        }), 500

@practice_bp.route('/goals', methods=['POST'])
@cross_origin()
@auth_required
def create_practice_goal():
    """Create a new practice goal"""
    try:
        user_id = request.current_user.id
        data = request.get_json()
        
        goal = {
            'id': f"goal_{user_id}_{datetime.now().timestamp()}",
            'user_id': user_id,
            'type': data.get('type'),
            'target': data.get('target'),
            'current': 0,
            'completed': False,
            'description': data.get('description'),
            'created_at': datetime.utcnow().isoformat(),
            'deadline': data.get('deadline')
        }
        
        # Store goal (in production, save to database)
        # For now, we'll return the goal as created
        
        return jsonify({
            'success': True,
            'goal': goal
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error creating practice goal: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create practice goal'
        }), 500

@practice_bp.route('/recordings', methods=['POST'])
@cross_origin()
@auth_required
def save_practice_recording():
    """Save a practice recording"""
    try:
        user_id = request.current_user.id
        data = request.get_json()
        
        recording = {
            'id': f"recording_{user_id}_{datetime.now().timestamp()}",
            'user_id': user_id,
            'session_id': data.get('sessionId'),
            'duration': data.get('duration', 0),
            'timing_data': data.get('timingData', []),
            'metronome_data': data.get('metronomeData', []),
            'quality': data.get('quality', 'medium'),
            'created_at': datetime.utcnow().isoformat()
        }
        
        # In production, save to database and cloud storage
        # For now, just return success
        
        return jsonify({
            'success': True,
            'recording': recording
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error saving practice recording: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to save practice recording'
        }), 500

@practice_bp.route('/analytics', methods=['GET'])
@cross_origin()
@auth_required
def get_practice_analytics():
    """Get practice analytics and insights"""
    try:
        user_id = request.current_user.id
        
        # Get user's sessions for analysis
        user_sessions = [
            session for session in practice_sessions.values()
            if session['user_id'] == user_id and session.get('status') == 'completed'
        ]
        
        # Calculate analytics
        total_sessions = len(user_sessions)
        total_time = sum(session.get('duration', 0) for session in user_sessions)
        
        # Weekly progress
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_sessions = [
            session for session in user_sessions
            if datetime.fromisoformat(session.get('start_time', '')) > week_ago
        ]
        
        analytics = {
            'total_sessions': total_sessions,
            'total_practice_time': total_time,
            'average_session_length': total_time / total_sessions if total_sessions > 0 else 0,
            'sessions_this_week': len(recent_sessions),
            'practice_frequency': len(recent_sessions) / 7,  # sessions per day
            'most_practiced_difficulty': get_most_practiced_difficulty(user_sessions),
            'improvement_trends': calculate_improvement_trends(user_sessions),
            'goal_completion_rate': calculate_goal_completion_rate(user_sessions)
        }
        
        return jsonify({
            'success': True,
            'analytics': analytics
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting practice analytics: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get practice analytics'
        }), 500

# Helper functions

def update_user_statistics(user_id, session):
    """Update user's overall practice statistics"""
    if user_id not in practice_statistics:
        practice_statistics[user_id] = {
            'total_practice_time': 0,
            'sessions_count': 0,
            'average_accuracy': 0,
            'chord_change_accuracy': 0,
            'tempo_consistency': 0,
            'sections_completed': 0,
            'streak': 0,
            'last_practice_date': datetime.utcnow().isoformat(),
            'improvement_rate': 0
        }
    
    stats = practice_statistics[user_id]
    stats['total_practice_time'] += session.get('duration', 0)
    stats['sessions_count'] += 1
    stats['last_practice_date'] = session.get('end_time', datetime.utcnow().isoformat())
    
    # Update streak
    update_practice_streak(stats)
    
    return stats

def get_user_statistics(user_id):
    """Get user's practice statistics"""
    return practice_statistics.get(user_id, {
        'total_practice_time': 0,
        'sessions_count': 0,
        'average_accuracy': 0,
        'chord_change_accuracy': 0,
        'tempo_consistency': 0,
        'sections_completed': 0,
        'streak': 0,
        'last_practice_date': datetime.utcnow().isoformat(),
        'improvement_rate': 0
    })

def update_practice_streak(stats):
    """Update practice streak based on last practice date"""
    try:
        last_practice = datetime.fromisoformat(stats['last_practice_date'])
        today = datetime.utcnow().date()
        last_practice_date = last_practice.date()
        
        if last_practice_date == today:
            # Same day, maintain streak
            pass
        elif (today - last_practice_date).days == 1:
            # Consecutive day, increment streak
            stats['streak'] += 1
        else:
            # Gap in practice, reset streak
            stats['streak'] = 1
            
    except Exception as e:
        # If there's an error parsing dates, just set streak to 1
        stats['streak'] = 1

def create_default_achievements():
    """Create default practice achievements"""
    return [
        {
            'id': 'first_session',
            'title': 'First Steps',
            'description': 'Complete your first practice session',
            'type': 'practice_time',
            'level': 'bronze',
            'progress': 0,
            'requirement': 1,
            'icon': '🎵',
            'reward': 'Practice Mode unlocked!',
            'unlocked_at': None
        },
        {
            'id': 'accuracy_80',
            'title': 'Getting Accurate',
            'description': 'Achieve 80% accuracy in chord changes',
            'type': 'accuracy',
            'level': 'silver',
            'progress': 0,
            'requirement': 0.8,
            'icon': '🎯',
            'unlocked_at': None
        },
        {
            'id': 'accuracy_95',
            'title': 'Precision Master',
            'description': 'Achieve 95% accuracy in chord changes',
            'type': 'accuracy',
            'level': 'gold',
            'progress': 0,
            'requirement': 0.95,
            'icon': '🏆',
            'unlocked_at': None
        },
        {
            'id': 'streak_7',
            'title': 'Week Warrior',
            'description': 'Practice for 7 consecutive days',
            'type': 'streak',
            'level': 'silver',
            'progress': 0,
            'requirement': 7,
            'icon': '🔥',
            'unlocked_at': None
        },
        {
            'id': 'practice_time_1h',
            'title': 'Dedicated Musician',
            'description': 'Complete 1 hour of total practice time',
            'type': 'practice_time',
            'level': 'bronze',
            'progress': 0,
            'requirement': 3600,
            'icon': '⏰',
            'unlocked_at': None
        },
        {
            'id': 'practice_time_10h',
            'title': 'Serious Practitioner',
            'description': 'Complete 10 hours of total practice time',
            'type': 'practice_time',
            'level': 'gold',
            'progress': 0,
            'requirement': 36000,
            'icon': '🌟',
            'unlocked_at': None
        }
    ]

def get_most_practiced_difficulty(sessions):
    """Get the most practiced difficulty level"""
    difficulties = {}
    for session in sessions:
        difficulty = session.get('difficulty', 'intermediate')
        difficulties[difficulty] = difficulties.get(difficulty, 0) + 1
    
    if not difficulties:
        return 'intermediate'
    
    return max(difficulties, key=difficulties.get)

def calculate_improvement_trends(sessions):
    """Calculate improvement trends from session data"""
    if len(sessions) < 2:
        return {'trend': 'insufficient_data'}
    
    # Sort sessions by start time
    sorted_sessions = sorted(sessions, key=lambda x: x.get('start_time', ''))
    
    # Calculate trend in session duration (engagement)
    recent_durations = [s.get('duration', 0) for s in sorted_sessions[-5:]]
    early_durations = [s.get('duration', 0) for s in sorted_sessions[:5]]
    
    recent_avg = sum(recent_durations) / len(recent_durations) if recent_durations else 0
    early_avg = sum(early_durations) / len(early_durations) if early_durations else 0
    
    duration_trend = 'improving' if recent_avg > early_avg else 'declining'
    
    return {
        'duration_trend': duration_trend,
        'recent_avg_duration': recent_avg,
        'early_avg_duration': early_avg,
        'total_sessions_analyzed': len(sessions)
    }

def calculate_goal_completion_rate(sessions):
    """Calculate goal completion rate from sessions"""
    total_goals = 0
    completed_goals = 0
    
    for session in sessions:
        goals = session.get('goals', [])
        total_goals += len(goals)
        completed_goals += sum(1 for goal in goals if goal.get('completed', False))
    
    if total_goals == 0:
        return 0.0
    
    return completed_goals / total_goals