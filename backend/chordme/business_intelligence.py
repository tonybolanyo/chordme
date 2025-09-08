"""
Business Intelligence and Reporting Service

Provides comprehensive BI capabilities including:
- Automated report generation with scheduling
- Custom report builder backend
- Student progress tracking for music educators
- Band collaboration effectiveness metrics
- Usage pattern analysis and optimization recommendations
- Comparative analysis and time-series reporting
- External BI tool integration
"""

import json
import logging
from datetime import datetime, timedelta, UTC
from typing import Dict, List, Any, Optional, Union
from collections import defaultdict
from sqlalchemy import func, desc, and_, or_, text
from sqlalchemy.orm import joinedload
from dataclasses import dataclass
from enum import Enum
import calendar

from .models import (
    db, User, Song, Setlist, SetlistSong, SetlistPerformance,
    PerformanceSession, PerformanceEvent, ProblemSection, PerformanceAnalytics
)

logger = logging.getLogger(__name__)


class ReportType(Enum):
    """Available report types."""
    STUDENT_PROGRESS = "student_progress"
    BAND_COLLABORATION = "band_collaboration"
    USAGE_PATTERNS = "usage_patterns"
    PERFORMANCE_TRENDS = "performance_trends"
    COMPARATIVE_ANALYSIS = "comparative_analysis"
    CUSTOM = "custom"


