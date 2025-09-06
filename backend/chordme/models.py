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
    analytics_privacy_settings = db.Column(db.JSON, default=dict)  # Privacy settings for analytics
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


# Collaborative Session Management Models

class CollaborationSession(db.Model):
    """Model for managing collaborative editing sessions."""
    __tablename__ = 'collaboration_sessions'
    
    id = db.Column(db.String(36), primary_key=True)  # UUID
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id'), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey('session_templates.id'), nullable=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Session configuration
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    access_mode = db.Column(db.String(20), default='invite-only')  # 'invite-only', 'link-access', 'public'
    invitation_code = db.Column(db.String(12), unique=True, nullable=True)  # For link-based access
    max_participants = db.Column(db.Integer, default=10)
    
    # Session state
    status = db.Column(db.String(20), default='active')  # 'active', 'paused', 'ended', 'archived'
    participant_count = db.Column(db.Integer, default=0)
    is_recording = db.Column(db.Boolean, default=False)
    auto_save_enabled = db.Column(db.Boolean, default=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    started_at = db.Column(db.DateTime, nullable=True)
    ended_at = db.Column(db.DateTime, nullable=True)
    last_activity = db.Column(db.DateTime, default=utc_now)
    
    # Cleanup configuration
    auto_cleanup_after = db.Column(db.Integer, default=7)  # Days after inactivity
    archive_after = db.Column(db.Integer, default=30)  # Days before archival
    
    # Settings and configuration
    settings = db.Column(db.JSON, default=dict)  # Session-specific settings
    session_metadata = db.Column(db.JSON, default=dict)  # Additional metadata
    
    # Relationships
    song = db.relationship('Song', backref='collaboration_sessions')
    creator = db.relationship('User', foreign_keys=[creator_id], backref='created_sessions')
    template = db.relationship('SessionTemplate', backref='sessions')
    participants = db.relationship('SessionParticipant', backref='session', cascade='all, delete-orphan')
    activities = db.relationship('SessionActivity', backref='session', cascade='all, delete-orphan')
    
    def __init__(self, session_id, song_id, creator_id, name, template_id=None, 
                 description=None, access_mode='invite-only', max_participants=10):
        self.id = session_id
        self.song_id = song_id
        self.creator_id = creator_id
        self.name = name
        self.template_id = template_id
        self.description = description
        self.access_mode = access_mode
        self.max_participants = max_participants
        if access_mode == 'link-access':
            import secrets
            self.invitation_code = secrets.token_urlsafe(8)
    
    def to_dict(self, include_participants=False, include_activities=False):
        """Convert session to dictionary."""
        result = {
            'id': self.id,
            'song_id': self.song_id,
            'template_id': self.template_id,
            'creator_id': self.creator_id,
            'name': self.name,
            'description': self.description,
            'access_mode': self.access_mode,
            'invitation_code': self.invitation_code,
            'max_participants': self.max_participants,
            'status': self.status,
            'participant_count': self.participant_count,
            'is_recording': self.is_recording,
            'auto_save_enabled': self.auto_save_enabled,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None,
            'auto_cleanup_after': self.auto_cleanup_after,
            'archive_after': self.archive_after,
            'settings': self.settings,
            'session_metadata': self.session_metadata
        }
        
        if include_participants:
            result['participants'] = [p.to_dict() for p in self.participants]
        
        if include_activities:
            result['activities'] = [a.to_dict() for a in self.activities]
        
        return result
    
    def add_participant(self, user_id, role='viewer', invited_by=None):
        """Add participant to session."""
        existing = SessionParticipant.query.filter_by(
            session_id=self.id, user_id=user_id
        ).first()
        
        if existing:
            return existing
        
        participant = SessionParticipant(
            session_id=self.id,
            user_id=user_id,
            role=role,
            invited_by=invited_by
        )
        
        db.session.add(participant)
        self.participant_count += 1
        self.last_activity = utc_now()
        
        return participant
    
    def remove_participant(self, user_id):
        """Remove participant from session."""
        participant = SessionParticipant.query.filter_by(
            session_id=self.id, user_id=user_id
        ).first()
        
        if participant:
            db.session.delete(participant)
            self.participant_count = max(0, self.participant_count - 1)
            self.last_activity = utc_now()
            return True
        return False
    
    def can_access(self, user_id):
        """Check if user can access this session."""
        # Creator always has access
        if self.creator_id == user_id:
            return True
        
        # Check if user is a participant
        participant = SessionParticipant.query.filter_by(
            session_id=self.id, user_id=user_id
        ).first()
        
        return participant is not None
    
    def get_user_role(self, user_id):
        """Get user's role in this session."""
        if self.creator_id == user_id:
            return 'owner'
        
        participant = SessionParticipant.query.filter_by(
            session_id=self.id, user_id=user_id
        ).first()
        
        return participant.role if participant else None
    
    def log_activity(self, user_id, activity_type, details=None):
        """Log activity in this session."""
        activity = SessionActivity(
            session_id=self.id,
            user_id=user_id,
            activity_type=activity_type,
            details=details or {}
        )
        
        db.session.add(activity)
        self.last_activity = utc_now()
        
        return activity
    
    def __repr__(self):
        return f'<CollaborationSession {self.name} ({self.id})>'


class SessionTemplate(db.Model):
    """Templates for different types of collaborative sessions."""
    __tablename__ = 'session_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), nullable=False)  # 'rehearsal', 'lesson', 'arrangement', 'jamming'
    
    # Template configuration
    default_roles = db.Column(db.JSON, default=list)  # Default participant roles
    max_participants = db.Column(db.Integer, default=10)
    auto_recording = db.Column(db.Boolean, default=False)
    auto_save_interval = db.Column(db.Integer, default=30)  # Seconds
    
    # Template settings
    settings = db.Column(db.JSON, default=dict)
    permissions = db.Column(db.JSON, default=dict)  # Default permissions per role
    
    # Visibility and sharing
    is_public = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    usage_count = db.Column(db.Integer, default=0)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by], backref='session_templates')
    
    def __init__(self, name, category, created_by, description=None, max_participants=10):
        self.name = name
        self.category = category
        self.created_by = created_by
        self.description = description
        self.max_participants = max_participants
        
        # Set default permissions based on category
        self.permissions = self._get_default_permissions(category)
    
    def _get_default_permissions(self, category):
        """Get default permissions based on template category."""
        base_permissions = {
            'owner': ['read', 'edit', 'manage_participants', 'manage_session', 'delete'],
            'editor': ['read', 'edit', 'comment'],
            'viewer': ['read', 'comment'],
            'commenter': ['read', 'comment']
        }
        
        if category == 'lesson':
            # More restrictive for lessons
            base_permissions['editor'] = ['read', 'comment']
            base_permissions['viewer'] = ['read']
        elif category == 'jamming':
            # More open for jamming sessions
            base_permissions['editor'] = ['read', 'edit', 'comment', 'add_participants']
        
        return base_permissions
    
    def to_dict(self):
        """Convert template to dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'default_roles': self.default_roles,
            'max_participants': self.max_participants,
            'auto_recording': self.auto_recording,
            'auto_save_interval': self.auto_save_interval,
            'settings': self.settings,
            'permissions': self.permissions,
            'is_public': self.is_public,
            'created_by': self.created_by,
            'usage_count': self.usage_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def increment_usage(self):
        """Increment usage count."""
        self.usage_count += 1
        self.updated_at = utc_now()
    
    def __repr__(self):
        return f'<SessionTemplate {self.name} ({self.category})>'


class SessionParticipant(db.Model):
    """Participants in collaborative sessions."""
    __tablename__ = 'session_participants'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(36), db.ForeignKey('collaboration_sessions.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Participant information
    role = db.Column(db.String(20), default='viewer')  # 'owner', 'editor', 'viewer', 'commenter'
    status = db.Column(db.String(20), default='active')  # 'active', 'inactive', 'banned'
    invited_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Participation tracking
    joined_at = db.Column(db.DateTime, default=utc_now)
    last_seen = db.Column(db.DateTime, default=utc_now)
    total_time = db.Column(db.Integer, default=0)  # Total time in session (seconds)
    contribution_count = db.Column(db.Integer, default=0)  # Number of contributions/edits
    
    # Settings
    notifications_enabled = db.Column(db.Boolean, default=True)
    color = db.Column(db.String(7), nullable=True)  # Hex color for cursor/presence
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('session_id', 'user_id', name='unique_session_participant'),)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='session_participations')
    inviter = db.relationship('User', foreign_keys=[invited_by])
    
    def __init__(self, session_id, user_id, role='viewer', invited_by=None):
        self.session_id = session_id
        self.user_id = user_id
        self.role = role
        self.invited_by = invited_by
        
        # Assign random color
        import random
        colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
                 '#DDA0DD', '#98D8C8', '#FDA7DF', '#F7DC6F', '#BB8FCE']
        self.color = random.choice(colors)
    
    def to_dict(self, include_user=False):
        """Convert participant to dictionary."""
        result = {
            'id': self.id,
            'session_id': self.session_id,
            'user_id': self.user_id,
            'role': self.role,
            'status': self.status,
            'invited_by': self.invited_by,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'total_time': self.total_time,
            'contribution_count': self.contribution_count,
            'notifications_enabled': self.notifications_enabled,
            'color': self.color
        }
        
        if include_user and self.user:
            result['user'] = {
                'id': self.user.id,
                'email': self.user.email,
                'display_name': self.user.display_name
            }
        
        return result
    
    def has_permission(self, permission):
        """Check if participant has specific permission."""
        # Get session template permissions
        session = CollaborationSession.query.get(self.session_id)
        if not session or not session.template:
            # Default permissions
            permissions = {
                'owner': ['read', 'edit', 'manage_participants', 'manage_session', 'delete'],
                'editor': ['read', 'edit', 'comment'],
                'viewer': ['read', 'comment'],
                'commenter': ['read', 'comment']
            }
        else:
            permissions = session.template.permissions
        
        role_permissions = permissions.get(self.role, [])
        return permission in role_permissions
    
    def update_activity(self, contribution=False):
        """Update participant activity."""
        self.last_seen = utc_now()
        if contribution:
            self.contribution_count += 1
    
    def __repr__(self):
        return f'<SessionParticipant {self.user_id} in {self.session_id} ({self.role})>'


class SessionActivity(db.Model):
    """Activity log for collaborative sessions."""
    __tablename__ = 'session_activities'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(36), db.ForeignKey('collaboration_sessions.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Activity information
    activity_type = db.Column(db.String(50), nullable=False)  # 'edit', 'join', 'leave', 'permission_change', etc.
    description = db.Column(db.String(500), nullable=True)
    details = db.Column(db.JSON, default=dict)  # Additional activity data
    
    # Privacy and metadata
    is_private = db.Column(db.Boolean, default=False)  # Private activities (not shown to all users)
    ip_address = db.Column(db.String(45), nullable=True)  # For audit purposes
    user_agent = db.Column(db.String(500), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=utc_now)
    
    # Relationships
    user = db.relationship('User', backref='session_activities')
    
    def __init__(self, session_id, user_id, activity_type, description=None, details=None):
        self.session_id = session_id
        self.user_id = user_id
        self.activity_type = activity_type
        self.description = description
        self.details = details or {}
    
    def to_dict(self, include_user=False, include_private=False):
        """Convert activity to dictionary."""
        if self.is_private and not include_private:
            return None
        
        result = {
            'id': self.id,
            'session_id': self.session_id,
            'user_id': self.user_id,
            'activity_type': self.activity_type,
            'description': self.description,
            'details': self.details,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if include_user and self.user:
            result['user'] = {
                'id': self.user.id,
                'display_name': self.user.display_name or self.user.email
            }
        
        if include_private:
            result['is_private'] = self.is_private
            result['ip_address'] = self.ip_address
            result['user_agent'] = self.user_agent
        
        return result
    
    @classmethod
    def log(cls, session_id, user_id, activity_type, description=None, details=None, is_private=False):
        """Convenience method to log activity."""
        activity = cls(
            session_id=session_id,
            user_id=user_id,
            activity_type=activity_type,
            description=description,
            details=details
        )
        activity.is_private = is_private
        
        db.session.add(activity)
        return activity
    
    def __repr__(self):
        return f'<SessionActivity {self.activity_type} by {self.user_id} in {self.session_id}>'


# Setlist Management Models

class Setlist(db.Model):
    """Core setlist model for performance management."""
    __tablename__ = 'setlists'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Performance context
    event_type = db.Column(db.String(50), default='performance')  # performance, rehearsal, lesson, etc.
    venue = db.Column(db.String(255))
    event_date = db.Column(db.DateTime(timezone=True))
    estimated_duration = db.Column(db.Integer)  # Total estimated duration in minutes
    
    # Template and organizational features
    is_template = db.Column(db.Boolean, default=False)
    template_id = db.Column(db.Integer, db.ForeignKey('setlists.id'), nullable=True)
    is_public = db.Column(db.Boolean, default=False)
    is_recurring = db.Column(db.Boolean, default=False)
    recurring_pattern = db.Column(db.String(50))  # weekly, monthly, custom, etc.
    
    # Status and lifecycle
    status = db.Column(db.String(20), default='draft')  # draft, ready, in_progress, completed, archived
    is_deleted = db.Column(db.Boolean, default=False)
    is_archived = db.Column(db.Boolean, default=False)
    deleted_at = db.Column(db.DateTime(timezone=True))
    archived_at = db.Column(db.DateTime(timezone=True))
    
    # Metadata
    tags = db.Column(db.JSON, default=list)  # Quick tags for categorization
    notes = db.Column(db.Text)  # General notes about the setlist
    view_count = db.Column(db.Integer, default=0)
    usage_count = db.Column(db.Integer, default=0)  # How many times performed
    last_performed = db.Column(db.DateTime(timezone=True))
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='setlists')
    template = db.relationship('Setlist', remote_side=[id], backref='instances')
    setlist_songs = db.relationship('SetlistSong', backref='setlist', cascade='all, delete-orphan')
    versions = db.relationship('SetlistVersion', backref='setlist', cascade='all, delete-orphan')
    collaborators = db.relationship('SetlistCollaborator', backref='setlist', cascade='all, delete-orphan')
    performances = db.relationship('SetlistPerformance', backref='setlist', cascade='all, delete-orphan')
    
    def __init__(self, name, user_id, description=None, event_type='performance', **kwargs):
        self.name = name
        self.user_id = user_id
        self.description = description
        self.event_type = event_type
        
        # Handle additional parameters
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self, include_songs=False, include_versions=False):
        """Convert setlist to dictionary."""
        result = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'user_id': self.user_id,
            'event_type': self.event_type,
            'venue': self.venue,
            'event_date': self.event_date.isoformat() if self.event_date else None,
            'estimated_duration': self.estimated_duration,
            'is_template': self.is_template,
            'template_id': self.template_id,
            'is_public': self.is_public,
            'is_recurring': self.is_recurring,
            'recurring_pattern': self.recurring_pattern,
            'status': self.status,
            'is_deleted': self.is_deleted,
            'is_archived': self.is_archived,
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'archived_at': self.archived_at.isoformat() if self.archived_at else None,
            'tags': self.tags,
            'notes': self.notes,
            'view_count': self.view_count,
            'usage_count': self.usage_count,
            'last_performed': self.last_performed.isoformat() if self.last_performed else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_songs:
            result['songs'] = [song.to_dict() for song in self.setlist_songs]
        
        if include_versions:
            result['versions'] = [version.to_dict() for version in self.versions]
        
        return result
    
    def add_song(self, song_id, sort_order=None, section=None, **kwargs):
        """Add a song to this setlist."""
        if sort_order is None:
            # Get the next sort order
            max_order = db.session.query(db.func.max(SetlistSong.sort_order)).filter_by(setlist_id=self.id).scalar()
            sort_order = (max_order or 0) + 1
        
        setlist_song = SetlistSong(
            setlist_id=self.id,
            song_id=song_id,
            sort_order=sort_order,
            section=section,
            **kwargs
        )
        
        db.session.add(setlist_song)
        return setlist_song
    
    def remove_song(self, song_id):
        """Remove a song from this setlist."""
        setlist_song = SetlistSong.query.filter_by(setlist_id=self.id, song_id=song_id).first()
        if setlist_song:
            db.session.delete(setlist_song)
            return True
        return False
    
    def reorder_songs(self, song_order):
        """Reorder songs in the setlist based on provided list of song IDs."""
        for i, song_id in enumerate(song_order):
            setlist_song = SetlistSong.query.filter_by(setlist_id=self.id, song_id=song_id).first()
            if setlist_song:
                setlist_song.sort_order = i + 1
    
    def can_user_access(self, user_id):
        """Check if a user can access this setlist."""
        # Owner always has access
        if self.user_id == user_id:
            return True
        
        # Public setlists are accessible
        if self.is_public and not self.is_deleted:
            return True
        
        # Check if user is a collaborator
        collaborator = SetlistCollaborator.query.filter_by(
            setlist_id=self.id, user_id=user_id, status='accepted'
        ).first()
        
        return collaborator is not None
    
    def can_user_edit(self, user_id):
        """Check if a user can edit this setlist."""
        # Owner can always edit
        if self.user_id == user_id:
            return True
        
        # Check if user has edit permissions
        collaborator = SetlistCollaborator.query.filter_by(
            setlist_id=self.id, user_id=user_id, status='accepted'
        ).first()
        
        return collaborator and collaborator.permission_level in ['edit', 'admin']
    
    def __repr__(self):
        return f'<Setlist {self.name}>'


class SetlistSong(db.Model):
    """Songs within setlists with performance-specific metadata."""
    __tablename__ = 'setlist_songs'
    
    id = db.Column(db.Integer, primary_key=True)
    setlist_id = db.Column(db.Integer, db.ForeignKey('setlists.id'), nullable=False)
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id'), nullable=False)
    
    # Position and organization
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    section = db.Column(db.String(50))  # opening, main, encore, break, etc.
    
    # Performance-specific metadata
    performance_key = db.Column(db.String(10))  # Key for this performance
    performance_tempo = db.Column(db.Integer)  # BPM for this performance
    performance_capo = db.Column(db.Integer, default=0)
    estimated_duration = db.Column(db.Integer)  # Duration in seconds
    
    # Arrangement and notes
    arrangement_notes = db.Column(db.Text)
    performance_notes = db.Column(db.Text)
    intro_notes = db.Column(db.Text)
    outro_notes = db.Column(db.Text)
    transition_notes = db.Column(db.Text)
    
    # Status and flags
    is_optional = db.Column(db.Boolean, default=False)
    is_highlight = db.Column(db.Boolean, default=False)
    requires_preparation = db.Column(db.Boolean, default=False)
    
    # Analytics metadata (populated after performance)
    actual_duration = db.Column(db.Integer)
    performance_rating = db.Column(db.Integer)  # 1-5 rating
    audience_response = db.Column(db.String(20))  # excellent, good, fair, poor
    technical_notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('setlist_id', 'song_id', name='unique_setlist_song'),)
    
    # Relationships
    song = db.relationship('Song', backref='setlist_songs')
    
    def __init__(self, setlist_id, song_id, sort_order=0, **kwargs):
        self.setlist_id = setlist_id
        self.song_id = song_id
        self.sort_order = sort_order
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self, include_song=False):
        """Convert setlist song to dictionary."""
        result = {
            'id': self.id,
            'setlist_id': self.setlist_id,
            'song_id': self.song_id,
            'sort_order': self.sort_order,
            'section': self.section,
            'performance_key': self.performance_key,
            'performance_tempo': self.performance_tempo,
            'performance_capo': self.performance_capo,
            'estimated_duration': self.estimated_duration,
            'arrangement_notes': self.arrangement_notes,
            'performance_notes': self.performance_notes,
            'intro_notes': self.intro_notes,
            'outro_notes': self.outro_notes,
            'transition_notes': self.transition_notes,
            'is_optional': self.is_optional,
            'is_highlight': self.is_highlight,
            'requires_preparation': self.requires_preparation,
            'actual_duration': self.actual_duration,
            'performance_rating': self.performance_rating,
            'audience_response': self.audience_response,
            'technical_notes': self.technical_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_song and self.song:
            result['song'] = self.song.to_dict()
        
        return result
    
    def __repr__(self):
        return f'<SetlistSong {self.song_id} in setlist {self.setlist_id}>'


class SetlistVersion(db.Model):
    """Version control for setlist changes."""
    __tablename__ = 'setlist_versions'
    
    id = db.Column(db.Integer, primary_key=True)
    setlist_id = db.Column(db.Integer, db.ForeignKey('setlists.id'), nullable=False)
    version_number = db.Column(db.Integer, nullable=False)
    
    # Snapshot of setlist at this version
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    event_type = db.Column(db.String(50))
    venue = db.Column(db.String(255))
    event_date = db.Column(db.DateTime(timezone=True))
    estimated_duration = db.Column(db.Integer)
    status = db.Column(db.String(20))
    tags = db.Column(db.JSON)
    notes = db.Column(db.Text)
    
    # Version metadata
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    version_note = db.Column(db.Text)
    is_major_version = db.Column(db.Boolean, default=False)
    change_summary = db.Column(db.JSON)  # Summary of changes
    
    created_at = db.Column(db.DateTime, default=utc_now)
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('setlist_id', 'version_number', name='unique_setlist_version'),)
    
    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by])
    
    def __init__(self, setlist_id, version_number, name, created_by, **kwargs):
        self.setlist_id = setlist_id
        self.version_number = version_number
        self.name = name
        self.created_by = created_by
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self):
        """Convert setlist version to dictionary."""
        return {
            'id': self.id,
            'setlist_id': self.setlist_id,
            'version_number': self.version_number,
            'name': self.name,
            'description': self.description,
            'event_type': self.event_type,
            'venue': self.venue,
            'event_date': self.event_date.isoformat() if self.event_date else None,
            'estimated_duration': self.estimated_duration,
            'status': self.status,
            'tags': self.tags,
            'notes': self.notes,
            'created_by': self.created_by,
            'version_note': self.version_note,
            'is_major_version': self.is_major_version,
            'change_summary': self.change_summary,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<SetlistVersion {self.setlist_id}v{self.version_number}>'


class SetlistTemplate(db.Model):
    """Templates for creating reusable setlist structures."""
    __tablename__ = 'setlist_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Template characteristics
    category = db.Column(db.String(50))  # worship, concert, wedding, etc.
    subcategory = db.Column(db.String(50))
    target_duration = db.Column(db.Integer)  # Target duration in minutes
    song_count_min = db.Column(db.Integer, default=0)
    song_count_max = db.Column(db.Integer)
    
    # Template configuration
    default_sections = db.Column(db.JSON, default=list)
    required_tags = db.Column(db.JSON, default=list)
    preferred_keys = db.Column(db.JSON, default=list)
    tempo_guidelines = db.Column(db.JSON, default=dict)
    
    # Usage and sharing
    is_public = db.Column(db.Boolean, default=False)
    is_system = db.Column(db.Boolean, default=False)
    usage_count = db.Column(db.Integer, default=0)
    rating_average = db.Column(db.Numeric(3, 2), default=0.0)
    rating_count = db.Column(db.Integer, default=0)
    
    # Metadata
    tags = db.Column(db.JSON, default=list)
    difficulty_level = db.Column(db.String(20), default='intermediate')
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_setlist_templates')
    sections = db.relationship('SetlistTemplateSection', backref='template', cascade='all, delete-orphan')
    
    def __init__(self, name, created_by, category=None, **kwargs):
        self.name = name
        self.created_by = created_by
        self.category = category
        
        # Handle additional parameters
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self, include_sections=False):
        """Convert template to dictionary."""
        result = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_by': self.created_by,
            'category': self.category,
            'subcategory': self.subcategory,
            'target_duration': self.target_duration,
            'song_count_min': self.song_count_min,
            'song_count_max': self.song_count_max,
            'default_sections': self.default_sections,
            'required_tags': self.required_tags,
            'preferred_keys': self.preferred_keys,
            'tempo_guidelines': self.tempo_guidelines,
            'is_public': self.is_public,
            'is_system': self.is_system,
            'usage_count': self.usage_count,
            'rating_average': float(self.rating_average) if self.rating_average else 0.0,
            'rating_count': self.rating_count,
            'tags': self.tags,
            'difficulty_level': self.difficulty_level,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_sections:
            result['sections'] = [section.to_dict() for section in self.sections]
        
        return result
    
    def __repr__(self):
        return f'<SetlistTemplate {self.name}>'


class SetlistTemplateSection(db.Model):
    """Sections within setlist templates."""
    __tablename__ = 'setlist_template_sections'
    
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('setlist_templates.id'), nullable=False)
    
    # Section definition
    section_name = db.Column(db.String(50), nullable=False)
    section_order = db.Column(db.Integer, nullable=False, default=0)
    
    # Section requirements
    min_songs = db.Column(db.Integer, default=1)
    max_songs = db.Column(db.Integer)
    target_duration = db.Column(db.Integer)  # Minutes
    
    # Musical guidelines
    suggested_keys = db.Column(db.JSON, default=list)
    tempo_range_min = db.Column(db.Integer)
    tempo_range_max = db.Column(db.Integer)
    energy_level = db.Column(db.String(20))  # low, medium, high, building, falling
    
    # Content guidelines
    required_tags = db.Column(db.JSON, default=list)
    preferred_themes = db.Column(db.JSON, default=list)
    notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    
    def __init__(self, template_id, section_name, section_order=0, **kwargs):
        self.template_id = template_id
        self.section_name = section_name
        self.section_order = section_order
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self):
        """Convert template section to dictionary."""
        return {
            'id': self.id,
            'template_id': self.template_id,
            'section_name': self.section_name,
            'section_order': self.section_order,
            'min_songs': self.min_songs,
            'max_songs': self.max_songs,
            'target_duration': self.target_duration,
            'suggested_keys': self.suggested_keys,
            'tempo_range_min': self.tempo_range_min,
            'tempo_range_max': self.tempo_range_max,
            'energy_level': self.energy_level,
            'required_tags': self.required_tags,
            'preferred_themes': self.preferred_themes,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<SetlistTemplateSection {self.section_name}>'


class SetlistCollaborator(db.Model):
    """Setlist sharing and collaboration."""
    __tablename__ = 'setlist_collaborators'
    
    id = db.Column(db.Integer, primary_key=True)
    setlist_id = db.Column(db.Integer, db.ForeignKey('setlists.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Permission level
    permission_level = db.Column(db.String(20), default='view')  # view, comment, edit, admin
    
    # Collaboration metadata
    invited_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    invited_at = db.Column(db.DateTime, default=utc_now)
    accepted_at = db.Column(db.DateTime)
    last_accessed = db.Column(db.DateTime)
    
    # Status
    status = db.Column(db.String(20), default='pending')  # pending, accepted, declined, revoked
    
    created_at = db.Column(db.DateTime, default=utc_now)
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('setlist_id', 'user_id', name='unique_setlist_collaborator'),)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='setlist_collaborations')
    inviter = db.relationship('User', foreign_keys=[invited_by])
    
    def __init__(self, setlist_id, user_id, permission_level='view', invited_by=None):
        self.setlist_id = setlist_id
        self.user_id = user_id
        self.permission_level = permission_level
        self.invited_by = invited_by
    
    def to_dict(self, include_user=False):
        """Convert collaborator to dictionary."""
        result = {
            'id': self.id,
            'setlist_id': self.setlist_id,
            'user_id': self.user_id,
            'permission_level': self.permission_level,
            'invited_by': self.invited_by,
            'invited_at': self.invited_at.isoformat() if self.invited_at else None,
            'accepted_at': self.accepted_at.isoformat() if self.accepted_at else None,
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if include_user and self.user:
            result['user'] = {
                'id': self.user.id,
                'email': self.user.email,
                'display_name': self.user.display_name
            }
        
        return result
    
    def __repr__(self):
        return f'<SetlistCollaborator {self.user_id} on setlist {self.setlist_id}>'


class SetlistPerformance(db.Model):
    """Performance analytics and reporting."""
    __tablename__ = 'setlist_performances'
    
    id = db.Column(db.Integer, primary_key=True)
    setlist_id = db.Column(db.Integer, db.ForeignKey('setlists.id'), nullable=False)
    performed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Performance context
    performance_date = db.Column(db.DateTime(timezone=True), nullable=False)
    venue = db.Column(db.String(255))
    event_type = db.Column(db.String(50))
    audience_size = db.Column(db.Integer)
    
    # Performance metrics
    total_duration = db.Column(db.Integer)  # Actual total duration in minutes
    songs_performed = db.Column(db.Integer)
    songs_skipped = db.Column(db.Integer, default=0)
    
    # Quality metrics
    overall_rating = db.Column(db.Integer)  # 1-5
    technical_rating = db.Column(db.Integer)  # 1-5
    audience_engagement = db.Column(db.String(20))  # excellent, good, fair, poor
    
    # Analytics
    notes = db.Column(db.Text)
    improvements_needed = db.Column(db.Text)
    highlights = db.Column(db.Text)
    
    # Metadata
    weather_conditions = db.Column(db.String(50))
    equipment_used = db.Column(db.JSON, default=list)
    team_members = db.Column(db.JSON, default=list)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    
    # Relationships
    performer = db.relationship('User', foreign_keys=[performed_by], backref='setlist_performances')
    performance_songs = db.relationship('SetlistPerformanceSong', backref='performance', cascade='all, delete-orphan')
    
    def __init__(self, setlist_id, performance_date, performed_by=None, **kwargs):
        self.setlist_id = setlist_id
        self.performance_date = performance_date
        self.performed_by = performed_by
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self, include_songs=False):
        """Convert performance to dictionary."""
        result = {
            'id': self.id,
            'setlist_id': self.setlist_id,
            'performed_by': self.performed_by,
            'performance_date': self.performance_date.isoformat() if self.performance_date else None,
            'venue': self.venue,
            'event_type': self.event_type,
            'audience_size': self.audience_size,
            'total_duration': self.total_duration,
            'songs_performed': self.songs_performed,
            'songs_skipped': self.songs_skipped,
            'overall_rating': self.overall_rating,
            'technical_rating': self.technical_rating,
            'audience_engagement': self.audience_engagement,
            'notes': self.notes,
            'improvements_needed': self.improvements_needed,
            'highlights': self.highlights,
            'weather_conditions': self.weather_conditions,
            'equipment_used': self.equipment_used,
            'team_members': self.team_members,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if include_songs:
            result['songs'] = [song.to_dict() for song in self.performance_songs]
        
        return result
    
    def __repr__(self):
        return f'<SetlistPerformance {self.id} for setlist {self.setlist_id}>'


class SetlistPerformanceSong(db.Model):
    """Individual song performance details within a setlist performance."""
    __tablename__ = 'setlist_performance_songs'
    
    id = db.Column(db.Integer, primary_key=True)
    performance_id = db.Column(db.Integer, db.ForeignKey('setlist_performances.id'), nullable=False)
    setlist_song_id = db.Column(db.Integer, db.ForeignKey('setlist_songs.id'), nullable=False)
    
    # Performance specifics
    actual_order = db.Column(db.Integer)  # Order actually performed
    was_performed = db.Column(db.Boolean, default=True)
    actual_key = db.Column(db.String(10))
    actual_tempo = db.Column(db.Integer)
    actual_duration = db.Column(db.Integer)  # Duration in seconds
    
    # Performance quality
    performance_rating = db.Column(db.Integer)  # 1-5
    technical_issues = db.Column(db.Text)
    audience_response = db.Column(db.String(20))
    
    # Notes
    performance_notes = db.Column(db.Text)
    improvement_notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    
    # Relationships
    setlist_song = db.relationship('SetlistSong', backref='performance_records')
    
    def __init__(self, performance_id, setlist_song_id, **kwargs):
        self.performance_id = performance_id
        self.setlist_song_id = setlist_song_id
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self, include_setlist_song=False):
        """Convert performance song to dictionary."""
        result = {
            'id': self.id,
            'performance_id': self.performance_id,
            'setlist_song_id': self.setlist_song_id,
            'actual_order': self.actual_order,
            'was_performed': self.was_performed,
            'actual_key': self.actual_key,
            'actual_tempo': self.actual_tempo,
            'actual_duration': self.actual_duration,
            'performance_rating': self.performance_rating,
            'technical_issues': self.technical_issues,
            'audience_response': self.audience_response,
            'performance_notes': self.performance_notes,
            'improvement_notes': self.improvement_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if include_setlist_song and self.setlist_song:
            result['setlist_song'] = self.setlist_song.to_dict()
        
        return result
    
    def __repr__(self):
        return f'<SetlistPerformanceSong {self.setlist_song_id} in performance {self.performance_id}>'