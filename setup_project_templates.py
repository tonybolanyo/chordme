#!/usr/bin/env python3
"""
Create sample project templates in the database for testing.
"""

import os
import sys
from datetime import datetime, timedelta

# Set up environment
os.environ['FLASK_CONFIG'] = 'test_config'

# Add the backend directory to Python path
sys.path.insert(0, '/home/runner/work/chordme/chordme/backend')

def create_sample_templates():
    """Create sample project templates for testing."""
    try:
        from chordme import create_app
        from chordme.models import ProjectTemplate, User, db
        from chordme.project_templates import DEFAULT_TEMPLATES
        
        app = create_app()
        
        with app.app_context():
            # Create database tables
            db.create_all()
            
            # Create a sample user if none exists
            user = User.query.first()
            if not user:
                user = User(email='admin@chordme.com', password='password123')
                db.session.add(user)
                db.session.commit()
                print(f"✅ Created sample user: {user.email}")
            
            # Check if templates already exist
            existing_templates = ProjectTemplate.query.count()
            if existing_templates > 0:
                print(f"ℹ️  Found {existing_templates} existing templates")
                return
            
            # Create project templates
            print("🏗️  Creating sample project templates...")
            
            for template_data in DEFAULT_TEMPLATES:
                template = ProjectTemplate(
                    name=template_data['name'],
                    description=template_data['description'],
                    template_type=template_data['template_type'],
                    category=template_data['category'],
                    stages=template_data['stages'],
                    default_tasks=template_data['default_tasks'],
                    default_milestones=template_data['default_milestones'],
                    estimated_duration_days=template_data['estimated_duration_days'],
                    is_public=True,
                    usage_count=0,
                    created_by=user.id,
                    localized_names=template_data.get('localized_names', {}),
                    localized_descriptions=template_data.get('localized_descriptions', {})
                )
                
                db.session.add(template)
                print(f"   • {template.name} ({template.template_type})")
            
            db.session.commit()
            
            # Verify creation
            total_templates = ProjectTemplate.query.count()
            print(f"✅ Created {total_templates} project templates successfully")
            
            # Display template details
            print("\n📋 Template Summary:")
            for template in ProjectTemplate.query.all():
                print(f"   {template.name}")
                print(f"     Type: {template.template_type}")
                print(f"     Duration: {template.estimated_duration_days} days")
                print(f"     Tasks: {len(template.default_tasks)}")
                print(f"     Milestones: {len(template.default_milestones)}")
                print(f"     Stages: {len(template.stages)}")
                print()
            
            return True
            
    except Exception as e:
        print(f"❌ Error creating templates: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_template_usage():
    """Test creating a project from a template."""
    try:
        from chordme import create_app
        from chordme.models import Project, ProjectTask, ProjectMilestone, ProjectTemplate, db
        
        app = create_app()
        
        with app.app_context():
            # Get the first template
            template = ProjectTemplate.query.filter_by(template_type='album_production').first()
            if not template:
                print("❌ No album production template found")
                return False
            
            print(f"🎵 Testing project creation from template: {template.name}")
            
            # Create a test project
            start_date = datetime.now()
            end_date = start_date + timedelta(days=template.estimated_duration_days)
            
            project = Project(
                name=f"Test Album - {datetime.now().strftime('%Y%m%d')}",
                description="A test album project created from template",
                project_type=template.template_type.replace('_production', ''),
                owner_id=1,
                template_id=template.id,
                start_date=start_date,
                target_end_date=end_date,
                status='planning',
                overall_progress=0
            )
            
            db.session.add(project)
            db.session.flush()  # Get the project ID
            
            # Create tasks from template
            tasks_created = 0
            for task_template in template.default_tasks:
                task = ProjectTask(
                    project_id=project.id,
                    title=task_template['title'],
                    description=task_template.get('description', ''),
                    task_type=task_template.get('task_type', 'general'),
                    priority=task_template.get('priority', 'normal'),
                    estimated_hours=task_template.get('estimated_hours'),
                    created_by=project.owner_id,
                    status='todo',
                    progress_percentage=0
                )
                
                # Set due date relative to project start
                if task_template.get('days_from_start'):
                    task.due_date = start_date + timedelta(days=task_template['days_from_start'])
                
                db.session.add(task)
                tasks_created += 1
            
            # Create milestones from template
            milestones_created = 0
            for milestone_template in template.default_milestones:
                milestone = ProjectMilestone(
                    project_id=project.id,
                    name=milestone_template['name'],
                    description=milestone_template.get('description', ''),
                    milestone_type=milestone_template.get('milestone_type', 'deliverable'),
                    priority=milestone_template.get('priority', 'normal'),
                    status='upcoming',
                    completion_percentage=0
                )
                
                # Set target date relative to project start
                if milestone_template.get('days_from_start'):
                    milestone.target_date = start_date + timedelta(days=milestone_template['days_from_start'])
                elif milestone_template.get('days_before_end'):
                    milestone.target_date = end_date - timedelta(days=milestone_template['days_before_end'])
                
                db.session.add(milestone)
                milestones_created += 1
            
            db.session.commit()
            
            print(f"✅ Created test project: {project.name}")
            print(f"   • Project ID: {project.id}")
            print(f"   • Tasks created: {tasks_created}")
            print(f"   • Milestones created: {milestones_created}")
            print(f"   • Duration: {template.estimated_duration_days} days")
            print(f"   • Start: {start_date.strftime('%Y-%m-%d')}")
            print(f"   • End: {end_date.strftime('%Y-%m-%d')}")
            
            # Update template usage count
            template.usage_count += 1
            db.session.commit()
            
            return True
            
    except Exception as e:
        print(f"❌ Error testing template usage: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🎵 ChordMe Project Templates Setup")
    print("=" * 40)
    
    success = True
    
    if not create_sample_templates():
        success = False
    
    if not test_template_usage():
        success = False
    
    if success:
        print("\n🎉 Project templates setup completed successfully!")
        print("\n🚀 Ready to test project management features:")
        print("   • Album Production workflow (180 days, 10 tasks, 4 milestones)")
        print("   • Tour Management workflow (120 days, 10 tasks, 4 milestones)")
        print("   • Music Lesson Plan workflow (90 days, 10 tasks, 4 milestones)")
    else:
        print("\n❌ Setup failed. Please check the errors above.")
        sys.exit(1)