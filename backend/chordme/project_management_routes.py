"""
Project Management API routes for advanced project management tools.
Handles projects, tasks, milestones, time tracking, and templates.
"""

from . import app, db
from .models import (
    Project, ProjectTask, ProjectMilestone, TimeEntry, ProjectTemplate,
    User, Setlist, CollaborationRoom
)
from .utils import auth_required, create_error_response, create_success_response, validate_request_size, sanitize_input
from .rate_limiter import rate_limit
from .security_headers import security_headers
from flask import request, jsonify, g, current_app
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
import uuid


# Project Management Endpoints

@app.route('/api/v1/projects', methods=['POST'])
@rate_limit("10 per hour")
@security_headers
@validate_request_size(max_content_length=1024*1024)  # 1MB limit
@auth_required
def create_project():
    """
    Create a new project.
    ---
    tags:
      - Project Management
    summary: Create new project
    description: Create a new project for managing tasks and milestones
    parameters:
      - in: body
        name: project_data
        schema:
          type: object
          required:
            - name
          properties:
            name:
              type: string
              description: Project name
            description:
              type: string
              description: Project description
            project_type:
              type: string
              enum: [album, tour, lesson_plan, general]
              description: Type of project
            start_date:
              type: string
              format: date-time
              description: Project start date
            target_end_date:
              type: string
              format: date-time
              description: Target completion date
            collaboration_room_id:
              type: integer
              description: Associated collaboration room ID
            template_id:
              type: integer
              description: Project template to use
            tags:
              type: array
              items:
                type: string
              description: Project tags
    responses:
      201:
        description: Project created successfully
      400:
        description: Invalid input data
      401:
        description: Authentication required
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or not data.get('name'):
            return create_error_response("Project name is required", 400)
        
        # Sanitize inputs
        project_data = {
            'name': sanitize_input(data['name'][:255]),
            'description': sanitize_input(data.get('description', '')[:2000]) if data.get('description') else None,
            'project_type': data.get('project_type', 'general'),
            'owner_id': g.current_user.id,
            'tags': data.get('tags', [])
        }
        
        # Handle dates
        if data.get('start_date'):
            try:
                project_data['start_date'] = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
            except ValueError:
                return create_error_response("Invalid start_date format", 400)
        
        if data.get('target_end_date'):
            try:
                project_data['target_end_date'] = datetime.fromisoformat(data['target_end_date'].replace('Z', '+00:00'))
            except ValueError:
                return create_error_response("Invalid target_end_date format", 400)
        
        # Validate collaboration room if provided
        if data.get('collaboration_room_id'):
            room = CollaborationRoom.query.get(data['collaboration_room_id'])
            if not room:
                return create_error_response("Collaboration room not found", 404)
            project_data['collaboration_room_id'] = room.id
        
        # Create project
        project = Project(**project_data)
        db.session.add(project)
        db.session.flush()  # Get the ID
        
        # Apply template if provided
        if data.get('template_id'):
            template = ProjectTemplate.query.get(data['template_id'])
            if template:
                project.template_id = template.id
                template.usage_count += 1
                
                # Create default tasks from template
                for task_template in template.default_tasks:
                    task = ProjectTask(
                        project_id=project.id,
                        title=task_template['title'],
                        description=task_template.get('description'),
                        task_type=task_template.get('task_type', 'general'),
                        priority=task_template.get('priority', 'normal'),
                        estimated_hours=task_template.get('estimated_hours'),
                        created_by=g.current_user.id
                    )
                    
                    # Set due date relative to project start
                    if project.start_date and task_template.get('days_from_start'):
                        task.due_date = project.start_date + timedelta(days=task_template['days_from_start'])
                    
                    db.session.add(task)
                
                # Create default milestones from template
                for milestone_template in template.default_milestones:
                    milestone = ProjectMilestone(
                        project_id=project.id,
                        name=milestone_template['name'],
                        description=milestone_template.get('description'),
                        milestone_type=milestone_template.get('milestone_type', 'deliverable'),
                        priority=milestone_template.get('priority', 'normal')
                    )
                    
                    # Set target date relative to project start
                    if project.start_date and milestone_template.get('days_from_start'):
                        milestone.target_date = project.start_date + timedelta(days=milestone_template['days_from_start'])
                    elif project.target_end_date and milestone_template.get('days_before_end'):
                        milestone.target_date = project.target_end_date - timedelta(days=milestone_template['days_before_end'])
                    
                    db.session.add(milestone)
        
        db.session.commit()
        
        return create_success_response(
            "Project created successfully",
            project.to_dict(include_stats=True),
            201
        )
        
    except IntegrityError as e:
        db.session.rollback()
        return create_error_response("Database constraint violation", 400)
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating project: {str(e)}")
        return create_error_response("Failed to create project", 500)


@app.route('/api/v1/projects', methods=['GET'])
@rate_limit("100 per hour")
@security_headers
@auth_required
def list_projects():
    """
    List user's projects with filtering and pagination.
    ---
    tags:
      - Project Management
    summary: List projects
    description: Get a list of projects accessible to the current user
    parameters:
      - in: query
        name: project_type
        type: string
        description: Filter by project type
      - in: query
        name: status
        type: string
        description: Filter by project status
      - in: query
        name: page
        type: integer
        default: 1
        description: Page number
      - in: query
        name: per_page
        type: integer
        default: 20
        description: Items per page
      - in: query
        name: include_stats
        type: boolean
        default: false
        description: Include project statistics
    responses:
      200:
        description: List of projects
      401:
        description: Authentication required
    """
    try:
        # Get query parameters
        project_type = request.args.get('project_type')
        status = request.args.get('status')
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        include_stats = request.args.get('include_stats', 'false').lower() == 'true'
        
        # Build query - user can see projects they own or have access to via collaboration rooms
        base_query = Project.query.filter(
            or_(
                Project.owner_id == g.current_user.id,
                Project.is_public == True
            )
        )
        
        # Apply filters
        if project_type:
            base_query = base_query.filter(Project.project_type == project_type)
        if status:
            base_query = base_query.filter(Project.status == status)
        
        # Apply pagination
        projects = base_query.order_by(Project.updated_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Convert to dict
        project_list = [project.to_dict(include_stats=include_stats) for project in projects.items]
        
        return create_success_response(
            "Projects retrieved successfully",
            {
                'projects': project_list,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': projects.total,
                    'pages': projects.pages,
                    'has_next': projects.has_next,
                    'has_prev': projects.has_prev
                }
            }
        )
        
    except Exception as e:
        current_app.logger.error(f"Error listing projects: {str(e)}")
        return create_error_response("Failed to retrieve projects", 500)


@app.route('/api/v1/projects/<int:project_id>/tasks', methods=['POST'])
@rate_limit("20 per hour")
@security_headers
@validate_request_size(max_content_length=512*1024)  # 512KB limit
@auth_required
def create_project_task(project_id):
    """
    Create a new task in a project.
    ---
    tags:
      - Project Management
    summary: Create project task
    description: Create a new task within a project
    parameters:
      - in: path
        name: project_id
        type: integer
        required: true
        description: Project ID
      - in: body
        name: task_data
        schema:
          type: object
          required:
            - title
          properties:
            title:
              type: string
              description: Task title
            description:
              type: string
              description: Task description
            task_type:
              type: string
              enum: [songwriting, arrangement, recording, rehearsal, performance, administrative, general]
            priority:
              type: string
              enum: [low, normal, high, urgent]
            assigned_to:
              type: integer
              description: User ID to assign task to
            milestone_id:
              type: integer
              description: Associated milestone ID
            setlist_id:
              type: integer
              description: Associated setlist ID
            estimated_hours:
              type: number
              description: Estimated hours for completion
            due_date:
              type: string
              format: date-time
            parent_task_id:
              type: integer
              description: Parent task ID for subtasks
            depends_on_tasks:
              type: array
              items:
                type: integer
              description: Task IDs this depends on
            tags:
              type: array
              items:
                type: string
    responses:
      201:
        description: Task created successfully
      400:
        description: Invalid input data
      401:
        description: Authentication required
      404:
        description: Project not found
    """
    try:
        # Check project access
        project = Project.query.get(project_id)
        if not project:
            return create_error_response("Project not found", 404)
        
        if project.owner_id != g.current_user.id:
            # TODO: Check collaboration room access
            return create_error_response("Access denied", 403)
        
        data = request.get_json()
        
        # Validate required fields
        if not data or not data.get('title'):
            return create_error_response("Task title is required", 400)
        
        # Create task
        task_data = {
            'project_id': project_id,
            'title': sanitize_input(data['title'][:255]),
            'description': sanitize_input(data.get('description', '')[:2000]) if data.get('description') else None,
            'task_type': data.get('task_type', 'general'),
            'priority': data.get('priority', 'normal'),
            'estimated_hours': data.get('estimated_hours'),
            'created_by': g.current_user.id,
            'parent_task_id': data.get('parent_task_id'),
            'setlist_id': data.get('setlist_id'),
            'milestone_id': data.get('milestone_id'),
            'assigned_to': data.get('assigned_to'),
            'depends_on_tasks': data.get('depends_on_tasks', []),
            'tags': data.get('tags', [])
        }
        
        # Handle due date
        if data.get('due_date'):
            try:
                task_data['due_date'] = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
            except ValueError:
                return create_error_response("Invalid due_date format", 400)
        
        # Validate assignee if provided
        if task_data['assigned_to']:
            assignee = User.query.get(task_data['assigned_to'])
            if not assignee:
                return create_error_response("Assigned user not found", 404)
        
        # Validate milestone if provided
        if task_data['milestone_id']:
            milestone = ProjectMilestone.query.filter_by(
                id=task_data['milestone_id'], 
                project_id=project_id
            ).first()
            if not milestone:
                return create_error_response("Milestone not found in this project", 404)
        
        # Validate setlist if provided
        if task_data['setlist_id']:
            setlist = Setlist.query.get(task_data['setlist_id'])
            if not setlist:
                return create_error_response("Setlist not found", 404)
        
        task = ProjectTask(**task_data)
        db.session.add(task)
        db.session.commit()
        
        return create_success_response(
            "Task created successfully",
            task.to_dict(),
            201
        )
        
    except IntegrityError as e:
        db.session.rollback()
        return create_error_response("Database constraint violation", 400)
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating task: {str(e)}")
        return create_error_response("Failed to create task", 500)


@app.route('/api/v1/projects/<int:project_id>/timeline', methods=['GET'])
@rate_limit("50 per hour")
@security_headers
@auth_required
def get_project_timeline(project_id):
    """
    Get project timeline data for Gantt chart visualization.
    ---
    tags:
      - Project Management
    summary: Get project timeline
    description: Get timeline data including tasks and milestones for Gantt chart
    parameters:
      - in: path
        name: project_id
        type: integer
        required: true
        description: Project ID
    responses:
      200:
        description: Timeline data retrieved successfully
      401:
        description: Authentication required
      404:
        description: Project not found
    """
    try:
        # Check project access
        project = Project.query.get(project_id)
        if not project:
            return create_error_response("Project not found", 404)
        
        if project.owner_id != g.current_user.id:
            # TODO: Check collaboration room access
            return create_error_response("Access denied", 403)
        
        # Get tasks with timeline data
        tasks = ProjectTask.query.filter_by(project_id=project_id).all()
        
        # Get milestones
        milestones = ProjectMilestone.query.filter_by(project_id=project_id).all()
        
        # Build timeline data structure
        timeline_data = {
            'project': project.to_dict(),
            'tasks': [],
            'milestones': [],
            'dependencies': []
        }
        
        # Process tasks for Gantt chart
        for task in tasks:
            task_data = task.to_dict()
            
            # Calculate timeline properties
            if task.start_date and task.due_date:
                duration = (task.due_date - task.start_date).days
                task_data['duration_days'] = max(1, duration)
            else:
                task_data['duration_days'] = 1
            
            # Add progress and status
            task_data['is_overdue'] = (
                task.due_date and 
                task.due_date < datetime.utcnow() and 
                task.status not in ['completed', 'cancelled']
            )
            
            timeline_data['tasks'].append(task_data)
            
            # Add dependencies
            for dep_task_id in task.depends_on_tasks:
                timeline_data['dependencies'].append({
                    'from': dep_task_id,
                    'to': task.id,
                    'type': 'finish_to_start'
                })
        
        # Process milestones
        for milestone in milestones:
            milestone_data = milestone.to_dict()
            milestone_data['is_overdue'] = (
                milestone.target_date and 
                milestone.target_date < datetime.utcnow() and 
                milestone.status not in ['completed']
            )
            timeline_data['milestones'].append(milestone_data)
        
        return create_success_response(
            "Timeline data retrieved successfully",
            timeline_data
        )
        
    except Exception as e:
        current_app.logger.error(f"Error getting project timeline: {str(e)}")
        return create_error_response("Failed to retrieve timeline data", 500)


@app.route('/api/v1/projects/<int:project_id>/time-entries', methods=['POST'])
@rate_limit("30 per hour")
@security_headers
@validate_request_size(max_content_length=256*1024)  # 256KB limit
@auth_required
def start_time_tracking(project_id):
    """
    Start or stop time tracking for a project or task.
    ---
    tags:
      - Project Management  
    summary: Track time entry
    description: Start or log time for a project or specific task
    parameters:
      - in: path
        name: project_id
        type: integer
        required: true
        description: Project ID
      - in: body
        name: time_data
        schema:
          type: object
          properties:
            task_id:
              type: integer
              description: Specific task ID (optional)
            description:
              type: string
              description: Time entry description
            activity_type:
              type: string
              enum: [work, meeting, research, practice, review]
            start_time:
              type: string
              format: date-time
              description: Start time (for manual entries)
            end_time:
              type: string
              format: date-time
              description: End time (for manual entries)
            duration_minutes:
              type: integer
              description: Duration in minutes (for manual entries)
            is_manual_entry:
              type: boolean
              description: Whether this is a manual time entry
    responses:
      201:
        description: Time entry created successfully
      400:
        description: Invalid input data
      401:
        description: Authentication required
      404:
        description: Project not found
    """
    try:
        # Check project access
        project = Project.query.get(project_id)
        if not project:
            return create_error_response("Project not found", 404)
        
        if project.owner_id != g.current_user.id:
            # TODO: Check collaboration room access
            return create_error_response("Access denied", 403)
        
        data = request.get_json() or {}
        
        # Check if user has a running timer
        running_timer = TimeEntry.query.filter_by(
            user_id=g.current_user.id,
            is_running=True
        ).first()
        
        if running_timer and not data.get('is_manual_entry'):
            # Stop the running timer
            running_timer.end_time = datetime.utcnow()
            running_timer.duration_minutes = int(
                (running_timer.end_time - running_timer.start_time).total_seconds() / 60
            )
            running_timer.is_running = False
            
            # Update task actual hours if applicable
            if running_timer.task_id:
                task = ProjectTask.query.get(running_timer.task_id)
                if task:
                    task.actual_hours = (task.actual_hours or 0) + (running_timer.duration_minutes / 60)
            
            db.session.commit()
            
            return create_success_response(
                "Timer stopped successfully",
                running_timer.to_dict()
            )
        
        # Create new time entry
        time_data = {
            'project_id': project_id,
            'user_id': g.current_user.id,
            'task_id': data.get('task_id'),
            'description': sanitize_input(data.get('description', '')[:500]) if data.get('description') else None,
            'activity_type': data.get('activity_type', 'work'),
            'is_manual_entry': data.get('is_manual_entry', False)
        }
        
        if time_data['is_manual_entry']:
            # Manual time entry
            if not data.get('start_time'):
                return create_error_response("Start time required for manual entries", 400)
            
            try:
                time_data['start_time'] = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
            except ValueError:
                return create_error_response("Invalid start_time format", 400)
            
            if data.get('end_time'):
                try:
                    time_data['end_time'] = datetime.fromisoformat(data['end_time'].replace('Z', '+00:00'))
                except ValueError:
                    return create_error_response("Invalid end_time format", 400)
            
            if data.get('duration_minutes'):
                time_data['duration_minutes'] = int(data['duration_minutes'])
                if not time_data.get('end_time'):
                    time_data['end_time'] = time_data['start_time'] + timedelta(minutes=time_data['duration_minutes'])
            elif time_data.get('end_time'):
                time_data['duration_minutes'] = int(
                    (time_data['end_time'] - time_data['start_time']).total_seconds() / 60
                )
        else:
            # Start new timer
            time_data['start_time'] = datetime.utcnow()
            time_data['is_running'] = True
        
        # Validate task if provided
        if time_data['task_id']:
            task = ProjectTask.query.filter_by(
                id=time_data['task_id'],
                project_id=project_id
            ).first()
            if not task:
                return create_error_response("Task not found in this project", 404)
        
        time_entry = TimeEntry(**time_data)
        db.session.add(time_entry)
        
        # Update task actual hours for manual entries
        if time_data['is_manual_entry'] and time_data['task_id'] and time_data.get('duration_minutes'):
            task = ProjectTask.query.get(time_data['task_id'])
            if task:
                task.actual_hours = (task.actual_hours or 0) + (time_data['duration_minutes'] / 60)
        
        db.session.commit()
        
        message = "Time entry logged successfully" if time_data['is_manual_entry'] else "Timer started successfully"
        return create_success_response(
            message,
            time_entry.to_dict(),
            201
        )
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error with time tracking: {str(e)}")
        return create_error_response("Failed to process time entry", 500)


@app.route('/api/v1/project-templates', methods=['GET'])
@rate_limit("50 per hour")
@security_headers
@auth_required  
def list_project_templates():
    """
    List available project templates.
    ---
    tags:
      - Project Management
    summary: List project templates
    description: Get available project templates for creating new projects
    parameters:
      - in: query
        name: template_type
        type: string
        description: Filter by template type
      - in: query
        name: category
        type: string
        description: Filter by category
      - in: query
        name: locale
        type: string
        default: en
        description: Localization locale
    responses:
      200:
        description: Templates retrieved successfully
      401:
        description: Authentication required
    """
    try:
        template_type = request.args.get('template_type')
        category = request.args.get('category')
        locale = request.args.get('locale', 'en')
        
        # Build query
        query = ProjectTemplate.query.filter(
            or_(
                ProjectTemplate.is_public == True,
                ProjectTemplate.created_by == g.current_user.id
            )
        )
        
        if template_type:
            query = query.filter(ProjectTemplate.template_type == template_type)
        if category:
            query = query.filter(ProjectTemplate.category == category)
        
        templates = query.order_by(ProjectTemplate.usage_count.desc()).all()
        
        # Convert to dict with localization
        template_list = [template.to_dict(locale=locale) for template in templates]
        
        return create_success_response(
            "Templates retrieved successfully",
            {'templates': template_list}
        )
        
    except Exception as e:
        current_app.logger.error(f"Error listing templates: {str(e)}")
        return create_error_response("Failed to retrieve templates", 500)