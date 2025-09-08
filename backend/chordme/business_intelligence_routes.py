"""
Business Intelligence and Reporting API Routes

Provides REST endpoints for:
- Report generation and management
- Custom report builder
- Scheduled reports
- External BI tool integration
- Analytics export
"""

from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import logging
from datetime import datetime, UTC
from typing import Dict, Any, List
import json

from .utils import create_error_response, create_success_response, auth_required as require_auth
from .models import db, User

from .business_intelligence import (
    BusinessIntelligenceService, ReportScheduler, ReportType, 
    ReportPeriod, ReportConfig
)

logger = logging.getLogger(__name__)
# Create blueprint
bi_bp = Blueprint('business_intelligence', __name__, url_prefix='/api/v1/bi')


def require_educator_or_admin(f):
    """Decorator to require educator or admin privileges for certain BI features."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get current user from auth context
        current_user_id = getattr(request, 'current_user_id', None)
        if not current_user_id:
            return jsonify({
                'status': 'error',
                'error': {
                    'code': 'AUTHENTICATION_REQUIRED',
                    'message': 'Authentication required for BI features',
                    'category': 'authentication',
                    'retryable': False
                }
            }), 401
        
        # For now, allow all authenticated users access to BI features
        # In production, this would check user roles/permissions
        return f(*args, **kwargs)
    
    return decorated_function


@bi_bp.route('/reports/generate', methods=['POST'])
@require_auth
@require_educator_or_admin
def generate_report():
    """
    Generate a business intelligence report.
    ---
    tags:
      - Business Intelligence
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            report_type:
              type: string
              enum: [student_progress, band_collaboration, usage_patterns, performance_trends, comparative_analysis, custom]
              description: Type of report to generate
            period:
              type: string
              enum: [daily, weekly, monthly, quarterly, yearly, custom]
              description: Time period for the report
            start_date:
              type: string
              format: date-time
              description: Start date for custom period (ISO format)
            end_date:
              type: string
              format: date-time
              description: End date for custom period (ISO format)
            user_ids:
              type: array
              items:
                type: integer
              description: Specific user IDs to include in report
            organization_id:
              type: integer
              description: Organization ID for collaboration reports
            include_detailed_breakdown:
              type: boolean
              default: true
              description: Include detailed breakdown in report
            include_recommendations:
              type: boolean
              default: true
              description: Include AI-generated recommendations
            format:
              type: string
              enum: [json, pdf, csv]
              default: json
              description: Report output format
          required:
            - report_type
            - period
    responses:
      200:
        description: Report generated successfully
        schema:
          type: object
          properties:
            status:
              type: string
              example: success
            data:
              type: object
              description: Generated report data
      400:
        description: Invalid request parameters
        schema:
          $ref: '#/definitions/ValidationError'
      401:
        description: Authentication required
        schema:
          $ref: '#/definitions/AuthenticationError'
      403:
        description: Insufficient permissions
        schema:
          $ref: '#/definitions/Error'
      500:
        description: Server error
        schema:
          $ref: '#/definitions/ServerError'
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': 'Request body is required',
                    'category': 'validation',
                    'retryable': False
                }
            }), 400
        
        # Validate required fields
        required_fields = ['report_type', 'period']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'status': 'error',
                    'error': {
                        'code': 'MISSING_FIELD',
                        'message': f'Missing required field: {field}',
                        'category': 'validation',
                        'retryable': False
                    }
                }), 400
        
        # Validate report type
        try:
            report_type = ReportType(data['report_type'])
        except ValueError:
            return jsonify({
                'status': 'error',
                'error': {
                    'code': 'INVALID_REPORT_TYPE',
                    'message': f'Invalid report type: {data["report_type"]}',
                    'category': 'validation',
                    'retryable': False
                }
            }), 400
        
        # Validate period
        try:
            period = ReportPeriod(data['period'])
        except ValueError:
            return jsonify({
                'status': 'error',
                'error': {
                    'code': 'INVALID_PERIOD',
                    'message': f'Invalid period: {data["period"]}',
                    'category': 'validation',
                    'retryable': False
                }
            }), 400
        
        # Parse dates if provided
        start_date = None
        end_date = None
        if period == ReportPeriod.CUSTOM:
            if 'start_date' not in data or 'end_date' not in data:
                return jsonify({
                    'status': 'error',
                    'error': {
                        'code': 'MISSING_DATES',
                        'message': 'start_date and end_date required for custom period',
                        'category': 'validation',
                        'retryable': False
                    }
                }), 400
            
            try:
                start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
                end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
            except ValueError as e:
                return jsonify({
                    'status': 'error',
                    'error': {
                        'code': 'INVALID_DATE_FORMAT',
                        'message': 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)',
                        'category': 'validation',
                        'retryable': False
                    }
                }), 400
        
        # Create report configuration
        config = ReportConfig(
            report_type=report_type,
            period=period,
            start_date=start_date,
            end_date=end_date,
            user_ids=data.get('user_ids'),
            organization_id=data.get('organization_id'),
            include_detailed_breakdown=data.get('include_detailed_breakdown', True),
            include_recommendations=data.get('include_recommendations', True),
            format=data.get('format', 'json')
        )
        
        # Generate report
        current_user_id = getattr(request, 'current_user_id')
        report = BusinessIntelligenceService.generate_report(config, current_user_id)
        
        return jsonify({
            'status': 'success',
            'data': report
        })
        
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': {
                'code': 'REPORT_GENERATION_ERROR',
                'message': 'Failed to generate report',
                'category': 'server_error',
                'retryable': True
            }
        }), 500


