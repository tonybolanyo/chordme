"""
Performance Analytics Service

Provides analytics and insights for setlist performance including:
- Timing analysis and duration predictions
- Song performance history and analytics  
- Audience engagement tracking
- Setlist optimization recommendations
- Popular songs and trending analysis
- Performance comparison across different setlists
"""

from sqlalchemy import func, desc, and_, or_
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import logging
from typing import Dict, List, Any, Optional, Tuple
import json

from .models import (
    db, Setlist, SetlistSong, SetlistPerformance, 
    SetlistPerformanceSong, Song, User
)

logger = logging.getLogger(__name__)


class PerformanceAnalyticsService:
    """Service for performance analytics and insights."""
    
    @staticmethod
    def get_setlist_analytics(setlist_id: int, user_id: int) -> Dict[str, Any]:
        """
        Get comprehensive analytics for a specific setlist.
        
        Args:
            setlist_id: ID of the setlist
            user_id: ID of the requesting user (for permission checks)
            
        Returns:
            Dictionary containing analytics data
        """
        # Verify user has access to this setlist
        setlist = Setlist.query.get_or_404(setlist_id)
        if not setlist.can_user_access(user_id):
            raise PermissionError("User does not have access to this setlist")
        
        # Get all performances for this setlist
        performances = SetlistPerformance.query.filter_by(
            setlist_id=setlist_id
        ).order_by(SetlistPerformance.performance_date.desc()).all()
        
        if not performances:
            return {
                'setlist_id': setlist_id,
                'total_performances': 0,
                'message': 'No performance data available'
            }
        
        # Calculate basic metrics
        total_performances = len(performances)
        ratings = [p.overall_rating for p in performances if p.overall_rating]
        average_rating = sum(ratings) / len(ratings) if ratings else None
        
        durations = [p.total_duration for p in performances if p.total_duration]
        average_duration = sum(durations) / len(durations) if durations else None
        
        # Get most performed songs
        most_performed_songs = PerformanceAnalyticsService._get_most_performed_songs(
            setlist_id, limit=10
        )
        
        # Get performance trends
        performance_trends = PerformanceAnalyticsService._get_performance_trends(
            performances
        )
        
        # Get audience feedback distribution
        audience_feedback = PerformanceAnalyticsService._get_audience_feedback_distribution(
            performances
        )
        
        # Get timing analysis
        timing_analysis = PerformanceAnalyticsService._get_timing_analysis(setlist_id)
        
        return {
            'setlist_id': setlist_id,
            'setlist_name': setlist.name,
            'total_performances': total_performances,
            'average_rating': round(average_rating, 1) if average_rating else None,
            'average_duration': round(average_duration) if average_duration else None,
            'most_performed_songs': most_performed_songs,
            'performance_trends': performance_trends,
            'audience_feedback': audience_feedback,
            'timing_analysis': timing_analysis,
            'last_performed': performances[0].performance_date.isoformat() if performances else None,
            'generated_at': datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def get_song_analytics(song_id: int, user_id: int) -> Dict[str, Any]:
        """
        Get performance analytics for a specific song.
        
        Args:
            song_id: ID of the song
            user_id: ID of the requesting user
            
        Returns:
            Dictionary containing song analytics
        """
        # Get song and verify access
        song = Song.query.get_or_404(song_id)
        if not song.can_user_access(user_id):
            raise PermissionError("User does not have access to this song")
        
        # Get all performance records for this song
        performance_records = db.session.query(SetlistPerformanceSong).join(
            SetlistSong, SetlistPerformanceSong.setlist_song_id == SetlistSong.id
        ).join(
            SetlistPerformance, SetlistPerformanceSong.performance_id == SetlistPerformance.id
        ).filter(
            SetlistSong.song_id == song_id
        ).order_by(SetlistPerformance.performance_date.desc()).all()
        
        if not performance_records:
            return {
                'song_id': song_id,
                'song_title': song.title,
                'total_performances': 0,
                'message': 'No performance data available'
            }
        
        # Calculate performance statistics
        total_performances = len(performance_records)
        ratings = [r.performance_rating for r in performance_records if r.performance_rating]
        average_rating = sum(ratings) / len(ratings) if ratings else None
        
        durations = [r.actual_duration for r in performance_records if r.actual_duration]
        average_duration = sum(durations) / len(durations) if durations else None
        
        # Get key and tempo statistics
        keys_used = [r.actual_key for r in performance_records if r.actual_key]
        key_distribution = dict(Counter(keys_used))
        
        tempos = [r.actual_tempo for r in performance_records if r.actual_tempo]
        average_tempo = sum(tempos) / len(tempos) if tempos else None
        
        # Get audience response distribution
        responses = [r.audience_response for r in performance_records if r.audience_response]
        response_distribution = dict(Counter(responses))
        
        # Performance trend over time
        performance_trend = PerformanceAnalyticsService._get_song_performance_trend(
            performance_records
        )
        
        return {
            'song_id': song_id,
            'song_title': song.title,
            'song_artist': song.artist,
            'total_performances': total_performances,
            'average_rating': round(average_rating, 1) if average_rating else None,
            'average_duration': round(average_duration) if average_duration else None,
            'average_tempo': round(average_tempo) if average_tempo else None,
            'key_distribution': key_distribution,
            'response_distribution': response_distribution,
            'performance_trend': performance_trend,
            'generated_at': datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def get_recommendations(user_id: int, limit: int = 10) -> Dict[str, Any]:
        """
        Get setlist optimization recommendations based on historical data.
        
        Args:
            user_id: ID of the user requesting recommendations
            limit: Maximum number of recommendations to return
            
        Returns:
            Dictionary containing recommendations
        """
        # Get user's setlists and performances
        user_setlists = Setlist.query.filter_by(user_id=user_id).all()
        
        if not user_setlists:
            return {
                'recommendations': [],
                'message': 'No setlist data available for recommendations'
            }
        
        # Analyze performance patterns
        high_performing_songs = PerformanceAnalyticsService._get_high_performing_songs(
            user_id, limit=limit
        )
        
        optimal_durations = PerformanceAnalyticsService._get_optimal_durations(user_id)
        
        trending_combinations = PerformanceAnalyticsService._get_trending_song_combinations(
            user_id, limit=5
        )
        
        timing_recommendations = PerformanceAnalyticsService._get_timing_recommendations(
            user_id
        )
        
        return {
            'high_performing_songs': high_performing_songs,
            'optimal_durations': optimal_durations,
            'trending_combinations': trending_combinations,
            'timing_recommendations': timing_recommendations,
            'generated_at': datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def get_popular_songs(user_id: int = None, timeframe: str = '30d', limit: int = 20) -> Dict[str, Any]:
        """
        Get popular songs and trending analysis.
        
        Args:
            user_id: Optional user ID to filter to user's accessible songs
            timeframe: Time period ('7d', '30d', '90d', '1y', 'all')
            limit: Maximum number of songs to return
            
        Returns:
            Dictionary containing popular songs data
        """
        # Calculate date filter based on timeframe
        date_filter = None
        if timeframe == '7d':
            date_filter = datetime.utcnow() - timedelta(days=7)
        elif timeframe == '30d':
            date_filter = datetime.utcnow() - timedelta(days=30)
        elif timeframe == '90d':
            date_filter = datetime.utcnow() - timedelta(days=90)
        elif timeframe == '1y':
            date_filter = datetime.utcnow() - timedelta(days=365)
        
        # Build query for song performance counts
        query = db.session.query(
            Song.id,
            Song.title,
            Song.artist,
            func.count(SetlistPerformanceSong.id).label('performance_count'),
            func.avg(SetlistPerformanceSong.performance_rating).label('avg_rating'),
            func.avg(SetlistPerformanceSong.actual_duration).label('avg_duration')
        ).join(
            SetlistSong, Song.id == SetlistSong.song_id
        ).join(
            SetlistPerformanceSong, SetlistSong.id == SetlistPerformanceSong.setlist_song_id
        ).join(
            SetlistPerformance, SetlistPerformanceSong.performance_id == SetlistPerformance.id
        )
        
        # Apply date filter if specified
        if date_filter:
            query = query.filter(SetlistPerformance.performance_date >= date_filter)
        
        # Apply user filter if specified
        if user_id:
            # Filter to songs user can access (owned by user or public/shared)
            query = query.filter(
                or_(
                    Song.user_id == user_id,
                    Song.share_settings == 'public',
                    Song.shared_with.contains([user_id])
                )
            )
        
        # Group and order by performance count
        popular_songs = query.group_by(
            Song.id, Song.title, Song.artist
        ).order_by(
            desc('performance_count')
        ).limit(limit).all()
        
        # Format results
        songs_data = []
        for song in popular_songs:
            songs_data.append({
                'song_id': song.id,
                'title': song.title,
                'artist': song.artist,
                'performance_count': song.performance_count,
                'average_rating': round(float(song.avg_rating), 1) if song.avg_rating else None,
                'average_duration': round(float(song.avg_duration)) if song.avg_duration else None
            })
        
        # Get trending data (songs with increasing performance frequency)
        trending_songs = PerformanceAnalyticsService._get_trending_songs(
            user_id, timeframe, limit=10
        )
        
        return {
            'timeframe': timeframe,
            'popular_songs': songs_data,
            'trending_songs': trending_songs,
            'total_songs': len(songs_data),
            'generated_at': datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def compare_setlists(setlist_ids: List[int], user_id: int) -> Dict[str, Any]:
        """
        Compare performance metrics across different setlists.
        
        Args:
            setlist_ids: List of setlist IDs to compare
            user_id: ID of the requesting user
            
        Returns:
            Dictionary containing comparison data
        """
        if len(setlist_ids) < 2:
            raise ValueError("At least 2 setlists required for comparison")
        
        # Verify user access to all setlists
        setlists = []
        for setlist_id in setlist_ids:
            setlist = Setlist.query.get_or_404(setlist_id)
            if not setlist.can_user_access(user_id):
                raise PermissionError(f"User does not have access to setlist {setlist_id}")
            setlists.append(setlist)
        
        # Get performance data for each setlist
        comparison_data = []
        for setlist in setlists:
            performances = SetlistPerformance.query.filter_by(
                setlist_id=setlist.id
            ).all()
            
            if performances:
                ratings = [p.overall_rating for p in performances if p.overall_rating]
                durations = [p.total_duration for p in performances if p.total_duration]
                
                setlist_data = {
                    'setlist_id': setlist.id,
                    'name': setlist.name,
                    'total_performances': len(performances),
                    'average_rating': round(sum(ratings) / len(ratings), 1) if ratings else None,
                    'average_duration': round(sum(durations) / len(durations)) if durations else None,
                    'songs_count': len(setlist.setlist_songs),
                    'last_performed': max(p.performance_date for p in performances).isoformat()
                }
            else:
                setlist_data = {
                    'setlist_id': setlist.id,
                    'name': setlist.name,
                    'total_performances': 0,
                    'average_rating': None,
                    'average_duration': None,
                    'songs_count': len(setlist.setlist_songs),
                    'last_performed': None
                }
            
            comparison_data.append(setlist_data)
        
        # Calculate comparison insights
        insights = PerformanceAnalyticsService._generate_comparison_insights(comparison_data)
        
        return {
            'setlists': comparison_data,
            'insights': insights,
            'generated_at': datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def export_analytics_data(user_id: int, export_type: str = 'comprehensive', 
                            format: str = 'json') -> Dict[str, Any]:
        """
        Export analytics data in various formats.
        
        Args:
            user_id: ID of the user requesting export
            export_type: Type of export ('comprehensive', 'performances', 'songs', 'trends')
            format: Export format ('json', 'csv')
            
        Returns:
            Dictionary containing export data
        """
        export_data = {
            'export_type': export_type,
            'format': format,
            'user_id': user_id,
            'generated_at': datetime.utcnow().isoformat(),
            'data': {}
        }
        
        if export_type in ['comprehensive', 'performances']:
            # Export performance data
            performances_data = PerformanceAnalyticsService._export_performances_data(user_id)
            export_data['data']['performances'] = performances_data
        
        if export_type in ['comprehensive', 'songs']:
            # Export song analytics
            songs_data = PerformanceAnalyticsService._export_songs_data(user_id)
            export_data['data']['songs'] = songs_data
        
        if export_type in ['comprehensive', 'trends']:
            # Export trend data
            trends_data = PerformanceAnalyticsService._export_trends_data(user_id)
            export_data['data']['trends'] = trends_data
        
        return export_data
    
    # Helper methods
    
    @staticmethod
    def _get_most_performed_songs(setlist_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Get most performed songs for a setlist."""
        query = db.session.query(
            Song.id,
            Song.title,
            Song.artist,
            func.count(SetlistPerformanceSong.id).label('performance_count'),
            func.avg(SetlistPerformanceSong.performance_rating).label('avg_rating')
        ).join(
            SetlistSong, Song.id == SetlistSong.song_id
        ).join(
            SetlistPerformanceSong, SetlistSong.id == SetlistPerformanceSong.setlist_song_id
        ).filter(
            SetlistSong.setlist_id == setlist_id,
            SetlistPerformanceSong.was_performed == True
        ).group_by(
            Song.id, Song.title, Song.artist
        ).order_by(
            desc('performance_count')
        ).limit(limit).all()
        
        return [
            {
                'song_id': song.id,
                'song_title': song.title,
                'artist': song.artist,
                'performance_count': song.performance_count,
                'average_rating': round(float(song.avg_rating), 1) if song.avg_rating else None
            }
            for song in query
        ]
    
    @staticmethod
    def _get_performance_trends(performances: List[SetlistPerformance]) -> Dict[str, Any]:
        """Calculate performance trends over time."""
        if not performances:
            return {}
        
        # Group by month
        monthly_data = defaultdict(lambda: {'performances': 0, 'ratings': [], 'durations': []})
        
        for performance in performances:
            month_key = performance.performance_date.strftime('%Y-%m')
            monthly_data[month_key]['performances'] += 1
            if performance.overall_rating:
                monthly_data[month_key]['ratings'].append(performance.overall_rating)
            if performance.total_duration:
                monthly_data[month_key]['durations'].append(performance.total_duration)
        
        # Convert to list format
        by_month = []
        for month, data in sorted(monthly_data.items()):
            avg_rating = sum(data['ratings']) / len(data['ratings']) if data['ratings'] else None
            avg_duration = sum(data['durations']) / len(data['durations']) if data['durations'] else None
            
            by_month.append({
                'month': month,
                'performances': data['performances'],
                'average_rating': round(avg_rating, 1) if avg_rating else None,
                'average_duration': round(avg_duration) if avg_duration else None
            })
        
        return {'by_month': by_month}
    
    @staticmethod
    def _get_audience_feedback_distribution(performances: List[SetlistPerformance]) -> Dict[str, int]:
        """Get distribution of audience engagement levels."""
        feedback_counts = defaultdict(int)
        
        for performance in performances:
            if performance.audience_engagement:
                feedback_counts[performance.audience_engagement] += 1
        
        return dict(feedback_counts)
    
    @staticmethod
    def _get_timing_analysis(setlist_id: int) -> Dict[str, Any]:
        """Analyze timing patterns for a setlist."""
        setlist_songs = SetlistSong.query.filter_by(setlist_id=setlist_id).all()
        
        if not setlist_songs:
            return {}
        
        # Calculate estimated vs actual duration statistics
        estimated_durations = [s.estimated_duration for s in setlist_songs if s.estimated_duration]
        actual_durations = [s.actual_duration for s in setlist_songs if s.actual_duration]
        
        analysis = {
            'total_songs': len(setlist_songs),
            'estimated_total_duration': sum(estimated_durations) if estimated_durations else None,
            'average_estimated_duration': round(sum(estimated_durations) / len(estimated_durations)) if estimated_durations else None,
            'average_actual_duration': round(sum(actual_durations) / len(actual_durations)) if actual_durations else None
        }
        
        # Prediction accuracy if we have both estimated and actual
        if estimated_durations and actual_durations and len(estimated_durations) == len(actual_durations):
            differences = [abs(est - act) for est, act in zip(estimated_durations, actual_durations)]
            analysis['prediction_accuracy'] = {
                'average_difference': round(sum(differences) / len(differences)),
                'accuracy_percentage': round(100 - (sum(differences) / sum(estimated_durations)) * 100, 1)
            }
        
        return analysis
    
    @staticmethod
    def _get_song_performance_trend(performance_records: List[SetlistPerformanceSong]) -> List[Dict[str, Any]]:
        """Get performance trend for a specific song over time."""
        # Group by month and calculate averages
        monthly_data = defaultdict(lambda: {'ratings': [], 'durations': []})
        
        for record in performance_records:
            # Get performance date from related performance
            performance = SetlistPerformance.query.get(record.performance_id)
            if performance:
                month_key = performance.performance_date.strftime('%Y-%m')
                if record.performance_rating:
                    monthly_data[month_key]['ratings'].append(record.performance_rating)
                if record.actual_duration:
                    monthly_data[month_key]['durations'].append(record.actual_duration)
        
        trend_data = []
        for month, data in sorted(monthly_data.items()):
            avg_rating = sum(data['ratings']) / len(data['ratings']) if data['ratings'] else None
            avg_duration = sum(data['durations']) / len(data['durations']) if data['durations'] else None
            
            trend_data.append({
                'month': month,
                'average_rating': round(avg_rating, 1) if avg_rating else None,
                'average_duration': round(avg_duration) if avg_duration else None,
                'performance_count': len(data['ratings']) if data['ratings'] else len(data['durations'])
            })
        
        return trend_data
    
    @staticmethod
    def _get_high_performing_songs(user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Get songs with consistently high performance ratings."""
        query = db.session.query(
            Song.id,
            Song.title,
            Song.artist,
            func.count(SetlistPerformanceSong.id).label('performance_count'),
            func.avg(SetlistPerformanceSong.performance_rating).label('avg_rating')
        ).join(
            SetlistSong, Song.id == SetlistSong.song_id
        ).join(
            Setlist, SetlistSong.setlist_id == Setlist.id
        ).join(
            SetlistPerformanceSong, SetlistSong.id == SetlistPerformanceSong.setlist_song_id
        ).filter(
            Setlist.user_id == user_id,
            SetlistPerformanceSong.performance_rating.isnot(None)
        ).group_by(
            Song.id, Song.title, Song.artist
        ).having(
            func.count(SetlistPerformanceSong.id) >= 3,  # At least 3 performances
            func.avg(SetlistPerformanceSong.performance_rating) >= 4.0  # High rating
        ).order_by(
            desc('avg_rating')
        ).limit(limit).all()
        
        return [
            {
                'song_id': song.id,
                'title': song.title,
                'artist': song.artist,
                'performance_count': song.performance_count,
                'average_rating': round(float(song.avg_rating), 1)
            }
            for song in query
        ]
    
    @staticmethod
    def _get_optimal_durations(user_id: int) -> Dict[str, Any]:
        """Calculate optimal setlist durations based on performance data."""
        performances = db.session.query(SetlistPerformance).join(
            Setlist, SetlistPerformance.setlist_id == Setlist.id
        ).filter(
            Setlist.user_id == user_id,
            SetlistPerformance.total_duration.isnot(None),
            SetlistPerformance.overall_rating.isnot(None)
        ).all()
        
        if not performances:
            return {}
        
        # Group by duration ranges and calculate average ratings
        duration_ranges = {
            '30-45': (30, 45),
            '45-60': (45, 60),
            '60-90': (60, 90),
            '90-120': (90, 120),
            '120+': (120, float('inf'))
        }
        
        range_data = {}
        for range_name, (min_dur, max_dur) in duration_ranges.items():
            range_performances = [
                p for p in performances 
                if min_dur <= p.total_duration < max_dur
            ]
            
            if range_performances:
                avg_rating = sum(p.overall_rating for p in range_performances) / len(range_performances)
                range_data[range_name] = {
                    'performance_count': len(range_performances),
                    'average_rating': round(avg_rating, 1),
                    'duration_range': f"{min_dur}-{max_dur if max_dur != float('inf') else '120+'}"
                }
        
        # Find optimal range
        optimal_range = max(range_data.items(), key=lambda x: x[1]['average_rating']) if range_data else None
        
        return {
            'duration_analysis': range_data,
            'optimal_range': optimal_range[0] if optimal_range else None,
            'recommendation': f"Aim for {optimal_range[0]} minute setlists for best performance" if optimal_range else None
        }
    
    @staticmethod
    def _get_trending_song_combinations(user_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """Get trending song combinations that work well together."""
        # This is a simplified implementation - could be enhanced with more sophisticated analysis
        recent_performances = db.session.query(SetlistPerformance).join(
            Setlist, SetlistPerformance.setlist_id == Setlist.id
        ).filter(
            Setlist.user_id == user_id,
            SetlistPerformance.performance_date >= datetime.utcnow() - timedelta(days=90),
            SetlistPerformance.overall_rating >= 4
        ).all()
        
        # For now, return high-rated recent setlists as "trending combinations"
        combinations = []
        for performance in recent_performances[:limit]:
            setlist = Setlist.query.get(performance.setlist_id)
            if setlist:
                songs = [song.song.title for song in setlist.setlist_songs[:3]]  # First 3 songs
                combinations.append({
                    'setlist_name': setlist.name,
                    'songs': songs,
                    'rating': performance.overall_rating,
                    'date': performance.performance_date.isoformat()
                })
        
        return combinations
    
    @staticmethod
    def _get_timing_recommendations(user_id: int) -> Dict[str, Any]:
        """Get timing-based recommendations."""
        # Analyze timing patterns from user's performances
        performances = db.session.query(SetlistPerformance).join(
            Setlist, SetlistPerformance.setlist_id == Setlist.id
        ).filter(
            Setlist.user_id == user_id,
            SetlistPerformance.total_duration.isnot(None)
        ).all()
        
        if not performances:
            return {}
        
        durations = [p.total_duration for p in performances]
        avg_duration = sum(durations) / len(durations)
        
        return {
            'average_performance_duration': round(avg_duration),
            'recommended_preparation_time': round(avg_duration * 0.5),  # 50% of performance time
            'recommended_break_frequency': 'Every 20-25 minutes' if avg_duration > 60 else 'Optional',
            'optimal_song_count': round(avg_duration / 4)  # Assume ~4 minutes per song average
        }
    
    @staticmethod
    def _get_trending_songs(user_id: int = None, timeframe: str = '30d', limit: int = 10) -> List[Dict[str, Any]]:
        """Get songs with increasing performance frequency (trending)."""
        # Calculate two time periods for comparison
        if timeframe == '30d':
            recent_start = datetime.utcnow() - timedelta(days=30)
            previous_start = datetime.utcnow() - timedelta(days=60)
        elif timeframe == '7d':
            recent_start = datetime.utcnow() - timedelta(days=7)
            previous_start = datetime.utcnow() - timedelta(days=14)
        else:
            recent_start = datetime.utcnow() - timedelta(days=30)
            previous_start = datetime.utcnow() - timedelta(days=60)
        
        # Get song performance counts for recent and previous periods
        # This is a simplified implementation - could be enhanced with more sophisticated trending analysis
        recent_query = db.session.query(
            Song.id,
            Song.title,
            Song.artist,
            func.count(SetlistPerformanceSong.id).label('recent_count')
        ).join(
            SetlistSong, Song.id == SetlistSong.song_id
        ).join(
            SetlistPerformanceSong, SetlistSong.id == SetlistPerformanceSong.setlist_song_id
        ).join(
            SetlistPerformance, SetlistPerformanceSong.performance_id == SetlistPerformance.id
        ).filter(
            SetlistPerformance.performance_date >= recent_start
        )
        
        if user_id:
            recent_query = recent_query.join(
                Setlist, SetlistSong.setlist_id == Setlist.id
            ).filter(Setlist.user_id == user_id)
        
        recent_songs = recent_query.group_by(
            Song.id, Song.title, Song.artist
        ).having(
            func.count(SetlistPerformanceSong.id) >= 2  # At least 2 recent performances
        ).order_by(
            desc('recent_count')
        ).limit(limit).all()
        
        return [
            {
                'song_id': song.id,
                'title': song.title,
                'artist': song.artist,
                'recent_performances': song.recent_count,
                'trend_status': 'trending'
            }
            for song in recent_songs
        ]
    
    @staticmethod
    def _generate_comparison_insights(comparison_data: List[Dict[str, Any]]) -> List[str]:
        """Generate insights from setlist comparison data."""
        insights = []
        
        # Find best performing setlist
        rated_setlists = [s for s in comparison_data if s['average_rating'] is not None]
        if rated_setlists:
            best_setlist = max(rated_setlists, key=lambda x: x['average_rating'])
            insights.append(f"{best_setlist['name']} has the highest average rating ({best_setlist['average_rating']})")
        
        # Duration insights
        duration_setlists = [s for s in comparison_data if s['average_duration'] is not None]
        if duration_setlists:
            longest = max(duration_setlists, key=lambda x: x['average_duration'])
            shortest = min(duration_setlists, key=lambda x: x['average_duration'])
            insights.append(f"Duration range: {shortest['average_duration']}-{longest['average_duration']} minutes")
        
        # Performance frequency insights
        most_performed = max(comparison_data, key=lambda x: x['total_performances'])
        if most_performed['total_performances'] > 0:
            insights.append(f"{most_performed['name']} has been performed most frequently ({most_performed['total_performances']} times)")
        
        return insights
    
    @staticmethod
    def _export_performances_data(user_id: int) -> List[Dict[str, Any]]:
        """Export user's performance data."""
        performances = db.session.query(SetlistPerformance).join(
            Setlist, SetlistPerformance.setlist_id == Setlist.id
        ).filter(
            Setlist.user_id == user_id
        ).order_by(
            SetlistPerformance.performance_date.desc()
        ).all()
        
        return [performance.to_dict(include_songs=True) for performance in performances]
    
    @staticmethod
    def _export_songs_data(user_id: int) -> List[Dict[str, Any]]:
        """Export user's song analytics data."""
        # Get all songs the user has access to
        songs = Song.query.filter(
            or_(
                Song.user_id == user_id,
                Song.share_settings == 'public',
                Song.shared_with.contains([user_id])
            )
        ).all()
        
        songs_data = []
        for song in songs:
            song_analytics = PerformanceAnalyticsService.get_song_analytics(song.id, user_id)
            songs_data.append(song_analytics)
        
        return songs_data
    
    @staticmethod
    def _export_trends_data(user_id: int) -> Dict[str, Any]:
        """Export user's trends data."""
        return {
            'popular_songs': PerformanceAnalyticsService.get_popular_songs(user_id, '90d'),
            'recommendations': PerformanceAnalyticsService.get_recommendations(user_id)
        }