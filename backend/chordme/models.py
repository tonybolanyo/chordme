from . import db
from datetime import datetime, UTC
from flask import current_app
import bcrypt
import logging

logger = logging.getLogger(__name__)


def utc_now():
    """Helper function to get current UTC time."""
    return datetime.now(UTC)


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    display_name = db.Column(db.String(100), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    profile_image_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationship to songs
    songs = db.relationship('Song', foreign_keys='Song.user_id', backref='author', lazy=True, cascade='all, delete-orphan')
    
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
            'display_name': self.display_name,
            'bio': self.bio,
            'profile_image_url': self.profile_image_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<User {self.email}>'


class Song(db.Model):
    __tablename__ = 'songs'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    artist = db.Column(db.String(255))
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # Changed from author_id
    is_public = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Enhanced metadata fields from PostgreSQL migration
    genre = db.Column(db.String(100))
    song_key = db.Column(db.String(10))  # Musical key (C, Am, etc.)
    tempo = db.Column(db.Integer)  # BPM
    time_signature = db.Column(db.String(10))  # Time signature (4/4, 3/4, 6/8, etc.)
    capo = db.Column(db.Integer, default=0)
    difficulty = db.Column(db.String(20), default='medium')  # beginner, intermediate, advanced, expert
    duration = db.Column(db.Integer)  # Duration in seconds
    language = db.Column(db.String(10), default='en')  # ISO language code
    lyrics = db.Column(db.Text)  # Extracted lyrics for search
    chords_used = db.Column(db.JSON)  # Array of chords used in song
    
    # Soft delete and archival system
    is_deleted = db.Column(db.Boolean, default=False)
    is_archived = db.Column(db.Boolean, default=False)
    deleted_at = db.Column(db.DateTime)
    archived_at = db.Column(db.DateTime)
    
    # Metadata for search and organization
    view_count = db.Column(db.Integer, default=0)
    favorite_count = db.Column(db.Integer, default=0)
    last_accessed = db.Column(db.DateTime)
    
    # Legacy sharing model fields (for compatibility)
    shared_with = db.Column(db.JSON, default=list)  # Array of user IDs or email addresses
    permissions = db.Column(db.JSON, default=dict)  # Object mapping user IDs to permission levels
    share_settings = db.Column(db.String(20), default='private')  # 'private', 'public', 'link-shared'
    
    # Relationships
    sections = db.relationship('SongSection', backref='song', lazy=True, cascade='all, delete-orphan', order_by='SongSection.order_index')
    tags = db.relationship('Tag', secondary='song_tags', back_populates='songs')
    categories = db.relationship('Category', secondary='song_categories', back_populates='songs')
    favorites = db.relationship('UserFavorite', backref='song', lazy=True, cascade='all, delete-orphan')
    
    # Relationship to author (user) - removed explicit backref to avoid conflict
    # author = db.relationship('User', foreign_keys=[user_id])
    
    # Backward compatibility property
    @property
    def author_id(self):
        """Backward compatibility: alias for user_id."""
        return self.user_id
    
    @author_id.setter
    def author_id(self, value):
        """Backward compatibility: alias for user_id."""
        self.user_id = value
    
    def __init__(self, title, user_id=None, content=None, artist=None, genre=None, song_key=None, 
                 tempo=None, time_signature=None, capo=0, difficulty='medium', duration=None, language='en',
                 shared_with=None, permissions=None, share_settings='private', author_id=None):
        self.title = title
        # Support both user_id and author_id for backward compatibility
        self.user_id = user_id or author_id
        self.content = content
        self.artist = artist
        self.genre = genre
        self.song_key = song_key
        self.tempo = tempo
        self.time_signature = time_signature
        self.capo = capo
        self.difficulty = difficulty
        self.duration = duration
        self.language = language
        self.shared_with = shared_with or []
        self.permissions = permissions or {}
        self.share_settings = share_settings
    
    def to_dict(self):
        """Convert song to dictionary."""
        return {
            'id': self.id,
            'title': self.title,
            'artist': self.artist,
            'user_id': self.user_id,
            'author_id': self.user_id,  # Backward compatibility
            'content': self.content,
            'genre': self.genre,
            'song_key': self.song_key,
            'tempo': self.tempo,
            'time_signature': self.time_signature,
            'capo': self.capo,
            'difficulty': self.difficulty,
            'duration': self.duration,
            'language': self.language,
            'lyrics': self.lyrics,
            'chords_used': self.chords_used,
            'is_public': self.is_public,
            'is_deleted': self.is_deleted,
            'is_archived': self.is_archived,
            'view_count': self.view_count,
            'favorite_count': self.favorite_count,
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None,
            'shared_with': self.shared_with,
            'permissions': self.permissions,
            'share_settings': self.share_settings,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'archived_at': self.archived_at.isoformat() if self.archived_at else None
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
        if self.user_id == user_id:
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
        if self.user_id == user_id:
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
        if self.user_id == user_id:
            return True
        
        # Check for admin permission
        permission = self.get_user_permission(user_id)
        return permission == 'admin'
    
    def soft_delete(self):
        """Soft delete the song."""
        self.is_deleted = True
        self.deleted_at = utc_now()
    
    def restore(self):
        """Restore a soft-deleted song."""
        self.is_deleted = False
        self.deleted_at = None
    
    def archive(self):
        """Archive the song."""
        self.is_archived = True
        self.archived_at = utc_now()
    
    def unarchive(self):
        """Unarchive the song."""
        self.is_archived = False
        self.archived_at = None
    
    def increment_view_count(self):
        """Increment the view count and update last accessed time."""
        self.view_count = (self.view_count or 0) + 1
        self.last_accessed = utc_now()
    
    def add_tag(self, tag):
        """Add a tag to this song."""
        if tag not in self.tags:
            self.tags.append(tag)
    
    def remove_tag(self, tag):
        """Remove a tag from this song."""
        if tag in self.tags:
            self.tags.remove(tag)
    
    def add_category(self, category):
        """Add a category to this song."""
        if category not in self.categories:
            self.categories.append(category)
    
    def remove_category(self, category):
        """Remove a category from this song."""
        if category in self.categories:
            self.categories.remove(category)
    
    @classmethod
    def search(cls, query=None, genre=None, song_key=None, difficulty=None, 
               language='en', tags=None, categories=None, min_tempo=None, 
               max_tempo=None, time_signature=None, user_id=None, include_public=True, 
               include_deleted=False, include_archived=False, date_from=None, date_to=None,
               date_field='created_at', limit=50, offset=0):
        """
        Enhanced search for songs with various filters including date ranges.
        
        Args:
            query (str): Text search query
            genre (str): Filter by genre
            song_key (str): Filter by musical key
            difficulty (str): Filter by difficulty level
            language (str): Filter by language
            tags (list): Filter by tag names
            categories (list): Filter by category names
            min_tempo (int): Minimum tempo BPM
            max_tempo (int): Maximum tempo BPM
            time_signature (str): Filter by time signature (4/4, 3/4, etc.)
            user_id (int): Filter by specific user
            include_public (bool): Include public songs
            include_deleted (bool): Include soft-deleted songs
            include_archived (bool): Include archived songs
            date_from (datetime): Filter songs created/modified after this date
            date_to (datetime): Filter songs created/modified before this date
            date_field (str): Date field to filter on ('created_at' or 'updated_at')
            limit (int): Maximum number of results
            offset (int): Offset for pagination
            
        Returns:
            Query: SQLAlchemy query object
        """
        base_query = cls.query
        
        # Basic filters
        if not include_deleted:
            base_query = base_query.filter(cls.is_deleted == False)
        if not include_archived:
            base_query = base_query.filter(cls.is_archived == False)
        
        # User and visibility filters
        if user_id:
            if include_public:
                base_query = base_query.filter(
                    db.or_(cls.user_id == user_id, cls.is_public == True)
                )
            else:
                base_query = base_query.filter(cls.user_id == user_id)
        elif include_public:
            base_query = base_query.filter(cls.is_public == True)
        
        # Text search
        if query:
            search_filter = db.or_(
                cls.title.ilike(f'%{query}%'),
                cls.artist.ilike(f'%{query}%'),
                cls.lyrics.ilike(f'%{query}%'),
                cls.content.ilike(f'%{query}%')
            )
            base_query = base_query.filter(search_filter)
        
        # Metadata filters
        if genre:
            base_query = base_query.filter(cls.genre.ilike(f'%{genre}%'))
        if song_key:
            base_query = base_query.filter(cls.song_key == song_key)
        if difficulty:
            base_query = base_query.filter(cls.difficulty == difficulty)
        if language:
            base_query = base_query.filter(cls.language == language)
        if min_tempo:
            base_query = base_query.filter(cls.tempo >= min_tempo)
        if max_tempo:
            base_query = base_query.filter(cls.tempo <= max_tempo)
        if time_signature:
            base_query = base_query.filter(cls.time_signature == time_signature)
        
        # Date range filters
        if date_from or date_to:
            if date_field == 'updated_at':
                date_column = cls.updated_at
            else:
                date_column = cls.created_at
            
            if date_from:
                base_query = base_query.filter(date_column >= date_from)
            if date_to:
                base_query = base_query.filter(date_column <= date_to)
        
        # Tag filters
        if tags:
            base_query = base_query.join(cls.tags).filter(Tag.name.in_(tags))
        
        # Category filters
        if categories:
            base_query = base_query.join(cls.categories).filter(Category.name.in_(categories))
        
        # Order by relevance, view count, and creation date
        base_query = base_query.order_by(
            cls.view_count.desc(),
            cls.created_at.desc()
        )
        
        # Apply pagination
        if limit:
            base_query = base_query.limit(limit)
        if offset:
            base_query = base_query.offset(offset)
        
        return base_query
    
    def __repr__(self):
        return f'<Song {self.title}>'


class Tag(db.Model):
    __tablename__ = 'tags'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text)
    color = db.Column(db.String(7))  # Hex color code
    is_system = db.Column(db.Boolean, default=False)  # System vs user-created tags
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    songs = db.relationship('Song', secondary='song_tags', back_populates='tags')
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_tags')
    
    def __init__(self, name, description=None, color=None, is_system=False, created_by=None):
        self.name = name
        self.description = description
        self.color = color
        self.is_system = is_system
        self.created_by = created_by
    
    def to_dict(self):
        """Convert tag to dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'color': self.color,
            'is_system': self.is_system,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Tag {self.name}>'


class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text)
    parent_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    is_system = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    songs = db.relationship('Song', secondary='song_categories', back_populates='categories')
    children = db.relationship('Category', backref=db.backref('parent', remote_side=[id]))
    
    def __init__(self, name, description=None, parent_id=None, is_system=False):
        self.name = name
        self.description = description
        self.parent_id = parent_id
        self.is_system = is_system
    
    def to_dict(self):
        """Convert category to dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'parent_id': self.parent_id,
            'is_system': self.is_system,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Category {self.name}>'


class UserFavorite(db.Model):
    __tablename__ = 'user_favorites'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now)
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('user_id', 'song_id', name='unique_user_song_favorite'),)
    
    # Relationships
    user = db.relationship('User', backref='favorites')
    
    def __init__(self, user_id, song_id):
        self.user_id = user_id
        self.song_id = song_id
    
    def to_dict(self):
        """Convert favorite to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'song_id': self.song_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<UserFavorite user:{self.user_id} song:{self.song_id}>'


# Junction tables for many-to-many relationships
song_tags = db.Table('song_tags',
    db.Column('id', db.Integer, primary_key=True),
    db.Column('song_id', db.Integer, db.ForeignKey('songs.id'), nullable=False),
    db.Column('tag_id', db.Integer, db.ForeignKey('tags.id'), nullable=False),
    db.Column('created_at', db.DateTime, default=utc_now),
    db.UniqueConstraint('song_id', 'tag_id', name='unique_song_tag')
)

song_categories = db.Table('song_categories',
    db.Column('id', db.Integer, primary_key=True),
    db.Column('song_id', db.Integer, db.ForeignKey('songs.id'), nullable=False),
    db.Column('category_id', db.Integer, db.ForeignKey('categories.id'), nullable=False),
    db.Column('created_at', db.DateTime, default=utc_now),
    db.UniqueConstraint('song_id', 'category_id', name='unique_song_category')
)


class SongVersion(db.Model):
    __tablename__ = 'song_versions'
    
    id = db.Column(db.Integer, primary_key=True)
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id'), nullable=False)
    version_number = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    artist = db.Column(db.String(255))
    content = db.Column(db.Text, nullable=False)
    lyrics = db.Column(db.Text)  # Extracted lyrics
    chords_used = db.Column(db.JSON)  # Array of chords used
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # Changed from user_id
    version_note = db.Column(db.Text)  # Optional note about what changed
    is_major_version = db.Column(db.Boolean, default=False)  # Flag for significant changes
    created_at = db.Column(db.DateTime, default=utc_now)
    
    # Relationships
    song = db.relationship('Song', backref=db.backref('versions', lazy=True, order_by='SongVersion.created_at.desc()'))
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_song_versions')
    
    # Composite unique constraint to ensure version numbers are unique per song
    __table_args__ = (db.UniqueConstraint('song_id', 'version_number', name='unique_song_version'),)
    
    def __init__(self, song_id, version_number, title, content, created_by, 
                 artist=None, version_note=None, is_major_version=False):
        self.song_id = song_id
        self.version_number = version_number
        self.title = title
        self.artist = artist
        self.content = content
        self.created_by = created_by
        self.version_note = version_note
        self.is_major_version = is_major_version
    
    def to_dict(self):
        """Convert song version to dictionary."""
        return {
            'id': self.id,
            'song_id': self.song_id,
            'version_number': self.version_number,
            'title': self.title,
            'artist': self.artist,
            'content': self.content,
            'lyrics': self.lyrics,
            'chords_used': self.chords_used,
            'created_by': self.created_by,
            'version_note': self.version_note,
            'is_major_version': self.is_major_version,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<SongVersion {self.song_id}v{self.version_number}>'


# Create indexes for efficient queries
db.Index('idx_songs_user_id', Song.user_id)
db.Index('idx_songs_share_settings', Song.share_settings)
db.Index('idx_songs_genre', Song.genre)
db.Index('idx_songs_key', Song.song_key)
db.Index('idx_songs_difficulty', Song.difficulty)
db.Index('idx_songs_language', Song.language)
db.Index('idx_songs_is_deleted', Song.is_deleted)
db.Index('idx_songs_is_archived', Song.is_archived)
db.Index('idx_songs_is_public', Song.is_public)
db.Index('idx_songs_view_count', Song.view_count)
db.Index('idx_tags_name', Tag.name)
db.Index('idx_tags_is_system', Tag.is_system)
db.Index('idx_categories_name', Category.name)
db.Index('idx_categories_is_system', Category.is_system)
db.Index('idx_user_favorites_user_song', UserFavorite.user_id, UserFavorite.song_id)
# Note: JSON field indexing may vary by database. SQLite has limited JSON index support.


class SongSection(db.Model):
    __tablename__ = 'song_sections'
    
    id = db.Column(db.Integer, primary_key=True)
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id'), nullable=False)
    section_type = db.Column(db.String(50), nullable=False)  # verse, chorus, bridge, etc.
    section_number = db.Column(db.String(10))  # For numbered sections like "verse 1", "chorus 2"
    content = db.Column(db.Text, nullable=False)  # Raw ChordPro content for this section
    order_index = db.Column(db.Integer, nullable=False)  # Order in the song
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
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
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
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


class PDFExportJob(db.Model):
    """
    Model for tracking asynchronous PDF generation jobs.
    Provides progress tracking, error handling, and file management for PDF exports.
    """
    __tablename__ = 'pdf_export_jobs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    job_type = db.Column(db.String(50), nullable=False)  # 'single', 'batch', 'multi_song'
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, processing, completed, failed, cancelled
    progress = db.Column(db.Integer, default=0)  # 0-100 percentage
    
    # Job configuration
    song_ids = db.Column(db.JSON)  # List of song IDs to export
    export_options = db.Column(db.JSON)  # Export configuration (paper size, template, etc.)
    
    # Results and files
    output_file_path = db.Column(db.String(500))  # Path to generated file(s)
    output_filename = db.Column(db.String(255))  # Original filename for download
    file_size = db.Column(db.Integer)  # File size in bytes
    
    # Progress and error tracking
    processed_count = db.Column(db.Integer, default=0)
    total_count = db.Column(db.Integer, default=0)
    error_message = db.Column(db.Text)
    error_details = db.Column(db.JSON)  # Detailed error information
    
    # Timing and lifecycle
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime)  # When temporary files should be cleaned up
    
    # Relationship to user
    user = db.relationship('User', backref='pdf_export_jobs', lazy=True)
    
    def __init__(self, user_id, job_type, song_ids=None, export_options=None):
        self.user_id = user_id
        self.job_type = job_type
        self.song_ids = song_ids or []
        self.export_options = export_options or {}
        self.total_count = len(song_ids) if song_ids else 1
        
        # Set expiration time (24 hours from creation)
        from datetime import timedelta
        self.expires_at = utc_now() + timedelta(hours=24)
    
    def update_progress(self, processed_count=None, progress=None, status=None):
        """Update job progress and status."""
        if processed_count is not None:
            self.processed_count = processed_count
            if self.total_count > 0:
                self.progress = min(100, int((processed_count / self.total_count) * 100))
        
        if progress is not None:
            self.progress = min(100, max(0, progress))
        
        if status is not None:
            self.status = status
            if status == 'processing' and not self.started_at:
                self.started_at = utc_now()
            elif status in ['completed', 'failed', 'cancelled'] and not self.completed_at:
                self.completed_at = utc_now()
    
    def mark_error(self, error_message, error_details=None):
        """Mark job as failed with error information."""
        self.status = 'failed'
        self.error_message = error_message
        self.error_details = error_details
        self.completed_at = utc_now()
    
    def mark_completed(self, output_file_path, output_filename, file_size=None):
        """Mark job as completed with output file information."""
        self.status = 'completed'
        self.progress = 100
        self.output_file_path = output_file_path
        self.output_filename = output_filename
        self.file_size = file_size
        self.completed_at = utc_now()
    
    def is_expired(self):
        """Check if the job has expired and should be cleaned up."""
        if not self.expires_at:
            return False
        
        # Ensure both datetimes are timezone-aware for comparison
        now = utc_now()
        expires = self.expires_at
        
        # If expires_at is timezone-naive, assume UTC
        if expires.tzinfo is None:
            from datetime import timezone
            expires = expires.replace(tzinfo=timezone.utc)
        
        return now > expires
    
    def is_finished(self):
        """Check if the job is in a finished state."""
        return self.status in ['completed', 'failed', 'cancelled']
    
    def can_be_cancelled(self):
        """Check if the job can be cancelled."""
        return self.status in ['pending', 'processing']
    
    def get_duration(self):
        """Get job duration in seconds, if completed."""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
    
    def to_dict(self, include_details=True):
        """Convert job to dictionary."""
        result = {
            'id': self.id,
            'user_id': self.user_id,
            'job_type': self.job_type,
            'status': self.status,
            'progress': self.progress,
            'processed_count': self.processed_count,
            'total_count': self.total_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
        }
        
        if include_details:
            result.update({
                'song_ids': self.song_ids,
                'export_options': self.export_options,
                'output_filename': self.output_filename,
                'file_size': self.file_size,
                'error_message': self.error_message,
                'error_details': self.error_details,
                'duration': self.get_duration()
            })
        
        return result
    
    def __repr__(self):
        return f'<PDFExportJob {self.id} ({self.job_type}, {self.status})>'


class FilterPreset(db.Model):
    """
    Model for saving and sharing custom filter combinations.
    Allows users to create reusable filter presets for advanced song searching.
    """
    __tablename__ = 'filter_presets'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Filter configuration stored as JSON
    filter_config = db.Column(db.JSON, nullable=False)  # Stores complete filter criteria
    
    # Sharing and visibility
    is_public = db.Column(db.Boolean, default=False)  # Whether preset is publicly visible
    is_shared = db.Column(db.Boolean, default=False)  # Whether preset can be shared
    shared_with = db.Column(db.JSON, default=list)  # Array of user IDs who can access
    
    # Usage tracking
    usage_count = db.Column(db.Integer, default=0)  # How many times preset has been used
    last_used = db.Column(db.DateTime)  # When preset was last used
    
    # Metadata
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    user = db.relationship('User', backref='filter_presets', lazy=True)
    
    def __init__(self, name, user_id, filter_config, description=None, is_public=False, is_shared=False):
        self.name = name
        self.user_id = user_id
        self.filter_config = filter_config
        self.description = description
        self.is_public = is_public
        self.is_shared = is_shared
        self.shared_with = []
    
    def can_user_access(self, user_id):
        """Check if a user can access this filter preset."""
        # Owner always has access
        if self.user_id == user_id:
            return True
        
        # Public presets are accessible to all
        if self.is_public:
            return True
        
        # Check if directly shared with user
        return bool(self.shared_with and user_id in self.shared_with)
    
    def can_user_edit(self, user_id):
        """Check if a user can edit this filter preset."""
        # Only the owner can edit
        return self.user_id == user_id
    
    def share_with_user(self, user_id):
        """Share preset with a specific user."""
        if self.shared_with is None:
            self.shared_with = []
        if user_id not in self.shared_with:
            self.shared_with.append(user_id)
            self.is_shared = True
    
    def unshare_with_user(self, user_id):
        """Remove sharing access for a specific user."""
        if self.shared_with and user_id in self.shared_with:
            self.shared_with.remove(user_id)
            # Update is_shared flag based on remaining shares
            self.is_shared = len(self.shared_with) > 0
    
    def increment_usage(self):
        """Increment usage count and update last used timestamp."""
        self.usage_count = (self.usage_count or 0) + 1
        self.last_used = utc_now()
    
    def validate_filter_config(self):
        """Validate that filter configuration has required structure."""
        if not isinstance(self.filter_config, dict):
            return False, "Filter configuration must be a JSON object"
        
        # Check for valid filter fields
        valid_fields = {
            'q', 'genre', 'key', 'difficulty', 'language', 'tags', 
            'minTempo', 'maxTempo', 'timeSignature', 'dateRange',
            'categories', 'includePublic', 'combineMode'
        }
        
        invalid_fields = set(self.filter_config.keys()) - valid_fields
        if invalid_fields:
            return False, f"Invalid filter fields: {', '.join(invalid_fields)}"
        
        return True, "Valid configuration"
    
    def to_dict(self, include_config=True):
        """Convert filter preset to dictionary."""
        result = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'user_id': self.user_id,
            'is_public': self.is_public,
            'is_shared': self.is_shared,
            'usage_count': self.usage_count,
            'last_used': self.last_used.isoformat() if self.last_used else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_config:
            result['filter_config'] = self.filter_config
            result['shared_with'] = self.shared_with
        
        return result
    
    @classmethod
    def get_accessible_presets(cls, user_id, include_public=True):
        """Get all filter presets accessible to a user."""
        query = cls.query
        
        if include_public:
            # User's own presets + public presets + presets shared with user
            query = query.filter(
                db.or_(
                    cls.user_id == user_id,
                    cls.is_public == True,
                    cls.shared_with.contains([user_id])
                )
            )
        else:
            # Only user's own presets + presets shared with user
            query = query.filter(
                db.or_(
                    cls.user_id == user_id,
                    cls.shared_with.contains([user_id])
                )
            )
        
        return query.order_by(cls.updated_at.desc())
    
    def __repr__(self):
        return f'<FilterPreset {self.name} by user:{self.user_id}>'