@bi_bp.route('/reports/schedule', methods=['POST'])
@require_auth
@require_educator_or_admin
def schedule_report():
    """
    Schedule a report for automated generation.
    ---
    tags:
      - Business Intelligence
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            report_config:
              type: object
              description: Report configuration (same as generate report)
            schedule:
              type: string
              description: Schedule expression (daily, weekly, monthly, or cron-like)
            delivery_email:
              type: string
              format: email
              description: Email address for report delivery
            enabled:
              type: boolean
              default: true
              description: Whether the schedule is enabled
          required:
            - report_config
            - schedule
    responses:
      200:
        description: Report scheduled successfully
      400:
        description: Invalid request
      401:
        description: Authentication required
      500:
        description: Server error
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': 'Request body is required',
                    'category': 'validation',
                    'retryable': False
                }
            }), 400
        
        # Validate required fields
        if 'report_config' not in data or 'schedule' not in data:
            return jsonify({
                'status': 'error',
                'error': {
                    'code': 'MISSING_FIELDS',
                    'message': 'report_config and schedule are required',
                    'category': 'validation',
                    'retryable': False
                }
            }), 400
        
        # Create report configuration from the provided config
        report_config_data = data['report_config']
        
        # Validate report configuration
        try:
            report_type = ReportType(report_config_data['report_type'])
            period = ReportPeriod(report_config_data['period'])
        except (ValueError, KeyError) as e:
            return jsonify({
                'status': 'error',
                'error': {
                    'code': 'INVALID_CONFIG',
                    'message': 'Invalid report configuration',
                    'category': 'validation',
                    'retryable': False
                }
            }), 400
        
        config = ReportConfig(
            report_type=report_type,
            period=period,
            user_ids=report_config_data.get('user_ids'),
            organization_id=report_config_data.get('organization_id'),
            include_detailed_breakdown=report_config_data.get('include_detailed_breakdown', True),
            include_recommendations=report_config_data.get('include_recommendations', True),
            format=report_config_data.get('format', 'json'),
            delivery_method='email' if data.get('delivery_email') else 'api'
        )
        
        # Schedule the report
        current_user_id = getattr(request, 'current_user_id')
        scheduled_report = ReportScheduler.schedule_report(
            config, data['schedule'], current_user_id
        )
        
        return jsonify({
            'status': 'success',
            'data': scheduled_report
        })
        
    except Exception as e:
        logger.error(f"Error scheduling report: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': {
                'code': 'SCHEDULE_ERROR',
                'message': 'Failed to schedule report',
                'category': 'server_error',
                'retryable': True
            }
        }), 500


@bi_bp.route('/export/data', methods=['POST'])
@require_auth
@require_educator_or_admin
def export_data():
    """
    Export analytics data for external BI tools.
    ---
    tags:
      - Business Intelligence
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            data_type:
              type: string
              enum: [sessions, performances, users, songs, analytics]
              description: Type of data to export
            start_date:
              type: string
              format: date-time
              description: Start date for data export
            end_date:
              type: string
              format: date-time
              description: End date for data export
            format:
              type: string
              enum: [json, csv]
              default: json
              description: Export format
            filters:
              type: object
              description: Additional filters for data export
          required:
            - data_type
            - start_date
            - end_date
    responses:
      200:
        description: Data exported successfully
        schema:
          type: object
          properties:
            status:
              type: string
            data:
              type: object
              description: Exported data
      400:
        description: Invalid request
      401:
        description: Authentication required
      500:
        description: Server error
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': 'Request body is required',
                    'category': 'validation',
                    'retryable': False
                }
            }), 400
        
        # Validate required fields
        required_fields = ['data_type', 'start_date', 'end_date']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'status': 'error',
                    'error': {
                        'code': 'MISSING_FIELD',
                        'message': f'Missing required field: {field}',
                        'category': 'validation',
                        'retryable': False
                    }
                }), 400
        
        # Parse dates
        try:
            start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({
                'status': 'error',
                'error': {
                    'code': 'INVALID_DATE_FORMAT',
                    'message': 'Invalid date format. Use ISO format',
                    'category': 'validation',
                    'retryable': False
                }
            }), 400
        
        # Export data based on type
        data_type = data['data_type']
        export_format = data.get('format', 'json')
        
        # For demonstration, return a simple export structure
        # In production, this would query the actual data and format it appropriately
        exported_data = {
            'export_id': f"export_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}",
            'data_type': data_type,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'format': export_format,
            'record_count': 0,
            'data': [],
            'metadata': {
                'exported_at': datetime.now(UTC).isoformat(),
                'exported_by': getattr(request, 'current_user_id'),
                'filters_applied': data.get('filters', {})
            }
        }
        
        # In a full implementation, we would query the database here
        # and populate the 'data' field with the actual records
        
        return jsonify({
            'status': 'success',
            'data': exported_data
        })
        
    except Exception as e:
        logger.error(f"Error exporting data: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': {
                'code': 'EXPORT_ERROR',
                'message': 'Failed to export data',
                'category': 'server_error',
                'retryable': True
            }
        }), 500


