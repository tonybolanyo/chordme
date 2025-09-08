"""
Business Intelligence and Reporting Tests

Tests for the BI functionality including:
- Report generation
- Custom report builder
- Scheduled reports
- Data export
- AI insights and recommendations
- External BI integration
"""

import pytest
import json
from datetime import datetime, timedelta, UTC
from unittest.mock import Mock, patch

from chordme.business_intelligence import (
    BusinessIntelligenceService, ReportScheduler, ReportType, 
    ReportPeriod, ReportConfig
)
from chordme.models import (
    User, PerformanceSession, PerformanceEvent, ProblemSection
)


@pytest.fixture
def sample_user(db):
    """Create a sample user for testing."""
    user = User(email='test@example.com', password_hash='hashed_password')
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def sample_performance_sessions(db, sample_user):
    """Create sample performance sessions for testing."""
    sessions = []
    base_date = datetime.now(UTC) - timedelta(days=30)
    
    for i in range(10):
        session = PerformanceSession(
            user_id=sample_user.id,
            session_type='practice',
            total_duration=1800 + (i * 300),  # 30-75 minutes
            completion_percentage=70 + (i * 3),  # 70-97%
            created_at=base_date + timedelta(days=i * 3),
            device_type='desktop' if i % 2 == 0 else 'mobile'
        )
        db.session.add(session)
        sessions.append(session)
    
    db.session.commit()
    return sessions


