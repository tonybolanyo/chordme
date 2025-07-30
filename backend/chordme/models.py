from . import db
from datetime import datetime
from flask import current_app
import bcrypt
import logging

logger = logging.getLogger(__name__)


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to songs
    songs = db.relationship('Song', backref='author', lazy=True, cascade='all, delete-orphan')
    
    def __init__(self, email, password):
        self.email = email
        self.set_password(password)
    
    def set_password(self, password):
        """
        Hash and set the password using bcrypt.
        
        Args:
            password (str): The plain text password to hash
            
        Raises:
            ValueError: If password is empty or invalid
            RuntimeError: If password hashing fails
        """
        if not password:
            raise ValueError("Password cannot be empty")
        
        if not isinstance(password, str):
            raise ValueError("Password must be a string")
            
        try:
            # Get bcrypt rounds from configuration, default to 12
            try:
                rounds = current_app.config.get('BCRYPT_ROUNDS', 12)
            except RuntimeError:
                # If app context is not available, use default
                rounds = 12
            
            # Encode password to bytes
            password_bytes = password.encode('utf-8')
            
            # Generate salt with configured rounds
            salt = bcrypt.gensalt(rounds=rounds)
            
            # Hash password
            password_hash = bcrypt.hashpw(password_bytes, salt)
            
            # Store as string
            self.password_hash = password_hash.decode('utf-8')
            
            logger.debug(f"Password hashed successfully for user with {rounds} rounds")
            
        except Exception as e:
            logger.error(f"Password hashing failed: {str(e)}")
            raise RuntimeError(f"Failed to hash password: {str(e)}")
    
    def check_password(self, password):
        """
        Check if the provided password matches the stored hash.
        
        Args:
            password (str): The plain text password to verify
            
        Returns:
            bool: True if password matches, False otherwise
            
        Raises:
            ValueError: If password is empty or invalid
        """
        if not password:
            return False
            
        if not isinstance(password, str):
            return False
            
        if not self.password_hash:
            return False
            
        try:
            # Encode inputs to bytes
            password_bytes = password.encode('utf-8')
            hash_bytes = self.password_hash.encode('utf-8')
            
            # Verify password using bcrypt
            return bcrypt.checkpw(password_bytes, hash_bytes)
            
        except Exception as e:
            logger.error(f"Password verification failed: {str(e)}")
            return False
    
    def to_dict(self):
        """Convert user to dictionary (excluding password)."""
        return {
            'id': self.id,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<User {self.email}>'


class Song(db.Model):
    __tablename__ = 'songs'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __init__(self, title, author_id, content):
        self.title = title
        self.author_id = author_id
        self.content = content
    
    def to_dict(self):
        """Convert song to dictionary."""
        return {
            'id': self.id,
            'title': self.title,
            'author_id': self.author_id,
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Song {self.title}>'