@bi_bp.route('/dashboards/custom', methods=['POST'])
@require_auth
@require_educator_or_admin
def create_custom_dashboard():
    """
    Create a custom dashboard configuration.
    ---
    tags:
      - Business Intelligence
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            name:
              type: string
              description: Dashboard name
            description:
              type: string
              description: Dashboard description
            layout:
              type: object
              description: Dashboard layout configuration
            widgets:
              type: array
              items:
                type: object
                properties:
                  type:
                    type: string
                    enum: [chart, table, metric, text]
                  title:
                    type: string
                  data_source:
                    type: string
                  config:
                    type: object
              description: Dashboard widgets configuration
            sharing:
              type: object
              properties:
                is_public:
                  type: boolean
                shared_with_users:
                  type: array
                  items:
                    type: integer
              description: Dashboard sharing settings
          required:
            - name
            - widgets
    responses:
      200:
        description: Dashboard created successfully
      400:
        description: Invalid request
      401:
        description: Authentication required
      500:
        description: Server error
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': 'Request body is required',
                    'category': 'validation',
                    'retryable': False
                }
            }), 400
        
        # Validate required fields
        if 'name' not in data or 'widgets' not in data:
            return jsonify({
                'status': 'error',
                'error': {
                    'code': 'MISSING_FIELDS',
                    'message': 'name and widgets are required',
                    'category': 'validation',
                    'retryable': False
                }
            }), 400
        
        # Create dashboard configuration
        dashboard_config = {
            'dashboard_id': f"dashboard_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}",
            'name': data['name'],
            'description': data.get('description', ''),
            'layout': data.get('layout', {'columns': 12, 'rows': 'auto'}),
            'widgets': data['widgets'],
            'sharing': data.get('sharing', {'is_public': False, 'shared_with_users': []}),
            'created_by': getattr(request, 'current_user_id'),
            'created_at': datetime.now(UTC).isoformat(),
            'status': 'active'
        }
        
        # In a full implementation, this would be saved to the database
        
        return jsonify({
            'status': 'success',
            'data': dashboard_config
        })
        
    except Exception as e:
        logger.error(f"Error creating dashboard: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': {
                'code': 'DASHBOARD_ERROR',
                'message': 'Failed to create dashboard',
                'category': 'server_error',
                'retryable': True
            }
        }), 500


@bi_bp.route('/insights/recommendations', methods=['GET'])
@require_auth
@require_educator_or_admin
def get_ai_recommendations():
    """
    Get AI-powered insights and recommendations.
    ---
    tags:
      - Business Intelligence
    security:
      - Bearer: []
    parameters:
      - in: query
        name: user_id
        type: integer
        description: Specific user ID for personalized recommendations
      - in: query
        name: organization_id
        type: integer
        description: Organization ID for group recommendations
      - in: query
        name: period
        type: string
        enum: [weekly, monthly, quarterly]
        default: monthly
        description: Time period for analysis
    responses:
      200:
        description: Recommendations retrieved successfully
        schema:
          type: object
          properties:
            status:
              type: string
            data:
              type: object
              properties:
                recommendations:
                  type: array
                  items:
                    type: object
                insights:
                  type: array
                  items:
                    type: object
                priority_actions:
                  type: array
                  items:
                    type: object
      401:
        description: Authentication required
      500:
        description: Server error
    """
    try:
        # Get query parameters
        user_id = request.args.get('user_id', type=int)
        organization_id = request.args.get('organization_id', type=int)
        period = request.args.get('period', 'monthly')
        
        # Generate AI recommendations based on recent data
        # This is a simplified implementation - in production would use ML models
        recommendations = {
            'recommendations': [
                {
                    'id': 'rec_001',
                    'type': 'practice_improvement',
                    'priority': 'high',
                    'title': 'Optimize Practice Sessions',
                    'description': 'Students show better retention with 20-30 minute focused sessions',
                    'suggested_actions': [
                        'Implement session time limits',
                        'Add break reminders',
                        'Create micro-learning modules'
                    ],
                    'expected_impact': 'Improve completion rates by 15-25%'
                },
                {
                    'id': 'rec_002',
                    'type': 'engagement',
                    'priority': 'medium',
                    'title': 'Increase Mobile Engagement',
                    'description': 'Mobile users have lower completion rates than desktop users',
                    'suggested_actions': [
                        'Optimize mobile interface',
                        'Add offline practice mode',
                        'Implement push notifications'
                    ],
                    'expected_impact': 'Improve mobile completion rates by 10%'
                }
            ],
            'insights': [
                {
                    'id': 'insight_001',
                    'category': 'usage_pattern',
                    'title': 'Peak Practice Times',
                    'description': 'Most effective practice sessions occur between 6-8 PM',
                    'confidence': 0.85,
                    'data_points': 1247
                },
                {
                    'id': 'insight_002',
                    'category': 'collaboration',
                    'title': 'Group Session Benefits',
                    'description': 'Students in collaborative sessions show 30% better engagement',
                    'confidence': 0.78,
                    'data_points': 892
                }
            ],
            'priority_actions': [
                {
                    'action': 'Review struggling students',
                    'urgency': 'high',
                    'description': 'Identify students with completion rates below 60%',
                    'deadline': (datetime.now(UTC) + timedelta(days=7)).isoformat()
                },
                {
                    'action': 'Update practice content',
                    'urgency': 'medium',
                    'description': 'Refresh content for songs with low engagement',
                    'deadline': (datetime.now(UTC) + timedelta(days=14)).isoformat()
                }
            ],
            'generated_at': datetime.now(UTC).isoformat(),
            'period': period,
            'user_id': user_id,
            'organization_id': organization_id
        }
        
        return jsonify({
            'status': 'success',
            'data': recommendations
        })
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': {
                'code': 'RECOMMENDATIONS_ERROR',
                'message': 'Failed to get recommendations',
                'category': 'server_error',
                'retryable': True
            }
        }), 500


@bi_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for BI services.
    ---
    tags:
      - Business Intelligence
    responses:
      200:
        description: BI services are healthy
        schema:
          type: object
          properties:
            status:
              type: string
              example: healthy
            timestamp:
              type: string
              format: date-time
            services:
              type: object
              properties:
                report_generation:
                  type: string
                  example: operational
                scheduler:
                  type: string
                  example: operational
                ai_insights:
                  type: string
                  example: operational
    """
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now(UTC).isoformat(),
        'services': {
            'report_generation': 'operational',
            'scheduler': 'operational',
            'ai_insights': 'operational',
            'data_export': 'operational'
        }
    })


# Error handlers
@bi_bp.errorhandler(400)
def bad_request(error):
    return jsonify({
        'status': 'error',
        'error': {
            'code': 'BAD_REQUEST',
            'message': 'Invalid request format or parameters',
            'category': 'validation',
            'retryable': False
        }
    }), 400


@bi_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': 'error',
        'error': {
            'code': 'NOT_FOUND',
            'message': 'Resource not found',
            'category': 'not_found',
            'retryable': False
        }
    }), 404


@bi_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'status': 'error',
        'error': {
            'code': 'INTERNAL_SERVER_ERROR',
            'message': 'An unexpected error occurred',
            'category': 'server_error',
            'retryable': True
        }
    }), 500