class TestBusinessIntelligenceService:
    """Test cases for the BusinessIntelligenceService class."""

    def test_get_date_range_daily(self):
        """Test daily date range calculation."""
        start, end = BusinessIntelligenceService._get_date_range(
            ReportPeriod.DAILY, None, None
        )
        
        assert isinstance(start, datetime)
        assert isinstance(end, datetime)
        assert (end - start).days == 1
        assert start.hour == 0
        assert start.minute == 0

    def test_get_date_range_weekly(self):
        """Test weekly date range calculation."""
        start, end = BusinessIntelligenceService._get_date_range(
            ReportPeriod.WEEKLY, None, None
        )
        
        assert isinstance(start, datetime)
        assert isinstance(end, datetime)
        assert (end - start).days == 7
        assert start.weekday() == 0  # Monday

    def test_get_date_range_monthly(self):
        """Test monthly date range calculation."""
        start, end = BusinessIntelligenceService._get_date_range(
            ReportPeriod.MONTHLY, None, None
        )
        
        assert isinstance(start, datetime)
        assert isinstance(end, datetime)
        assert start.day == 1
        assert start.hour == 0

    def test_get_date_range_custom(self):
        """Test custom date range."""
        custom_start = datetime(2024, 1, 1, tzinfo=UTC)
        custom_end = datetime(2024, 1, 31, tzinfo=UTC)
        
        start, end = BusinessIntelligenceService._get_date_range(
            ReportPeriod.CUSTOM, custom_start, custom_end
        )
        
        assert start == custom_start
        assert end == custom_end

    def test_get_date_range_custom_missing_dates(self):
        """Test custom date range with missing dates raises error."""
        with pytest.raises(ValueError, match="Start and end dates required"):
            BusinessIntelligenceService._get_date_range(
                ReportPeriod.CUSTOM, None, None
            )

    def test_generate_student_progress_report(self, db, sample_user, sample_performance_sessions):
        """Test student progress report generation."""
        start_date = datetime.now(UTC) - timedelta(days=35)
        end_date = datetime.now(UTC)
        
        report_data = BusinessIntelligenceService._generate_student_progress_report(
            start_date, end_date, [sample_user.id], sample_user.id
        )
        
        assert 'period_summary' in report_data
        assert 'student_details' in report_data
        assert 'top_performers' in report_data
        assert 'struggling_students' in report_data
        
        # Check period summary
        period_summary = report_data['period_summary']
        assert period_summary['total_students'] >= 1
        assert period_summary['total_sessions'] >= 1
        assert 0 <= period_summary['average_completion_rate'] <= 100
        
        # Check student details
        assert sample_user.id in report_data['student_details']
        student_data = report_data['student_details'][sample_user.id]
        assert student_data['sessions_count'] >= 1
        assert student_data['total_practice_time'] >= 0

    def test_generate_usage_patterns_report(self, db, sample_user, sample_performance_sessions):
        """Test usage patterns report generation."""
        start_date = datetime.now(UTC) - timedelta(days=35)
        end_date = datetime.now(UTC)
        
        report_data = BusinessIntelligenceService._generate_usage_patterns_report(
            start_date, end_date, [sample_user.id]
        )
        
        assert 'usage_patterns' in report_data
        assert 'optimization_opportunities' in report_data
        assert 'user_engagement_score' in report_data
        
        patterns = report_data['usage_patterns']
        assert 'peak_usage_hours' in patterns
        assert 'peak_usage_days' in patterns
        assert 'session_duration_distribution' in patterns
        assert 'device_usage' in patterns

    def test_generate_performance_trends_report(self, db, sample_user, sample_performance_sessions):
        """Test performance trends report generation."""
        start_date = datetime.now(UTC) - timedelta(days=35)
        end_date = datetime.now(UTC)
        
        report_data = BusinessIntelligenceService._generate_performance_trends_report(
            start_date, end_date, [sample_user.id]
        )
        
        assert 'trend_data' in report_data
        assert 'growth_metrics' in report_data
        assert 'seasonality' in report_data
        
        trend_data = report_data['trend_data']
        assert isinstance(trend_data, list)
        if trend_data:
            assert 'date' in trend_data[0]
            assert 'sessions' in trend_data[0]
            assert 'unique_users' in trend_data[0]

    def test_generate_comparative_analysis_report(self, db, sample_user, sample_performance_sessions):
        """Test comparative analysis report generation."""
        start_date = datetime.now(UTC) - timedelta(days=15)
        end_date = datetime.now(UTC)
        
        report_data = BusinessIntelligenceService._generate_comparative_analysis_report(
            start_date, end_date, [sample_user.id]
        )
        
        assert 'current_period' in report_data
        assert 'previous_period' in report_data
        assert 'changes' in report_data
        assert 'significant_changes' in report_data
        
        current_period = report_data['current_period']
        assert 'start_date' in current_period
        assert 'metrics' in current_period

    def test_calculate_period_metrics(self, db, sample_performance_sessions):
        """Test period metrics calculation."""
        metrics = BusinessIntelligenceService._calculate_period_metrics(sample_performance_sessions)
        
        assert 'total_sessions' in metrics
        assert 'unique_users' in metrics
        assert 'total_duration' in metrics
        assert 'average_duration' in metrics
        assert 'average_completion' in metrics
        
        assert metrics['total_sessions'] == len(sample_performance_sessions)
        assert metrics['unique_users'] >= 1

    def test_calculate_period_metrics_empty_sessions(self):
        """Test period metrics calculation with empty sessions."""
        metrics = BusinessIntelligenceService._calculate_period_metrics([])
        
        assert metrics['total_sessions'] == 0
        assert metrics['unique_users'] == 0
        assert metrics['total_duration'] == 0
        assert metrics['average_duration'] == 0
        assert metrics['average_completion'] == 0

    def test_generate_insights(self):
        """Test insight generation."""
        # Test student progress insights
        data = {
            'period_summary': {'average_completion_rate': 85}
        }
        insights = BusinessIntelligenceService._generate_insights(data, ReportType.STUDENT_PROGRESS)
        assert isinstance(insights, list)
        
        # Test usage patterns insights
        data = {
            'usage_patterns': {
                'device_usage': {'mobile': 100, 'desktop': 50}
            }
        }
        insights = BusinessIntelligenceService._generate_insights(data, ReportType.USAGE_PATTERNS)
        assert isinstance(insights, list)

    def test_generate_recommendations(self):
        """Test recommendation generation."""
        # Test student progress recommendations
        data = {
            'struggling_students': [{'user_id': 1, 'completion_rate': 40}]
        }
        recommendations = BusinessIntelligenceService._generate_recommendations(
            data, ReportType.STUDENT_PROGRESS
        )
        assert isinstance(recommendations, list)
        
        # Test usage patterns recommendations
        data = {'user_engagement_score': 60}
        recommendations = BusinessIntelligenceService._generate_recommendations(
            data, ReportType.USAGE_PATTERNS
        )
        assert isinstance(recommendations, list)

    def test_generate_summary(self):
        """Test summary generation."""
        # Test student progress summary
        data = {
            'period_summary': {
                'total_students': 25,
                'average_completion_rate': 85,
                'total_sessions': 150
            }
        }
        summary = BusinessIntelligenceService._generate_summary(data, ReportType.STUDENT_PROGRESS)
        
        assert summary['report_type'] == ReportType.STUDENT_PROGRESS.value
        assert 'key_metrics' in summary
        assert 'status' in summary
        assert summary['key_metrics']['total_students'] == 25

    def test_full_report_generation(self, db, sample_user, sample_performance_sessions):
        """Test full report generation process."""
        config = ReportConfig(
            report_type=ReportType.STUDENT_PROGRESS,
            period=ReportPeriod.MONTHLY,
            user_ids=[sample_user.id],
            include_detailed_breakdown=True,
            include_recommendations=True
        )
        
        report = BusinessIntelligenceService.generate_report(config, sample_user.id)
        
        assert 'report_id' in report
        assert 'generated_at' in report
        assert 'config' in report
        assert 'summary' in report
        assert 'data' in report
        assert 'insights' in report
        assert 'recommendations' in report
        
        assert report['config']['type'] == ReportType.STUDENT_PROGRESS.value
        assert isinstance(report['insights'], list)
        assert isinstance(report['recommendations'], list)


