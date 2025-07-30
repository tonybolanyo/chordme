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
