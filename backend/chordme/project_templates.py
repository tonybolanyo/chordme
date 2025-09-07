"""
Project template data for music-specific workflows.
"""

# Album Production Template
ALBUM_PRODUCTION_TEMPLATE = {
    'name': 'Album Production',
    'description': 'Complete album production workflow from pre-production to mastering',
    'template_type': 'album_production',
    'category': 'music',
    'estimated_duration_days': 180,
    'stages': [
        {
            'id': 'pre_production',
            'name': 'Pre-Production',
            'description': 'Song selection, arrangements, and demos',
            'order': 1,
            'estimated_days': 30,
            'dependencies': []
        },
        {
            'id': 'recording',
            'name': 'Recording',
            'description': 'Tracking instruments and vocals',
            'order': 2,
            'estimated_days': 90,
            'dependencies': ['pre_production']
        },
        {
            'id': 'mixing',
            'name': 'Mixing',
            'description': 'Sound design and mix revisions',
            'order': 3,
            'estimated_days': 45,
            'dependencies': ['recording']
        },
        {
            'id': 'mastering',
            'name': 'Mastering',
            'description': 'Final mastering and delivery',
            'order': 4,
            'estimated_days': 15,
            'dependencies': ['mixing']
        }
    ],
    'default_tasks': [
        {
            'title': 'Song Selection & Arrangement',
            'description': 'Select songs for the album and finalize arrangements',
            'task_type': 'songwriting',
            'priority': 'high',
            'estimated_hours': 40,
            'days_from_start': 0,
            'stage_id': 'pre_production'
        },
        {
            'title': 'Demo Recording',
            'description': 'Record demo versions of all songs',
            'task_type': 'recording',
            'priority': 'high',
            'estimated_hours': 60,
            'days_from_start': 15,
            'stage_id': 'pre_production'
        },
        {
            'title': 'Studio Booking',
            'description': 'Book recording studio and schedule sessions',
            'task_type': 'administrative',
            'priority': 'urgent',
            'estimated_hours': 8,
            'days_from_start': 20,
            'stage_id': 'pre_production'
        },
        {
            'title': 'Drum Tracking',
            'description': 'Record drum tracks for all songs',
            'task_type': 'recording',
            'priority': 'high',
            'estimated_hours': 80,
            'days_from_start': 30,
            'stage_id': 'recording'
        },
        {
            'title': 'Bass Tracking',
            'description': 'Record bass tracks',
            'task_type': 'recording',
            'priority': 'high',
            'estimated_hours': 40,
            'days_from_start': 45,
            'stage_id': 'recording'
        },
        {
            'title': 'Guitar Tracking',
            'description': 'Record guitar parts',
            'task_type': 'recording',
            'priority': 'high',
            'estimated_hours': 60,
            'days_from_start': 60,
            'stage_id': 'recording'
        },
        {
            'title': 'Vocal Tracking',
            'description': 'Record lead and backing vocals',
            'task_type': 'recording',
            'priority': 'high',
            'estimated_hours': 100,
            'days_from_start': 90,
            'stage_id': 'recording'
        },
        {
            'title': 'Rough Mix Creation',
            'description': 'Create rough mixes for review',
            'task_type': 'arrangement',
            'priority': 'normal',
            'estimated_hours': 80,
            'days_from_start': 120,
            'stage_id': 'mixing'
        },
        {
            'title': 'Final Mixing',
            'description': 'Complete final mixes for all tracks',
            'task_type': 'arrangement',
            'priority': 'high',
            'estimated_hours': 120,
            'days_from_start': 135,
            'stage_id': 'mixing'
        },
        {
            'title': 'Mastering',
            'description': 'Master all tracks for final release',
            'task_type': 'arrangement',
            'priority': 'urgent',
            'estimated_hours': 40,
            'days_from_start': 165,
            'stage_id': 'mastering'
        }
    ],
    'default_milestones': [
        {
            'name': 'Songs Selected',
            'description': 'All songs selected and arrangements finalized',
            'milestone_type': 'deliverable',
            'priority': 'high',
            'days_from_start': 25
        },
        {
            'name': 'Recording Complete',
            'description': 'All tracking sessions completed',
            'milestone_type': 'deliverable',
            'priority': 'critical',
            'days_from_start': 120
        },
        {
            'name': 'Mixing Complete',
            'description': 'All songs mixed and approved',
            'milestone_type': 'deliverable',
            'priority': 'critical',
            'days_from_start': 165
        },
        {
            'name': 'Album Ready',
            'description': 'Album mastered and ready for release',
            'milestone_type': 'release',
            'priority': 'critical',
            'days_from_start': 180
        }
    ],
    'localized_names': {
        'en': 'Album Production',
        'es': 'Producción de Álbum'
    },
    'localized_descriptions': {
        'en': 'Complete album production workflow from pre-production to mastering',
        'es': 'Flujo completo de producción de álbum desde pre-producción hasta masterización'
    }
}