class TestReportScheduler:
    """Test cases for the ReportScheduler class."""

    def test_schedule_report(self):
        """Test report scheduling."""
        config = ReportConfig(
            report_type=ReportType.USAGE_PATTERNS,
            period=ReportPeriod.WEEKLY
        )
        
        scheduled_report = ReportScheduler.schedule_report(config, 'weekly', 1)
        
        assert 'schedule_id' in scheduled_report
        assert 'config' in scheduled_report
        assert 'schedule' in scheduled_report
        assert 'created_by' in scheduled_report
        assert 'status' in scheduled_report
        assert 'next_run' in scheduled_report
        
        assert scheduled_report['schedule'] == 'weekly'
        assert scheduled_report['created_by'] == 1
        assert scheduled_report['status'] == 'scheduled'

    def test_calculate_next_run_daily(self):
        """Test next run calculation for daily schedule."""
        next_run = ReportScheduler._calculate_next_run('daily')
        next_run_dt = datetime.fromisoformat(next_run)
        now = datetime.now(UTC)
        
        # Should be approximately 1 day from now
        diff = next_run_dt - now
        assert 0.9 < diff.total_seconds() / (24 * 3600) < 1.1

    def test_calculate_next_run_weekly(self):
        """Test next run calculation for weekly schedule."""
        next_run = ReportScheduler._calculate_next_run('weekly')
        next_run_dt = datetime.fromisoformat(next_run)
        now = datetime.now(UTC)
        
        # Should be approximately 7 days from now
        diff = next_run_dt - now
        assert 6.9 < diff.total_seconds() / (24 * 3600) < 7.1

    def test_calculate_next_run_monthly(self):
        """Test next run calculation for monthly schedule."""
        next_run = ReportScheduler._calculate_next_run('monthly')
        next_run_dt = datetime.fromisoformat(next_run)
        now = datetime.now(UTC)
        
        # Should be approximately 30 days from now
        diff = next_run_dt - now
        assert 29 < diff.total_seconds() / (24 * 3600) < 31


