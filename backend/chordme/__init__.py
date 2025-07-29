from flask import Flask, send_from_directory, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os

# Set up static folder path - go up from backend/chordme to root, then to frontend
current_dir = os.path.dirname(os.path.abspath(__file__))  # backend/chordme
backend_dir = os.path.dirname(current_dir)  # backend
root_dir = os.path.dirname(backend_dir)  # project root
static_folder = os.path.join(root_dir, 'frontend')

app = Flask(__name__, static_folder=static_folder, static_url_path='')
app.config.from_object('config')
cors = CORS(app, resources={
  r'/api/*': {
    'origins': '*',
  }
})

# Initialize database
db = SQLAlchemy(app)

# Import API routes (must come after db initialization)
from . import api