# Tour Management Template
TOUR_MANAGEMENT_TEMPLATE = {
    'name': 'Tour Management',
    'description': 'Comprehensive tour planning and execution workflow',
    'template_type': 'tour_management',
    'category': 'music',
    'estimated_duration_days': 120,
    'stages': [
        {
            'id': 'planning',
            'name': 'Tour Planning',
            'description': 'Route planning and venue booking',
            'order': 1,
            'estimated_days': 45,
            'dependencies': []
        },
        {
            'id': 'preparation',
            'name': 'Pre-Tour Preparation',
            'description': 'Rehearsals and setlist planning',
            'order': 2,
            'estimated_days': 30,
            'dependencies': ['planning']
        },
        {
            'id': 'execution',
            'name': 'Tour Execution',
            'description': 'Live performances and daily operations',
            'order': 3,
            'estimated_days': 30,
            'dependencies': ['preparation']
        },
        {
            'id': 'wrap_up',
            'name': 'Post-Tour',
            'description': 'Tour wrap-up and reconciliation',
            'order': 4,
            'estimated_days': 15,
            'dependencies': ['execution']
        }
    ],
    'default_tasks': [
        {
            'title': 'Route Planning',
            'description': 'Plan tour route and identify potential venues',
            'task_type': 'administrative',
            'priority': 'high',
            'estimated_hours': 40,
            'days_from_start': 0,
            'stage_id': 'planning'
        },
        {
            'title': 'Venue Booking',
            'description': 'Contact and book venues for tour dates',
            'task_type': 'administrative',
            'priority': 'urgent',
            'estimated_hours': 60,
            'days_from_start': 10,
            'stage_id': 'planning'
        },
        {
            'title': 'Transportation Arrangements',
            'description': 'Arrange tour bus, flights, or other transportation',
            'task_type': 'administrative',
            'priority': 'high',
            'estimated_hours': 20,
            'days_from_start': 25,
            'stage_id': 'planning'
        },
        {
            'title': 'Accommodation Booking',
            'description': 'Book hotels and lodging for tour dates',
            'task_type': 'administrative',
            'priority': 'normal',
            'estimated_hours': 16,
            'days_from_start': 30,
            'stage_id': 'planning'
        },
        {
            'title': 'Setlist Creation',
            'description': 'Create and finalize setlist for tour',
            'task_type': 'arrangement',
            'priority': 'high',
            'estimated_hours': 20,
            'days_from_start': 45,
            'stage_id': 'preparation'
        },
        {
            'title': 'Rehearsals',
            'description': 'Conduct intensive rehearsals for tour material',
            'task_type': 'rehearsal',
            'priority': 'critical',
            'estimated_hours': 120,
            'days_from_start': 50,
            'stage_id': 'preparation'
        },
        {
            'title': 'Equipment Preparation',
            'description': 'Prepare, test, and pack all equipment',
            'task_type': 'administrative',
            'priority': 'urgent',
            'estimated_hours': 40,
            'days_from_start': 70,
            'stage_id': 'preparation'
        },
        {
            'title': 'Tour Execution',
            'description': 'Execute tour performances and daily operations',
            'task_type': 'performance',
            'priority': 'critical',
            'estimated_hours': 300,
            'days_from_start': 75,
            'stage_id': 'execution'
        },
        {
            'title': 'Financial Reconciliation',
            'description': 'Reconcile tour finances and expenses',
            'task_type': 'administrative',
            'priority': 'normal',
            'estimated_hours': 16,
            'days_from_start': 105,
            'stage_id': 'wrap_up'
        },
        {
            'title': 'Post-Tour Analysis',
            'description': 'Analyze tour performance and document lessons learned',
            'task_type': 'administrative',
            'priority': 'low',
            'estimated_hours': 12,
            'days_from_start': 115,
            'stage_id': 'wrap_up'
        }
    ],
    'default_milestones': [
        {
            'name': 'Tour Booked',
            'description': 'All venues booked and tour dates confirmed',
            'milestone_type': 'deadline',
            'priority': 'critical',
            'days_from_start': 35
        },
        {
            'name': 'Rehearsals Complete',
            'description': 'All rehearsals completed and band tour-ready',
            'milestone_type': 'checkpoint',
            'priority': 'critical',
            'days_from_start': 75
        },
        {
            'name': 'Tour Launch',
            'description': 'First show of the tour',
            'milestone_type': 'release',
            'priority': 'critical',
            'days_from_start': 75
        },
        {
            'name': 'Tour Complete',
            'description': 'Final show performed and tour wrapped up',
            'milestone_type': 'deliverable',
            'priority': 'critical',
            'days_from_start': 105
        }
    ],
    'localized_names': {
        'en': 'Tour Management',
        'es': 'Gestión de Gira'
    },
    'localized_descriptions': {
        'en': 'Comprehensive tour planning and execution workflow',
        'es': 'Flujo completo de planificación y ejecución de gira'
    }
}

