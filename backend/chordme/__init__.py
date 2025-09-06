from flask import Flask, send_from_directory, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event
import os

# Import version information
try:
    from .version import __version__
except ImportError:
    __version__ = "unknown"

# Set up static folder path - go up from backend/chordme to root, then to frontend
current_dir = os.path.dirname(os.path.abspath(__file__))  # backend/chordme
backend_dir = os.path.dirname(current_dir)  # backend
root_dir = os.path.dirname(backend_dir)  # project root
static_folder = os.path.join(root_dir, 'frontend')

app = Flask(__name__, static_folder=static_folder, static_url_path='')
config_name = os.environ.get('FLASK_CONFIG', 'config')
app.config.from_object(config_name)
cors = CORS(app, resources={
  r'/api/*': {
    'origins': '*',
  }
})

# Initialize database
db = SQLAlchemy(app)

# Initialize Swagger documentation
from flasgger import Swagger
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec',
            "route": '/apispec.json',
            "rule_filter": lambda rule: True,  # all in
            "model_filter": lambda tag: True,  # all in
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/apidocs/"
}

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "ChordMe API",
        "description": "API for ChordMe - A ChordPro song management application",
        "version": "1.0.0",
        "contact": {
            "name": "ChordMe",
            "url": "https://github.com/tonybolanyo/chordme"
        }
    },
    "basePath": "/api/v1",
    "schemes": ["http", "https"],
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "JWT token. Format: Bearer {token}"
        }
    },
    "definitions": {
        "User": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "User ID"},
                "email": {"type": "string", "format": "email", "description": "User email address"},
                "created_at": {"type": "string", "format": "date-time", "description": "Account creation timestamp"}
            }
        },
        "Song": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Song ID"},
                "title": {"type": "string", "description": "Song title"},
                "content": {"type": "string", "description": "ChordPro content"},
                "author_id": {"type": "integer", "description": "ID of the user who created the song"},
                "created_at": {"type": "string", "format": "date-time", "description": "Song creation timestamp"},
                "updated_at": {"type": "string", "format": "date-time", "description": "Song last update timestamp"}
            }
        },
        "Error": {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string", 
                    "example": "error",
                    "description": "Response status indicator"
                },
                "error": {
                    "oneOf": [
                        {
                            "type": "string",
                            "description": "Legacy error message format"
                        },
                        {
                            "type": "object",
                            "properties": {
                                "code": {
                                    "type": "string",
                                    "description": "Standardized error code",
                                    "example": "INVALID_EMAIL"
                                },
                                "message": {
                                    "type": "string",
                                    "description": "User-friendly error message",
                                    "example": "Please enter a valid email address"
                                },
                                "category": {
                                    "type": "string",
                                    "description": "Error category",
                                    "enum": ["validation", "authentication", "authorization", "not_found", "conflict", "rate_limit", "server_error", "network"],
                                    "example": "validation"
                                },
                                "retryable": {
                                    "type": "boolean",
                                    "description": "Whether the operation can be retried",
                                    "example": False
                                },
                                "details": {
                                    "type": "object",
                                    "description": "Additional error details (debug mode only)"
                                }
                            },
                            "required": ["message", "retryable"]
                        }
                    ]
                }
            },
            "required": ["status", "error"]
        },
        "ValidationError": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "example": "error"},
                "error": {
                    "type": "object",
                    "properties": {
                        "code": {"type": "string", "example": "INVALID_EMAIL"},
                        "message": {"type": "string", "example": "Please enter a valid email address"},
                        "category": {"type": "string", "example": "validation"},
                        "retryable": {"type": "boolean", "example": False}
                    }
                }
            }
        },
        "AuthenticationError": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "example": "error"},
                "error": {
                    "type": "object",
                    "properties": {
                        "code": {"type": "string", "example": "TOKEN_EXPIRED"},
                        "message": {"type": "string", "example": "Your session has expired. Please log in again"},
                        "category": {"type": "string", "example": "authentication"},
                        "retryable": {"type": "boolean", "example": False}
                    }
                }
            }
        },
        "ServerError": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "example": "error"},
                "error": {
                    "type": "object",
                    "properties": {
                        "code": {"type": "string", "example": "INTERNAL_SERVER_ERROR"},
                        "message": {"type": "string", "example": "An unexpected error occurred. Please try again"},
                        "category": {"type": "string", "example": "server_error"},
                        "retryable": {"type": "boolean", "example": True}
                    }
                }
            }
        },
        "Success": {
            "type": "object", 
            "properties": {
                "status": {
                    "type": "string", 
                    "example": "success",
                    "description": "Response status indicator"
                },
                "message": {
                    "type": "string", 
                    "description": "Success message"
                },
                "data": {
                    "type": "object", 
                    "description": "Response data"
                }
            },
            "required": ["status"]
        }
    }
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

# Initialize HTTPS enforcement
from .https_enforcement import HTTPSEnforcement
https_enforcement = HTTPSEnforcement(app)

# Initialize logging and monitoring
from .logging_config import setup_logging
from .monitoring import setup_monitoring

setup_logging(app)
setup_monitoring(app)

# Import API routes (must come after db initialization)
from . import api
from . import search_routes

# Register search blueprint
app.register_blueprint(search_routes.search_bp)

# Initialize CLI commands for chord management
from . import chord_cli
chord_cli.init_app(app)

# Enable foreign key constraints for SQLite - must be set up after app context is available
def enable_foreign_key_constraints():
    """Enable foreign key constraints for SQLite databases."""
    
    @event.listens_for(db.engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        """Enable foreign key constraints in SQLite."""
        if 'sqlite' in str(dbapi_connection):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

# Set up the foreign key event listener when the module is imported
try:
    with app.app_context():
        enable_foreign_key_constraints()
except RuntimeError:
    # If app context isn't available yet, set up the listener directly
    from sqlalchemy import event
    
    @event.listens_for(db.engine, "connect", insert=True)
    def set_sqlite_pragma(dbapi_connection, connection_record):
        """Enable foreign key constraints in SQLite."""
        if 'sqlite' in str(dbapi_connection):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