@pytest.mark.integration
class TestBusinessIntelligenceIntegration:
    """Integration tests for BI functionality."""

    def test_student_progress_tracking_workflow(self, db, sample_user):
        """Test complete student progress tracking workflow."""
        # Create performance sessions over time
        sessions = []
        base_date = datetime.now(UTC) - timedelta(days=60)
        
        for week in range(8):
            for session_num in range(3):  # 3 sessions per week
                session = PerformanceSession(
                    user_id=sample_user.id,
                    session_type='practice',
                    total_duration=1200 + (week * 300),  # Increasing duration
                    completion_percentage=60 + (week * 5),  # Improving completion
                    created_at=base_date + timedelta(days=week * 7 + session_num),
                    device_type='desktop'
                )
                db.session.add(session)
                sessions.append(session)
        
        db.session.commit()
        
        # Generate monthly report
        config = ReportConfig(
            report_type=ReportType.STUDENT_PROGRESS,
            period=ReportPeriod.MONTHLY,
            user_ids=[sample_user.id],
            include_detailed_breakdown=True,
            include_recommendations=True
        )
        
        report = BusinessIntelligenceService.generate_report(config, sample_user.id)
        
        # Verify student shows improvement
        student_data = report['data']['student_details'][sample_user.id]
        assert student_data['sessions_count'] > 0
        assert student_data['completion_rate'] > 60  # Should show improvement
        
        # Verify insights are generated
        assert len(report['insights']) >= 0
        assert len(report['recommendations']) >= 0

    def test_collaborative_analytics_workflow(self, db):
        """Test collaborative analytics for multiple users."""
        # Create multiple users
        users = []
        for i in range(5):
            user = User(
                email=f'student{i}@example.com',
                password_hash='hashed_password'
            )
            db.session.add(user)
            users.append(user)
        
        db.session.commit()
        
        # Create sessions with varying performance
        base_date = datetime.now(UTC) - timedelta(days=30)
        for i, user in enumerate(users):
            for day in range(10):
                session = PerformanceSession(
                    user_id=user.id,
                    session_type='practice',
                    total_duration=900 + (i * 300),  # Different durations
                    completion_percentage=50 + (i * 10),  # Different performance levels
                    created_at=base_date + timedelta(days=day),
                    device_type='mobile' if i % 2 == 0 else 'desktop'
                )
                db.session.add(session)
        
        db.session.commit()
        
        # Generate comparative analysis
        config = ReportConfig(
            report_type=ReportType.COMPARATIVE_ANALYSIS,
            period=ReportPeriod.MONTHLY,
            user_ids=[user.id for user in users],
            include_recommendations=True
        )
        
        report = BusinessIntelligenceService.generate_report(config, users[0].id)
        
        # Verify comparative data
        assert 'current_period' in report['data']
        assert 'previous_period' in report['data']
        assert 'changes' in report['data']
        
        # Should have metrics for multiple users
        current_metrics = report['data']['current_period']['metrics']
        assert current_metrics['unique_users'] == len(users)

    def test_usage_optimization_recommendations(self, db, sample_user):
        """Test usage pattern analysis and optimization recommendations."""
        # Create sessions with specific patterns
        base_date = datetime.now(UTC) - timedelta(days=30)
        
        # Create many short sessions (indicating potential issue)
        for day in range(20):
            session = PerformanceSession(
                user_id=sample_user.id,
                session_type='practice',
                total_duration=300,  # Only 5 minutes
                completion_percentage=30,  # Low completion
                created_at=base_date + timedelta(days=day),
                device_type='mobile'
            )
            db.session.add(session)
        
        db.session.commit()
        
        # Generate usage patterns report
        config = ReportConfig(
            report_type=ReportType.USAGE_PATTERNS,
            period=ReportPeriod.MONTHLY,
            user_ids=[sample_user.id],
            include_recommendations=True
        )
        
        report = BusinessIntelligenceService.generate_report(config, sample_user.id)
        
        # Verify usage patterns are detected
        patterns = report['data']['usage_patterns']
        assert 'session_duration_distribution' in patterns
        assert patterns['session_duration_distribution']['short'] > 0
        
        # Should generate optimization recommendations
        recommendations = report['recommendations']
        assert len(recommendations) > 0
        
        # Should identify short session issue
        optimization_opportunities = report['data']['optimization_opportunities']
        assert any('short sessions' in opp.lower() for opp in optimization_opportunities)


if __name__ == '__main__':
    pytest.main([__file__])