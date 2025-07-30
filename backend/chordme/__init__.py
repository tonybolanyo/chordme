from flask import Flask, send_from_directory, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event
import os

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
    "host": "localhost:5000",
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
                "success": {"type": "boolean", "example": False},
                "message": {"type": "string", "description": "Error message"},
                "status_code": {"type": "integer", "description": "HTTP status code"}
            }
        },
        "Success": {
            "type": "object", 
            "properties": {
                "success": {"type": "boolean", "example": True},
                "message": {"type": "string", "description": "Success message"},
                "data": {"type": "object", "description": "Response data"}
            }
        }
    }
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

# Initialize HTTPS enforcement
from .https_enforcement import HTTPSEnforcement
https_enforcement = HTTPSEnforcement(app)

# Import API routes (must come after db initialization)
from . import api

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
