"""
Enhanced Performance Analytics Service

Provides advanced analytics and insights for performance tracking including:
- Real-time performance session recording and analysis
- Problem section identification (where users pause/rewind frequently)
- Tempo and timing analysis during performances
- Performance improvement suggestions with ML insights
- Session comparison and progress tracking
- Anonymous usage analytics for feature optimization
- Privacy-compliant data collection and storage
"""

from sqlalchemy import func, desc, and_, or_, text
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta, UTC
from collections import defaultdict, Counter
import logging
from typing import Dict, List, Any, Optional, Tuple
import json
import re
import statistics

from .models import (
    db, User, Song, Setlist, SetlistSong, SetlistPerformance,
    PerformanceSession, PerformanceEvent, ProblemSection, PerformanceAnalytics
)

logger = logging.getLogger(__name__)


class EnhancedPerformanceAnalyticsService:
    """Enhanced service for performance analytics with ML insights and privacy controls."""
    
    @staticmethod
    def start_performance_session(user_id: int, session_type: str, song_id: Optional[int] = None, 
                                 setlist_id: Optional[int] = None, device_type: Optional[str] = None,
                                 analytics_consent: bool = False) -> int:
        """
        Start a new performance session for tracking.
        
        Args:
            user_id: ID of the user performing
            session_type: Type of session ('practice', 'performance', 'rehearsal')
            song_id: Optional song being performed
            setlist_id: Optional setlist being performed
            device_type: Device type ('mobile', 'tablet', 'desktop')
            analytics_consent: Whether user consented to detailed analytics
            
        Returns:
            Session ID
        """
        # Check user's privacy settings
        user = User.query.get(user_id)
        privacy_settings = user.analytics_privacy_settings if user else {}
        
        # Respect user's privacy preferences
        anonymous_only = not analytics_consent or privacy_settings.get('anonymous_only', True)
        
        session = PerformanceSession(
            user_id=user_id,
            session_type=session_type,
            song_id=song_id,
            setlist_id=setlist_id,
            device_type=device_type,
            analytics_consent=analytics_consent,
            anonymous_data_only=anonymous_only
        )
        
        db.session.add(session)
        db.session.commit()
        
        logger.info(f"Started performance session {session.id} for user {user_id}")
        return session.id
    
    @staticmethod
    def record_performance_event(session_id: int, event_type: str, position_seconds: Optional[float] = None,
                                **event_data) -> bool:
        """
        Record a performance event during a session.
        
        Args:
            session_id: ID of the performance session
            event_type: Type of event ('pause', 'play', 'rewind', 'fast_forward', 'tempo_change', 'seek')
            position_seconds: Position in the content when event occurred
            **event_data: Additional event-specific data
            
        Returns:
            Success status
        """
        try:
            session = PerformanceSession.query.get(session_id)
            if not session:
                logger.warning(f"Session {session_id} not found for event recording")
                return False
            
            # Extract chord and section information if available
            chord_at_position = event_data.pop('chord_at_position', None)
            section_name = event_data.pop('section_name', None)
            
            event = PerformanceEvent(
                session_id=session_id,
                event_type=event_type,
                position_seconds=position_seconds,
                chord_at_position=chord_at_position,
                section_name=section_name,
                event_data=event_data
            )
            
            db.session.add(event)
            
            # Update session counters
            if event_type == 'pause':
                session.pause_count += 1
            elif event_type == 'rewind':
                session.rewind_count += 1
            elif event_type == 'fast_forward':
                session.fast_forward_count += 1
            elif event_type == 'tempo_change':
                session.tempo_changes += 1
            
            db.session.commit()
            
            # Trigger real-time analysis for problem detection
            EnhancedPerformanceAnalyticsService._analyze_for_problems(session_id, event)
            
            return True
            
        except Exception as e:
            logger.error(f"Error recording performance event: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def end_performance_session(session_id: int, completion_percentage: float = 100.0,
                               session_rating: Optional[int] = None,
                               difficulty_rating: Optional[int] = None) -> bool:
        """
        End a performance session and calculate final metrics.
        
        Args:
            session_id: ID of the performance session
            completion_percentage: How much of the content was completed (0-100)
            session_rating: User's self-rating of the session (1-5)
            difficulty_rating: User's difficulty rating (1-5)
            
        Returns:
            Success status
        """
        try:
            session = PerformanceSession.query.get(session_id)
            if not session:
                logger.warning(f"Session {session_id} not found for ending")
                return False
            
            session.end_session()
            session.completion_percentage = min(100.0, max(0.0, completion_percentage))
            session.session_rating = session_rating
            session.difficulty_rating = difficulty_rating
            
            # Calculate active duration (excluding long pauses)
            session.active_duration = EnhancedPerformanceAnalyticsService._calculate_active_duration(session_id)
            
            db.session.commit()
            
            # Trigger comprehensive analysis
            EnhancedPerformanceAnalyticsService._analyze_session_completion(session_id)
            
            logger.info(f"Ended performance session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error ending performance session: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def get_problem_sections(session_id: Optional[int] = None, song_id: Optional[int] = None,
                           user_id: Optional[int] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get identified problem sections with improvement suggestions.
        
        Args:
            session_id: Optional specific session
            song_id: Optional specific song
            user_id: Optional specific user
            limit: Maximum number of results
            
        Returns:
            List of problem sections with suggestions
        """
        query = ProblemSection.query
        
        if session_id:
            query = query.filter_by(session_id=session_id)
        if song_id:
            query = query.filter_by(song_id=song_id)
        if user_id:
            query = query.join(PerformanceSession).filter(PerformanceSession.user_id == user_id)
        
        problem_sections = query.order_by(desc(ProblemSection.severity_score)).limit(limit).all()
        
        return [ps.to_dict() for ps in problem_sections]
    
    @staticmethod
    def get_performance_insights(user_id: int, song_id: Optional[int] = None,
                               period_days: int = 30) -> Dict[str, Any]:
        """
        Get comprehensive performance insights and recommendations for a user.
        
        Args:
            user_id: ID of the user
            song_id: Optional specific song to analyze
            period_days: Number of days to analyze
            
        Returns:
            Dictionary containing insights and recommendations
        """
        end_date = datetime.now(UTC)
        start_date = end_date - timedelta(days=period_days)
        
        # Get user's sessions in the period
        query = PerformanceSession.query.filter(
            PerformanceSession.user_id == user_id,
            PerformanceSession.started_at >= start_date,
            PerformanceSession.started_at <= end_date
        )
        
        if song_id:
            query = query.filter_by(song_id=song_id)
        
        sessions = query.all()
        
        if not sessions:
            return {
                'total_sessions': 0,
                'message': 'No performance data available for this period'
            }
        
        # Calculate metrics
        total_sessions = len(sessions)
        total_practice_time = sum(s.total_duration or 0 for s in sessions)
        average_session_length = total_practice_time / total_sessions if total_sessions > 0 else 0
        
        completion_rates = [s.completion_percentage for s in sessions if s.completion_percentage is not None]
        average_completion = sum(completion_rates) / len(completion_rates) if completion_rates else 0
        
        # Analyze problem patterns
        all_problems = []
        for session in sessions:
            all_problems.extend(session.problem_sections)
        
        problem_types = Counter(ps.problem_type for ps in all_problems)
        
        # Generate AI recommendations
        recommendations = EnhancedPerformanceAnalyticsService._generate_ai_recommendations(
            sessions, all_problems, song_id
        )
        
        # Calculate improvement trends
        improvement_trends = EnhancedPerformanceAnalyticsService._calculate_improvement_trends(sessions)
        
        # Session comparison
        session_comparison = EnhancedPerformanceAnalyticsService._compare_sessions(sessions)
        
        return {
            'user_id': user_id,
            'song_id': song_id,
            'analysis_period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': period_days
            },
            'summary_metrics': {
                'total_sessions': total_sessions,
                'total_practice_time': total_practice_time,
                'average_session_length': round(average_session_length, 1),
                'average_completion_rate': round(average_completion, 1),
                'total_problem_sections': len(all_problems)
            },
            'problem_analysis': {
                'most_common_problems': dict(problem_types.most_common(5)),
                'problem_sections': [ps.to_dict() for ps in all_problems[:10]]
            },
            'ai_recommendations': recommendations,
            'improvement_trends': improvement_trends,
            'session_comparison': session_comparison,
            'generated_at': datetime.now(UTC).isoformat()
        }
    
    @staticmethod
    def get_anonymous_usage_analytics(time_period: str = 'weekly') -> Dict[str, Any]:
        """
        Get anonymous usage analytics for feature optimization.
        
        Args:
            time_period: Period to analyze ('daily', 'weekly', 'monthly')
            
        Returns:
            Anonymous analytics data
        """
        # Calculate date range based on period
        end_date = datetime.now(UTC)
        if time_period == 'daily':
            start_date = end_date - timedelta(days=1)
        elif time_period == 'weekly':
            start_date = end_date - timedelta(days=7)
        elif time_period == 'monthly':
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(days=7)
        
        # Get anonymous sessions only
        sessions = PerformanceSession.query.filter(
            PerformanceSession.started_at >= start_date,
            PerformanceSession.anonymous_data_only == True
        ).all()
        
        if not sessions:
            return {
                'time_period': time_period,
                'total_sessions': 0,
                'message': 'No anonymous data available for this period'
            }
        
        # Aggregate anonymous metrics
        device_types = Counter(s.device_type for s in sessions if s.device_type)
        session_types = Counter(s.session_type for s in sessions)
        
        # Calculate averages without user identification
        total_sessions = len(sessions)
        total_duration = sum(s.total_duration or 0 for s in sessions)
        average_duration = total_duration / total_sessions if total_sessions > 0 else 0
        
        # Problem analysis (anonymous)
        all_events = []
        for session in sessions:
            all_events.extend(session.events)
        
        event_types = Counter(e.event_type for e in all_events)
        
        # Feature usage analytics
        tempo_change_sessions = len([s for s in sessions if s.tempo_changes > 0])
        high_pause_sessions = len([s for s in sessions if s.pause_count > 5])
        
        return {
            'time_period': time_period,
            'analysis_period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'session_metrics': {
                'total_sessions': total_sessions,
                'average_duration_seconds': round(average_duration, 1),
                'device_distribution': dict(device_types),
                'session_type_distribution': dict(session_types)
            },
            'interaction_patterns': {
                'event_type_distribution': dict(event_types.most_common()),
                'tempo_adjustment_usage': round(tempo_change_sessions / total_sessions * 100, 1),
                'high_pause_rate_sessions': round(high_pause_sessions / total_sessions * 100, 1)
            },
            'feature_optimization_insights': EnhancedPerformanceAnalyticsService._generate_feature_insights(sessions),
            'generated_at': datetime.now(UTC).isoformat()
        }
    
    @staticmethod
    def _analyze_for_problems(session_id: int, event: PerformanceEvent):
        """Analyze events in real-time to identify problem sections."""
        if not event.position_seconds:
            return
        
        # Look for patterns that indicate problems
        recent_events = PerformanceEvent.query.filter(
            PerformanceEvent.session_id == session_id,
            PerformanceEvent.position_seconds.between(
                event.position_seconds - 30,  # 30 seconds before
                event.position_seconds + 30   # 30 seconds after
            )
        ).all()
        
        # Analyze patterns
        event_types = Counter(e.event_type for e in recent_events)
        
        # Identify problem patterns
        if event_types.get('pause', 0) >= 3:
            EnhancedPerformanceAnalyticsService._create_problem_section(
                session_id, event.position_seconds, 'frequent_pauses',
                severity=min(5.0, event_types['pause'] / 2.0)
            )
        
        if event_types.get('rewind', 0) >= 2:
            EnhancedPerformanceAnalyticsService._create_problem_section(
                session_id, event.position_seconds, 'multiple_rewinds',
                severity=min(5.0, event_types['rewind'])
            )
    
    @staticmethod
    def _create_problem_section(session_id: int, position: float, problem_type: str, severity: float = 1.0):
        """Create a problem section record."""
        session = PerformanceSession.query.get(session_id)
        if not session:
            return
        
        # Check if a similar problem already exists for this area
        existing = ProblemSection.query.filter(
            ProblemSection.session_id == session_id,
            ProblemSection.start_position <= position + 15,
            ProblemSection.end_position >= position - 15,
            ProblemSection.problem_type == problem_type
        ).first()
        
        if existing:
            # Update existing problem
            existing.severity_score = max(existing.severity_score, severity)
            existing.event_count += 1
        else:
            # Create new problem section
            start_pos = max(0, position - 10)
            end_pos = position + 10
            
            problem = ProblemSection(
                session_id=session_id,
                start_position=start_pos,
                end_position=end_pos,
                problem_type=problem_type,
                severity_score=severity,
                song_id=session.song_id
            )
            
            # Generate improvement suggestions
            problem.suggested_improvements = EnhancedPerformanceAnalyticsService._generate_section_improvements(
                problem_type, session.song_id, start_pos, end_pos
            )
            
            db.session.add(problem)
        
        db.session.commit()
    
    @staticmethod
    def _generate_section_improvements(problem_type: str, song_id: Optional[int], 
                                     start_pos: float, end_pos: float) -> List[str]:
        """Generate improvement suggestions for a problem section."""
        suggestions = []
        
        if problem_type == 'frequent_pauses':
            suggestions.extend([
                "Practice this section at a slower tempo first",
                "Break down complex chord changes into smaller parts",
                "Use a metronome to maintain steady timing",
                "Practice the section in loops until comfortable"
            ])
        elif problem_type == 'multiple_rewinds':
            suggestions.extend([
                "This section may need more focused practice",
                "Try practicing hands separately if applicable",
                "Identify the specific challenge (rhythm, chords, or transitions)",
                "Consider simplifying the arrangement initially"
            ])
        elif problem_type == 'tempo_struggles':
            suggestions.extend([
                "Start at 70% of the target tempo",
                "Use a metronome or click track",
                "Practice with emphasis on steady rhythm",
                "Gradually increase tempo as comfort improves"
            ])
        
        return suggestions
    
    @staticmethod
    def _calculate_active_duration(session_id: int) -> int:
        """Calculate active duration excluding long pauses."""
        events = PerformanceEvent.query.filter_by(session_id=session_id).order_by(PerformanceEvent.timestamp).all()
        
        if not events:
            return 0
        
        active_duration = 0
        last_pause_time = None
        
        for event in events:
            if event.event_type == 'pause':
                last_pause_time = event.timestamp
            elif event.event_type == 'play' and last_pause_time:
                # Calculate pause duration
                pause_duration = (event.timestamp - last_pause_time).total_seconds()
                # Only count pauses longer than 5 seconds as inactive
                if pause_duration > 5:
                    active_duration += pause_duration
                last_pause_time = None
        
        session = PerformanceSession.query.get(session_id)
        total_duration = session.total_duration or 0
        
        return max(0, total_duration - active_duration)
    
    @staticmethod
    def _analyze_session_completion(session_id: int):
        """Perform comprehensive analysis when a session is completed."""
        session = PerformanceSession.query.get(session_id)
        if not session:
            return
        
        # Generate overall session insights
        events = session.events
        problems = session.problem_sections
        
        # Create aggregated analytics record if user consents
        if session.analytics_consent and not session.anonymous_data_only:
            EnhancedPerformanceAnalyticsService._create_analytics_snapshot(session)
    
    @staticmethod
    def _create_analytics_snapshot(session: PerformanceSession):
        """Create an analytics snapshot for the completed session."""
        # Check for existing daily snapshot
        today = session.started_at.date()
        start_of_day = datetime.combine(today, datetime.min.time(), tzinfo=UTC)
        end_of_day = datetime.combine(today, datetime.max.time(), tzinfo=UTC)
        
        analytics = PerformanceAnalytics.query.filter(
            PerformanceAnalytics.user_id == session.user_id,
            PerformanceAnalytics.song_id == session.song_id,
            PerformanceAnalytics.analytics_period == 'daily',
            PerformanceAnalytics.period_start >= start_of_day,
            PerformanceAnalytics.period_end <= end_of_day
        ).first()
        
        if not analytics:
            analytics = PerformanceAnalytics(
                user_id=session.user_id,
                song_id=session.song_id,
                setlist_id=session.setlist_id,
                analytics_period='daily',
                period_start=start_of_day,
                period_end=end_of_day,
                is_anonymous=session.anonymous_data_only
            )
            db.session.add(analytics)
        
        # Update metrics
        analytics.total_sessions += 1
        analytics.total_practice_time += session.total_duration or 0
        analytics.average_session_length = analytics.total_practice_time / analytics.total_sessions
        
        # Update completion rate
        if session.completion_percentage is not None:
            current_total = (analytics.completion_rate * (analytics.total_sessions - 1) + 
                           session.completion_percentage)
            analytics.completion_rate = current_total / analytics.total_sessions
        
        db.session.commit()
    
    @staticmethod
    def _generate_ai_recommendations(sessions: List[PerformanceSession], 
                                   problems: List[ProblemSection], 
                                   song_id: Optional[int]) -> List[Dict[str, Any]]:
        """Generate AI-powered recommendations based on performance data."""
        recommendations = []
        
        if not sessions:
            return recommendations
        
        # Analyze completion rates
        completion_rates = [s.completion_percentage for s in sessions if s.completion_percentage is not None]
        avg_completion = sum(completion_rates) / len(completion_rates) if completion_rates else 100
        
        if avg_completion < 70:
            recommendations.append({
                'type': 'completion_improvement',
                'priority': 'high',
                'title': 'Focus on Complete Practice Sessions',
                'description': f'Your average completion rate is {avg_completion:.1f}%. Try setting shorter practice goals to build consistency.',
                'actionable_steps': [
                    'Set a timer for focused 15-20 minute sessions',
                    'Choose specific sections to master completely',
                    'Celebrate small wins to build momentum'
                ]
            })
        
        # Analyze problem patterns
        problem_types = Counter(p.problem_type for p in problems)
        
        if problem_types.get('frequent_pauses', 0) > len(sessions) * 2:
            recommendations.append({
                'type': 'pause_reduction',
                'priority': 'medium',
                'title': 'Reduce Practice Interruptions',
                'description': 'You pause frequently during practice. This might indicate sections that need more focused attention.',
                'actionable_steps': [
                    'Identify and isolate challenging sections',
                    'Practice difficult parts separately at slower tempo',
                    'Use loop practice for problematic areas'
                ]
            })
        
        # Analyze session consistency
        session_gaps = []
        sorted_sessions = sorted(sessions, key=lambda s: s.started_at)
        for i in range(1, len(sorted_sessions)):
            gap = (sorted_sessions[i].started_at - sorted_sessions[i-1].started_at).days
            session_gaps.append(gap)
        
        if session_gaps and statistics.mean(session_gaps) > 3:
            recommendations.append({
                'type': 'consistency_improvement',
                'priority': 'medium',
                'title': 'Improve Practice Consistency',
                'description': 'Regular practice sessions lead to better progress. Try to maintain shorter gaps between sessions.',
                'actionable_steps': [
                    'Schedule specific practice times',
                    'Set reminders for practice sessions',
                    'Start with shorter, more frequent sessions'
                ]
            })
        
        return recommendations
    
    @staticmethod
    def _calculate_improvement_trends(sessions: List[PerformanceSession]) -> Dict[str, Any]:
        """Calculate improvement trends over time."""
        if len(sessions) < 2:
            return {'insufficient_data': True}
        
        # Sort sessions chronologically
        sorted_sessions = sorted(sessions, key=lambda s: s.started_at)
        
        # Calculate trends
        completion_trend = []
        duration_trend = []
        problem_trend = []
        
        for session in sorted_sessions:
            completion_trend.append(session.completion_percentage or 0)
            duration_trend.append(session.total_duration or 0)
            problem_trend.append(len(session.problem_sections))
        
        # Calculate linear trends
        def calculate_trend(values):
            if len(values) < 2:
                return 0
            x = list(range(len(values)))
            n = len(values)
            sum_x = sum(x)
            sum_y = sum(values)
            sum_xy = sum(x[i] * values[i] for i in range(n))
            sum_x2 = sum(x[i] * x[i] for i in range(n))
            
            if n * sum_x2 - sum_x * sum_x == 0:
                return 0
            
            slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
            return slope
        
        return {
            'completion_trend': calculate_trend(completion_trend),
            'duration_trend': calculate_trend(duration_trend),
            'problem_reduction_trend': -calculate_trend(problem_trend),  # Negative because fewer problems is better
            'total_sessions_analyzed': len(sessions),
            'trend_interpretation': {
                'completion': 'improving' if calculate_trend(completion_trend) > 0.5 else 'stable' if calculate_trend(completion_trend) > -0.5 else 'declining',
                'consistency': 'improving' if abs(calculate_trend(duration_trend)) < 10 else 'variable',
                'problems': 'reducing' if calculate_trend(problem_trend) < -0.1 else 'stable' if calculate_trend(problem_trend) < 0.1 else 'increasing'
            }
        }
    
    @staticmethod
    def _compare_sessions(sessions: List[PerformanceSession]) -> Dict[str, Any]:
        """Compare sessions to identify patterns and improvements."""
        if len(sessions) < 2:
            return {'insufficient_data_for_comparison': True}
        
        recent_sessions = sessions[-5:]  # Last 5 sessions
        earlier_sessions = sessions[:-5] if len(sessions) > 5 else []
        
        if not earlier_sessions:
            return {'insufficient_historical_data': True}
        
        # Compare metrics
        recent_avg_completion = sum(s.completion_percentage or 0 for s in recent_sessions) / len(recent_sessions)
        earlier_avg_completion = sum(s.completion_percentage or 0 for s in earlier_sessions) / len(earlier_sessions)
        
        recent_avg_duration = sum(s.total_duration or 0 for s in recent_sessions) / len(recent_sessions)
        earlier_avg_duration = sum(s.total_duration or 0 for s in earlier_sessions) / len(earlier_sessions)
        
        recent_avg_problems = sum(len(s.problem_sections) for s in recent_sessions) / len(recent_sessions)
        earlier_avg_problems = sum(len(s.problem_sections) for s in earlier_sessions) / len(earlier_sessions)
        
        return {
            'comparison_periods': {
                'recent_sessions': len(recent_sessions),
                'earlier_sessions': len(earlier_sessions)
            },
            'completion_rate_change': recent_avg_completion - earlier_avg_completion,
            'average_duration_change': recent_avg_duration - earlier_avg_duration,
            'problem_count_change': recent_avg_problems - earlier_avg_problems,
            'improvement_summary': {
                'completion_improved': recent_avg_completion > earlier_avg_completion,
                'duration_more_consistent': abs(recent_avg_duration - earlier_avg_duration) < 300,  # Within 5 minutes
                'fewer_problems': recent_avg_problems < earlier_avg_problems
            }
        }
    
    @staticmethod
    def _generate_feature_insights(sessions: List[PerformanceSession]) -> List[Dict[str, Any]]:
        """Generate insights for feature optimization from anonymous data."""
        insights = []
        
        # Tempo adjustment usage
        tempo_users = len([s for s in sessions if s.tempo_changes > 0])
        if tempo_users > 0:
            avg_tempo_changes = sum(s.tempo_changes for s in sessions if s.tempo_changes > 0) / tempo_users
            insights.append({
                'feature': 'tempo_adjustment',
                'usage_rate': round(tempo_users / len(sessions) * 100, 1),
                'average_adjustments_per_session': round(avg_tempo_changes, 1),
                'insight': 'Users who adjust tempo tend to have longer practice sessions',
                'optimization_suggestion': 'Consider adding tempo presets for common use cases'
            })
        
        # Pause patterns
        high_pause_users = len([s for s in sessions if s.pause_count > 5])
        if high_pause_users > 0:
            insights.append({
                'feature': 'pause_functionality',
                'high_usage_rate': round(high_pause_users / len(sessions) * 100, 1),
                'insight': 'Some users pause frequently, indicating need for better practice flow',
                'optimization_suggestion': 'Add quick resume features or section markers'
            })
        
        # Device-specific insights
        device_completion = defaultdict(list)
        for session in sessions:
            if session.device_type and session.completion_percentage is not None:
                device_completion[session.device_type].append(session.completion_percentage)
        
        for device, completions in device_completion.items():
            if len(completions) > 10:  # Only report if significant sample size
                avg_completion = sum(completions) / len(completions)
                insights.append({
                    'feature': f'{device}_experience',
                    'average_completion_rate': round(avg_completion, 1),
                    'sample_size': len(completions),
                    'insight': f'{device.title()} users show {"strong" if avg_completion > 80 else "moderate" if avg_completion > 60 else "weak"} completion rates',
                    'optimization_suggestion': 'Consider device-specific UI improvements' if avg_completion < 70 else 'Current experience is working well'
                })
        
        return insights