# Lesson Plan Template
LESSON_PLAN_TEMPLATE = {
    'name': 'Music Lesson Plan',
    'description': 'Structured learning environment for music education',
    'template_type': 'lesson_plan',
    'category': 'education',
    'estimated_duration_days': 90,
    'stages': [
        {
            'id': 'assessment',
            'name': 'Student Assessment',
            'description': 'Assess student skill level and goals',
            'order': 1,
            'estimated_days': 7,
            'dependencies': []
        },
        {
            'id': 'curriculum',
            'name': 'Curriculum Development',
            'description': 'Develop personalized curriculum',
            'order': 2,
            'estimated_days': 14,
            'dependencies': ['assessment']
        },
        {
            'id': 'instruction',
            'name': 'Instruction Period',
            'description': 'Weekly lessons and practice',
            'order': 3,
            'estimated_days': 60,
            'dependencies': ['curriculum']
        },
        {
            'id': 'evaluation',
            'name': 'Progress Evaluation',
            'description': 'Evaluate student progress and plan next steps',
            'order': 4,
            'estimated_days': 9,
            'dependencies': ['instruction']
        }
    ],
    'default_tasks': [
        {
            'title': 'Initial Skill Assessment',
            'description': 'Assess student\'s current musical skills and experience',
            'task_type': 'general',
            'priority': 'high',
            'estimated_hours': 2,
            'days_from_start': 0,
            'stage_id': 'assessment'
        },
        {
            'title': 'Goal Setting Session',
            'description': 'Work with student to set learning goals',
            'task_type': 'general',
            'priority': 'high',
            'estimated_hours': 1,
            'days_from_start': 3,
            'stage_id': 'assessment'
        },
        {
            'title': 'Curriculum Planning',
            'description': 'Develop personalized curriculum based on assessment',
            'task_type': 'general',
            'priority': 'high',
            'estimated_hours': 8,
            'days_from_start': 7,
            'stage_id': 'curriculum'
        },
        {
            'title': 'Resource Preparation',
            'description': 'Prepare lesson materials and resources',
            'task_type': 'general',
            'priority': 'normal',
            'estimated_hours': 12,
            'days_from_start': 14,
            'stage_id': 'curriculum'
        },
        {
            'title': 'Weekly Lessons',
            'description': 'Conduct weekly music lessons',
            'task_type': 'general',
            'priority': 'critical',
            'estimated_hours': 120,
            'days_from_start': 21,
            'stage_id': 'instruction'
        },
        {
            'title': 'Practice Assignment',
            'description': 'Assign and track student practice sessions',
            'task_type': 'general',
            'priority': 'normal',
            'estimated_hours': 30,
            'days_from_start': 21,
            'stage_id': 'instruction'
        },
        {
            'title': 'Progress Tracking',
            'description': 'Track and document student progress',
            'task_type': 'general',
            'priority': 'normal',
            'estimated_hours': 20,
            'days_from_start': 30,
            'stage_id': 'instruction'
        },
        {
            'title': 'Final Assessment',
            'description': 'Conduct final skill assessment',
            'task_type': 'general',
            'priority': 'high',
            'estimated_hours': 2,
            'days_from_start': 81,
            'stage_id': 'evaluation'
        },
        {
            'title': 'Progress Report',
            'description': 'Create comprehensive progress report',
            'task_type': 'general',
            'priority': 'normal',
            'estimated_hours': 4,
            'days_from_start': 84,
            'stage_id': 'evaluation'
        },
        {
            'title': 'Next Steps Planning',
            'description': 'Plan future learning objectives',
            'task_type': 'general',
            'priority': 'normal',
            'estimated_hours': 2,
            'days_from_start': 87,
            'stage_id': 'evaluation'
        }
    ],
    'default_milestones': [
        {
            'name': 'Assessment Complete',
            'description': 'Student assessment and goal setting completed',
            'milestone_type': 'checkpoint',
            'priority': 'high',
            'days_from_start': 7
        },
        {
            'name': 'Curriculum Ready',
            'description': 'Personalized curriculum and materials prepared',
            'milestone_type': 'checkpoint',
            'priority': 'high',
            'days_from_start': 21
        },
        {
            'name': 'Mid-Term Review',
            'description': 'Mid-term progress review and adjustments',
            'milestone_type': 'checkpoint',
            'priority': 'normal',
            'days_from_start': 50
        },
        {
            'name': 'Course Complete',
            'description': 'Lesson plan completed and student evaluated',
            'milestone_type': 'deliverable',
            'priority': 'high',
            'days_from_start': 90
        }
    ],
    'localized_names': {
        'en': 'Music Lesson Plan',
        'es': 'Plan de Lecciones Musicales'
    },
    'localized_descriptions': {
        'en': 'Structured learning environment for music education',
        'es': 'Ambiente de aprendizaje estructurado para educación musical'
    }
}

# Default templates available in the system
DEFAULT_TEMPLATES = [
    ALBUM_PRODUCTION_TEMPLATE,
    TOUR_MANAGEMENT_TEMPLATE,
    LESSON_PLAN_TEMPLATE
]