class ReportPeriod(Enum):
    """Report time periods."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    CUSTOM = "custom"


@dataclass
class ReportConfig:
    """Configuration for report generation."""
    report_type: ReportType
    period: ReportPeriod
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    user_ids: Optional[List[int]] = None
    organization_id: Optional[int] = None
    include_detailed_breakdown: bool = True
    include_recommendations: bool = True
    format: str = "json"  # json, pdf, csv
    delivery_method: str = "api"  # api, email, webhook


class BusinessIntelligenceService:
    """Main service for business intelligence and reporting."""

    @staticmethod
    def generate_report(config: ReportConfig, requesting_user_id: int) -> Dict[str, Any]:
        """
        Generate a comprehensive report based on configuration.
        
        Args:
            config: Report configuration
            requesting_user_id: ID of user requesting the report
            
        Returns:
            Generated report data
        """
        # Determine date range
        start_date, end_date = BusinessIntelligenceService._get_date_range(
            config.period, config.start_date, config.end_date
        )
        
        # Generate base report structure
        report = {
            "report_id": f"{config.report_type.value}_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}",
            "generated_at": datetime.now(UTC).isoformat(),
            "generated_by": requesting_user_id,
            "config": {
                "type": config.report_type.value,
                "period": config.period.value,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "format": config.format
            },
            "summary": {},
            "data": {},
            "insights": [],
            "recommendations": []
        }
        
        # Generate report based on type
        if config.report_type == ReportType.STUDENT_PROGRESS:
            report["data"] = BusinessIntelligenceService._generate_student_progress_report(
                start_date, end_date, config.user_ids, requesting_user_id
            )
        elif config.report_type == ReportType.BAND_COLLABORATION:
            report["data"] = BusinessIntelligenceService._generate_collaboration_report(
                start_date, end_date, config.organization_id, requesting_user_id
            )
        elif config.report_type == ReportType.USAGE_PATTERNS:
            report["data"] = BusinessIntelligenceService._generate_usage_patterns_report(
                start_date, end_date, config.user_ids
            )
        elif config.report_type == ReportType.PERFORMANCE_TRENDS:
            report["data"] = BusinessIntelligenceService._generate_performance_trends_report(
                start_date, end_date, config.user_ids
            )
        elif config.report_type == ReportType.COMPARATIVE_ANALYSIS:
            report["data"] = BusinessIntelligenceService._generate_comparative_analysis_report(
                start_date, end_date, config.user_ids
            )
        
        # Generate insights and recommendations if requested
        if config.include_recommendations:
            report["insights"] = BusinessIntelligenceService._generate_insights(
                report["data"], config.report_type
            )
            report["recommendations"] = BusinessIntelligenceService._generate_recommendations(
                report["data"], config.report_type
            )
        
        # Generate summary
        report["summary"] = BusinessIntelligenceService._generate_summary(
            report["data"], config.report_type
        )
        
        return report

    @staticmethod
    def _get_date_range(period: ReportPeriod, start_date: Optional[datetime], 
                       end_date: Optional[datetime]) -> tuple[datetime, datetime]:
        """Get date range for the specified period."""
        now = datetime.now(UTC)
        
        if period == ReportPeriod.CUSTOM:
            if not start_date or not end_date:
                raise ValueError("Start and end dates required for custom period")
            return start_date, end_date
        
        if period == ReportPeriod.DAILY:
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=1)
        elif period == ReportPeriod.WEEKLY:
            days_since_monday = now.weekday()
            start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days_since_monday)
            end = start + timedelta(days=7)
        elif period == ReportPeriod.MONTHLY:
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if start.month == 12:
                end = start.replace(year=start.year + 1, month=1)
            else:
                end = start.replace(month=start.month + 1)
        elif period == ReportPeriod.QUARTERLY:
            quarter_start_month = ((now.month - 1) // 3) * 3 + 1
            start = now.replace(month=quarter_start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
            if quarter_start_month >= 10:
                end = start.replace(year=start.year + 1, month=1)
            else:
                end = start.replace(month=quarter_start_month + 3)
        elif period == ReportPeriod.YEARLY:
            start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            end = start.replace(year=start.year + 1)
        else:
            raise ValueError(f"Unsupported period: {period}")
        
        return start, end

    @staticmethod
    def _generate_student_progress_report(start_date: datetime, end_date: datetime,
                                        user_ids: Optional[List[int]], requesting_user_id: int) -> Dict[str, Any]:
        """Generate student progress tracking report for music educators."""
        # Filter users if specified
        user_filter = User.id.in_(user_ids) if user_ids else True
        
        # Get performance sessions for the period
        sessions = PerformanceSession.query.filter(
            and_(
                PerformanceSession.created_at >= start_date,
                PerformanceSession.created_at < end_date,
                user_filter
            )
        ).all()
        
        # Group sessions by user
        student_data = defaultdict(lambda: {
            "sessions_count": 0,
            "total_practice_time": 0,
            "completion_rate": 0,
            "problem_areas": [],
            "improvement_metrics": {},
            "goals_progress": {},
            "songs_practiced": set(),
            "performance_scores": []
        })
        
        for session in sessions:
            user_id = session.user_id
            data = student_data[user_id]
            
            data["sessions_count"] += 1
            data["total_practice_time"] += session.total_duration or 0
            
            if session.completion_percentage:
                data["performance_scores"].append(session.completion_percentage)
            
            if session.song_id:
                data["songs_practiced"].add(session.song_id)
        
        # Calculate metrics for each student
        for user_id, data in student_data.items():
            if data["performance_scores"]:
                data["completion_rate"] = sum(data["performance_scores"]) / len(data["performance_scores"])
            
            data["songs_practiced"] = len(data["songs_practiced"])
            data["average_session_length"] = (
                data["total_practice_time"] / data["sessions_count"] 
                if data["sessions_count"] > 0 else 0
            )
        
        return {
            "period_summary": {
                "total_students": len(student_data),
                "total_sessions": sum(data["sessions_count"] for data in student_data.values()),
                "average_completion_rate": (
                    sum(data["completion_rate"] for data in student_data.values()) / len(student_data)
                    if student_data else 0
                )
            },
            "student_details": dict(student_data),
            "top_performers": BusinessIntelligenceService._get_top_performers(student_data),
            "struggling_students": BusinessIntelligenceService._get_struggling_students(student_data)
        }

    @staticmethod
    def _generate_collaboration_report(start_date: datetime, end_date: datetime,
                                     organization_id: Optional[int], requesting_user_id: int) -> Dict[str, Any]:
        """Generate band collaboration effectiveness metrics."""
        # Get setlist performances for the period
        performances = SetlistPerformance.query.filter(
            and_(
                SetlistPerformance.performed_at >= start_date,
                SetlistPerformance.performed_at < end_date
            )
        ).all()
        
        collaboration_metrics = {
            "total_performances": len(performances),
            "unique_setlists": len(set(p.setlist_id for p in performances)),
            "average_performance_rating": 0,
            "collaboration_patterns": {},
            "team_effectiveness": {},
            "rehearsal_to_performance_ratio": 0
        }
        
        if performances:
            # Calculate average performance rating
            ratings = [p.performance_rating for p in performances if p.performance_rating]
            if ratings:
                collaboration_metrics["average_performance_rating"] = sum(ratings) / len(ratings)
            
            # Analyze collaboration patterns
            setlist_frequency = defaultdict(int)
            for performance in performances:
                setlist_frequency[performance.setlist_id] += 1
            
            collaboration_metrics["collaboration_patterns"] = {
                "most_performed_setlists": sorted(
                    setlist_frequency.items(), key=lambda x: x[1], reverse=True
                )[:5],
                "performance_frequency": dict(setlist_frequency)
            }
        
        return collaboration_metrics

    @staticmethod
    def _generate_usage_patterns_report(start_date: datetime, end_date: datetime,
                                      user_ids: Optional[List[int]]) -> Dict[str, Any]:
        """Generate usage pattern analysis and optimization recommendations."""
        user_filter = User.id.in_(user_ids) if user_ids else True
        
        # Get performance sessions
        sessions = PerformanceSession.query.filter(
            and_(
                PerformanceSession.created_at >= start_date,
                PerformanceSession.created_at < end_date,
                user_filter
            )
        ).all()
        
        # Analyze usage patterns
        patterns = {
            "peak_usage_hours": defaultdict(int),
            "peak_usage_days": defaultdict(int),
            "session_duration_distribution": defaultdict(int),
            "device_usage": defaultdict(int),
            "feature_usage": defaultdict(int)
        }
        
        for session in sessions:
            # Hour analysis
            hour = session.created_at.hour
            patterns["peak_usage_hours"][hour] += 1
            
            # Day analysis
            day = session.created_at.strftime("%A")
            patterns["peak_usage_days"][day] += 1
            
            # Duration analysis
            duration = session.total_duration or 0
            if duration < 300:  # 5 minutes
                patterns["session_duration_distribution"]["short"] += 1
            elif duration < 1800:  # 30 minutes
                patterns["session_duration_distribution"]["medium"] += 1
            else:
                patterns["session_duration_distribution"]["long"] += 1
            
            # Device analysis
            if session.device_type:
                patterns["device_usage"][session.device_type] += 1
        
        return {
            "usage_patterns": patterns,
            "optimization_opportunities": BusinessIntelligenceService._identify_optimization_opportunities(patterns),
            "user_engagement_score": BusinessIntelligenceService._calculate_engagement_score(sessions)
        }

    @staticmethod
    def _generate_performance_trends_report(start_date: datetime, end_date: datetime,
                                          user_ids: Optional[List[int]]) -> Dict[str, Any]:
        """Generate performance trends analysis."""
        user_filter = User.id.in_(user_ids) if user_ids else True
        
        # Get sessions grouped by day
        sessions = PerformanceSession.query.filter(
            and_(
                PerformanceSession.created_at >= start_date,
                PerformanceSession.created_at < end_date,
                user_filter
            )
        ).order_by(PerformanceSession.created_at).all()
        
        # Group by date for trend analysis
        daily_metrics = defaultdict(lambda: {
            "sessions": 0,
            "total_duration": 0,
            "completion_rates": [],
            "unique_users": set()
        })
        
        for session in sessions:
            date_key = session.created_at.date().isoformat()
            daily_metrics[date_key]["sessions"] += 1
            daily_metrics[date_key]["total_duration"] += session.total_duration or 0
            daily_metrics[date_key]["unique_users"].add(session.user_id)
            
            if session.completion_percentage:
                daily_metrics[date_key]["completion_rates"].append(session.completion_percentage)
        
        # Calculate trends
        trend_data = []
        for date_str, metrics in sorted(daily_metrics.items()):
            avg_completion = (
                sum(metrics["completion_rates"]) / len(metrics["completion_rates"])
                if metrics["completion_rates"] else 0
            )
            
            trend_data.append({
                "date": date_str,
                "sessions": metrics["sessions"],
                "total_duration": metrics["total_duration"],
                "average_completion": avg_completion,
                "unique_users": len(metrics["unique_users"])
            })
        
        return {
            "trend_data": trend_data,
            "growth_metrics": BusinessIntelligenceService._calculate_growth_metrics(trend_data),
            "seasonality": BusinessIntelligenceService._detect_seasonality(trend_data)
        }

    @staticmethod
    def _generate_comparative_analysis_report(start_date: datetime, end_date: datetime,
                                            user_ids: Optional[List[int]]) -> Dict[str, Any]:
        """Generate comparative analysis between different time periods."""
        # Get current period data
        current_sessions = PerformanceSession.query.filter(
            and_(
                PerformanceSession.created_at >= start_date,
                PerformanceSession.created_at < end_date,
                User.id.in_(user_ids) if user_ids else True
            )
        ).all()
        
        # Get previous period data (same duration, preceding the current period)
        period_duration = end_date - start_date
        prev_start = start_date - period_duration
        prev_end = start_date
        
        previous_sessions = PerformanceSession.query.filter(
            and_(
                PerformanceSession.created_at >= prev_start,
                PerformanceSession.created_at < prev_end,
                User.id.in_(user_ids) if user_ids else True
            )
        ).all()
        
        # Calculate metrics for both periods
        current_metrics = BusinessIntelligenceService._calculate_period_metrics(current_sessions)
        previous_metrics = BusinessIntelligenceService._calculate_period_metrics(previous_sessions)
        
        # Calculate changes
        changes = {}
        for key in current_metrics:
            if key in previous_metrics and previous_metrics[key] != 0:
                change_pct = ((current_metrics[key] - previous_metrics[key]) / previous_metrics[key]) * 100
                changes[f"{key}_change_pct"] = change_pct
            else:
                changes[f"{key}_change_pct"] = 0
        
        return {
            "current_period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "metrics": current_metrics
            },
            "previous_period": {
                "start_date": prev_start.isoformat(),
                "end_date": prev_end.isoformat(),
                "metrics": previous_metrics
            },
            "changes": changes,
            "significant_changes": BusinessIntelligenceService._identify_significant_changes(changes)
        }

    @staticmethod
    def _calculate_period_metrics(sessions: List[PerformanceSession]) -> Dict[str, float]:
        """Calculate standard metrics for a period."""
        if not sessions:
            return {
                "total_sessions": 0,
                "unique_users": 0,
                "total_duration": 0,
                "average_duration": 0,
                "average_completion": 0
            }
        
        completion_rates = [s.completion_percentage for s in sessions if s.completion_percentage]
        
        return {
            "total_sessions": len(sessions),
            "unique_users": len(set(s.user_id for s in sessions)),
            "total_duration": sum(s.total_duration or 0 for s in sessions),
            "average_duration": sum(s.total_duration or 0 for s in sessions) / len(sessions),
            "average_completion": sum(completion_rates) / len(completion_rates) if completion_rates else 0
        }

    @staticmethod
    def _get_top_performers(student_data: Dict) -> List[Dict[str, Any]]:
        """Identify top performing students."""
        performers = []
        for user_id, data in student_data.items():
            if data["completion_rate"] > 0:
                performers.append({
                    "user_id": user_id,
                    "completion_rate": data["completion_rate"],
                    "sessions_count": data["sessions_count"],
                    "total_practice_time": data["total_practice_time"]
                })
        
        return sorted(performers, key=lambda x: x["completion_rate"], reverse=True)[:10]

    @staticmethod
    def _get_struggling_students(student_data: Dict) -> List[Dict[str, Any]]:
        """Identify students who may need additional support."""
        struggling = []
        avg_completion = sum(data["completion_rate"] for data in student_data.values()) / len(student_data) if student_data else 0
        
        for user_id, data in student_data.items():
            if data["completion_rate"] < avg_completion * 0.7:  # 30% below average
                struggling.append({
                    "user_id": user_id,
                    "completion_rate": data["completion_rate"],
                    "sessions_count": data["sessions_count"],
                    "concerns": BusinessIntelligenceService._identify_student_concerns(data)
                })
        
        return sorted(struggling, key=lambda x: x["completion_rate"])

    @staticmethod
    def _identify_student_concerns(data: Dict) -> List[str]:
        """Identify specific concerns for struggling students."""
        concerns = []
        
        if data["sessions_count"] < 5:
            concerns.append("Low practice frequency")
        
        if data["completion_rate"] < 50:
            concerns.append("Low completion rate")
        
        if data["average_session_length"] < 300:  # 5 minutes
            concerns.append("Very short practice sessions")
        
        return concerns

    @staticmethod
    def _identify_optimization_opportunities(patterns: Dict) -> List[str]:
        """Identify optimization opportunities from usage patterns."""
        opportunities = []
        
        # Check for peak usage times
        if patterns["peak_usage_hours"]:
            peak_hour = max(patterns["peak_usage_hours"], key=patterns["peak_usage_hours"].get)
            opportunities.append(f"Peak usage at {peak_hour}:00 - consider targeted content")
        
        # Check session duration distribution
        duration_dist = patterns["session_duration_distribution"]
        if duration_dist.get("short", 0) > duration_dist.get("medium", 0) + duration_dist.get("long", 0):
            opportunities.append("Many short sessions - consider engagement improvements")
        
        return opportunities

    @staticmethod
    def _calculate_engagement_score(sessions: List[PerformanceSession]) -> float:
        """Calculate user engagement score based on session data."""
        if not sessions:
            return 0.0
        
        # Factors: frequency, duration, completion rate
        total_sessions = len(sessions)
        avg_duration = sum(s.total_duration or 0 for s in sessions) / total_sessions
        completion_rates = [s.completion_percentage for s in sessions if s.completion_percentage]
        avg_completion = sum(completion_rates) / len(completion_rates) if completion_rates else 0
        
        # Normalize and weight factors
        frequency_score = min(total_sessions / 30, 1.0)  # Normalize to 30 sessions max
        duration_score = min(avg_duration / 1800, 1.0)  # Normalize to 30 minutes max
        completion_score = avg_completion / 100.0
        
        return (frequency_score * 0.3 + duration_score * 0.3 + completion_score * 0.4) * 100

    @staticmethod
    def _calculate_growth_metrics(trend_data: List[Dict]) -> Dict[str, float]:
        """Calculate growth metrics from trend data."""
        if len(trend_data) < 2:
            return {"growth_rate": 0, "trend": "insufficient_data"}
        
        first_week = trend_data[:7] if len(trend_data) >= 7 else trend_data[:len(trend_data)//2]
        last_week = trend_data[-7:] if len(trend_data) >= 7 else trend_data[len(trend_data)//2:]
        
        first_avg = sum(d["sessions"] for d in first_week) / len(first_week)
        last_avg = sum(d["sessions"] for d in last_week) / len(last_week)
        
        growth_rate = ((last_avg - first_avg) / first_avg * 100) if first_avg > 0 else 0
        
        return {
            "growth_rate": growth_rate,
            "trend": "growing" if growth_rate > 5 else "declining" if growth_rate < -5 else "stable"
        }

    @staticmethod
    def _detect_seasonality(trend_data: List[Dict]) -> Dict[str, Any]:
        """Detect seasonal patterns in the data."""
        # Simple seasonality detection based on day of week
        day_patterns = defaultdict(list)
        
        for data_point in trend_data:
            try:
                date_obj = datetime.fromisoformat(data_point["date"])
                day_name = date_obj.strftime("%A")
                day_patterns[day_name].append(data_point["sessions"])
            except:
                continue
        
        # Calculate average sessions per day
        day_averages = {}
        for day, sessions in day_patterns.items():
            day_averages[day] = sum(sessions) / len(sessions) if sessions else 0
        
        return {
            "day_of_week_patterns": day_averages,
            "peak_day": max(day_averages, key=day_averages.get) if day_averages else None
        }

    @staticmethod
    def _identify_significant_changes(changes: Dict) -> List[Dict[str, Any]]:
        """Identify statistically significant changes between periods."""
        significant = []
        
        for key, change_pct in changes.items():
            if abs(change_pct) > 20:  # 20% threshold for significance
                significant.append({
                    "metric": key.replace("_change_pct", ""),
                    "change_percentage": change_pct,
                    "significance": "high" if abs(change_pct) > 50 else "medium"
                })
        
        return sorted(significant, key=lambda x: abs(x["change_percentage"]), reverse=True)

    @staticmethod
    def _generate_insights(data: Dict[str, Any], report_type: ReportType) -> List[str]:
        """Generate insights based on report data."""
        insights = []
        
        if report_type == ReportType.STUDENT_PROGRESS:
            summary = data.get("period_summary", {})
            if summary.get("average_completion_rate", 0) > 80:
                insights.append("Students showing excellent overall completion rates")
            elif summary.get("average_completion_rate", 0) < 60:
                insights.append("Student completion rates below target - consider intervention strategies")
        
        elif report_type == ReportType.USAGE_PATTERNS:
            patterns = data.get("usage_patterns", {})
            if patterns.get("device_usage", {}).get("mobile", 0) > patterns.get("device_usage", {}).get("desktop", 0):
                insights.append("Mobile usage dominant - optimize mobile experience")
        
        return insights

    @staticmethod
    def _generate_recommendations(data: Dict[str, Any], report_type: ReportType) -> List[str]:
        """Generate actionable recommendations based on report data."""
        recommendations = []
        
        if report_type == ReportType.STUDENT_PROGRESS:
            struggling = data.get("struggling_students", [])
            if len(struggling) > 0:
                recommendations.append(f"Provide additional support to {len(struggling)} struggling students")
                recommendations.append("Consider implementing personalized practice plans")
        
        elif report_type == ReportType.USAGE_PATTERNS:
            engagement_score = data.get("user_engagement_score", 0)
            if engagement_score < 70:
                recommendations.append("Implement gamification features to improve engagement")
                recommendations.append("Consider push notifications for practice reminders")
        
        return recommendations

    @staticmethod
    def _generate_summary(data: Dict[str, Any], report_type: ReportType) -> Dict[str, Any]:
        """Generate executive summary of the report."""
        summary = {
            "report_type": report_type.value,
            "key_metrics": {},
            "status": "normal"
        }
        
        if report_type == ReportType.STUDENT_PROGRESS:
            period_summary = data.get("period_summary", {})
            summary["key_metrics"] = {
                "total_students": period_summary.get("total_students", 0),
                "average_completion_rate": period_summary.get("average_completion_rate", 0),
                "total_sessions": period_summary.get("total_sessions", 0)
            }
            
            # Determine status
            if period_summary.get("average_completion_rate", 0) > 80:
                summary["status"] = "excellent"
            elif period_summary.get("average_completion_rate", 0) < 60:
                summary["status"] = "needs_attention"
        
        return summary


class ReportScheduler:
    """Service for scheduling automated report generation."""
    
    @staticmethod
    def schedule_report(config: ReportConfig, schedule_expression: str, user_id: int) -> Dict[str, Any]:
        """
        Schedule a report for automated generation.
        
        Args:
            config: Report configuration
            schedule_expression: Cron-like expression for scheduling
            user_id: User who scheduled the report
            
        Returns:
            Scheduled report information
        """
        # For now, return a simple scheduled report structure
        # In a full implementation, this would integrate with a task queue like Celery
        return {
            "schedule_id": f"schedule_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}",
            "config": config.__dict__,
            "schedule": schedule_expression,
            "created_by": user_id,
            "status": "scheduled",
            "next_run": ReportScheduler._calculate_next_run(schedule_expression)
        }
    
    @staticmethod
    def _calculate_next_run(schedule_expression: str) -> str:
        """Calculate next run time from schedule expression."""
        # Simplified implementation - in production would use proper cron parsing
        now = datetime.now(UTC)
        
        if schedule_expression == "daily":
            next_run = now + timedelta(days=1)
        elif schedule_expression == "weekly":
            next_run = now + timedelta(weeks=1)
        elif schedule_expression == "monthly":
            next_run = now + timedelta(days=30)
        else:
            next_run = now + timedelta(days=1)
        
        return next_run.isoformat()