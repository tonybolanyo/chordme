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
    
    # Relationship to custom chords
    chords = db.relationship('Chord', backref='owner', lazy=True, cascade='all, delete-orphan')
    
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
            
            logger.debug("Password hashed successfully for user.")
            
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
    
    # Sharing model fields
    shared_with = db.Column(db.JSON, default=list)  # Array of user IDs or email addresses
    permissions = db.Column(db.JSON, default=dict)  # Object mapping user IDs to permission levels
    share_settings = db.Column(db.String(20), default='private')  # 'private', 'public', 'link-shared'
    
    # Relationship to song sections
    sections = db.relationship('SongSection', backref='song', lazy=True, cascade='all, delete-orphan', order_by='SongSection.order_index')
    
    def __init__(self, title, author_id, content, shared_with=None, permissions=None, share_settings='private'):
        self.title = title
        self.author_id = author_id
        self.content = content
        self.shared_with = shared_with or []
        self.permissions = permissions or {}
        self.share_settings = share_settings
    
    def to_dict(self):
        """Convert song to dictionary."""
        return {
            'id': self.id,
            'title': self.title,
            'author_id': self.author_id,
            'content': self.content,
            'shared_with': self.shared_with,
            'permissions': self.permissions,
            'share_settings': self.share_settings,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def add_shared_user(self, user_id, permission_level='read'):
        """Add a user to the shared list with specified permission level.
        
        Args:
            user_id (int): The ID of the user to share with
            permission_level (str): Permission level ('read', 'edit', 'admin')
        """
        if permission_level not in ['read', 'edit', 'admin']:
            raise ValueError("Permission level must be 'read', 'edit', or 'admin'")
        
        # Initialize if None
        if self.shared_with is None:
            self.shared_with = []
        if self.permissions is None:
            self.permissions = {}
            
        # Add user if not already shared
        if user_id not in self.shared_with:
            self.shared_with.append(user_id)
            # Mark the field as modified for SQLAlchemy
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(self, 'shared_with')
        
        # Set permission level
        self.permissions[str(user_id)] = permission_level
        # Mark the field as modified for SQLAlchemy
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(self, 'permissions')
    
    def remove_shared_user(self, user_id):
        """Remove a user from the shared list.
        
        Args:
            user_id (int): The ID of the user to remove
        """
        if self.shared_with and user_id in self.shared_with:
            self.shared_with.remove(user_id)
            # Mark the field as modified for SQLAlchemy
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(self, 'shared_with')
        
        if self.permissions and str(user_id) in self.permissions:
            del self.permissions[str(user_id)]
            # Mark the field as modified for SQLAlchemy
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(self, 'permissions')
    
    def get_user_permission(self, user_id):
        """Get permission level for a specific user.
        
        Args:
            user_id (int): The ID of the user
            
        Returns:
            str: Permission level ('read', 'edit', 'admin') or None if not shared
        """
        if not self.permissions:
            return None
        return self.permissions.get(str(user_id))
    
    def is_shared_with_user(self, user_id):
        """Check if song is shared with a specific user.
        
        Args:
            user_id (int): The ID of the user
            
        Returns:
            bool: True if shared with user, False otherwise
        """
        return bool(self.shared_with and user_id in self.shared_with)
    
    def can_user_access(self, user_id):
        """Check if a user can access this song.
        
        Args:
            user_id (int): The ID of the user
            
        Returns:
            bool: True if user can access (author, shared, or public), False otherwise
        """
        # Author always has access
        if self.author_id == user_id:
            return True
        
        # Public songs are accessible to all
        if self.share_settings == 'public':
            return True
        
        # Check if directly shared with user
        return self.is_shared_with_user(user_id)
    
    def can_user_edit(self, user_id):
        """Check if a user can edit this song.
        
        Args:
            user_id (int): The ID of the user
            
        Returns:
            bool: True if user can edit (author, edit permission, or admin permission), False otherwise
        """
        # Author always has edit access
        if self.author_id == user_id:
            return True
        
        # Check permission level
        permission = self.get_user_permission(user_id)
        return permission in ['edit', 'admin']
    
    def can_user_manage(self, user_id):
        """Check if a user can manage sharing and permissions for this song.
        
        Args:
            user_id (int): The ID of the user
            
        Returns:
            bool: True if user can manage (author or admin permission), False otherwise
        """
        # Author always has management access
        if self.author_id == user_id:
            return True
        
        # Check for admin permission
        permission = self.get_user_permission(user_id)
        return permission == 'admin'
    
    def __repr__(self):
        return f'<Song {self.title}>'


class SongVersion(db.Model):
    __tablename__ = 'song_versions'
    
    id = db.Column(db.Integer, primary_key=True)
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id'), nullable=False)
    version_number = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    song = db.relationship('Song', backref=db.backref('versions', lazy=True, order_by='SongVersion.created_at.desc()'))
    user = db.relationship('User', backref='song_versions')
    
    # Composite unique constraint to ensure version numbers are unique per song
    __table_args__ = (db.UniqueConstraint('song_id', 'version_number', name='unique_song_version'),)
    
    def __init__(self, song_id, version_number, title, content, user_id):
        self.song_id = song_id
        self.version_number = version_number
        self.title = title
        self.content = content
        self.user_id = user_id
    
    def to_dict(self):
        """Convert song version to dictionary."""
        return {
            'id': self.id,
            'song_id': self.song_id,
            'version_number': self.version_number,
            'title': self.title,
            'content': self.content,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<SongVersion {self.song_id}v{self.version_number}>'


# Create indexes for efficient permission queries
db.Index('idx_songs_author_id', Song.author_id)
db.Index('idx_songs_share_settings', Song.share_settings)
# Note: JSON field indexing may vary by database. SQLite has limited JSON index support.


class SongSection(db.Model):
    __tablename__ = 'song_sections'
    
    id = db.Column(db.Integer, primary_key=True)
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id'), nullable=False)
    section_type = db.Column(db.String(50), nullable=False)  # verse, chorus, bridge, etc.
    section_number = db.Column(db.String(10))  # For numbered sections like "verse 1", "chorus 2"
    content = db.Column(db.Text, nullable=False)  # Raw ChordPro content for this section
    order_index = db.Column(db.Integer, nullable=False)  # Order in the song
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __init__(self, song_id, section_type, content, order_index, section_number=None):
        self.song_id = song_id
        self.section_type = section_type
        self.section_number = section_number
        self.content = content
        self.order_index = order_index
    
    def to_dict(self):
        """Convert section to dictionary."""
        return {
            'id': self.id,
            'song_id': self.song_id,
            'section_type': self.section_type,
            'section_number': self.section_number,
            'content': self.content,
            'order_index': self.order_index,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        section_name = f"{self.section_type}"
        if self.section_number:
            section_name += f" {self.section_number}"
        return f'<SongSection {section_name}>'


class Chord(db.Model):
    __tablename__ = 'chords'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    definition = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __init__(self, name, definition, user_id, description=None):
        self.name = name
        self.definition = definition
        self.user_id = user_id
        self.description = description
    
    def to_dict(self):
        """Convert chord to dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'definition': self.definition,
            'description': self.description,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Chord {self.name}>'