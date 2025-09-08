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
    
    # Enterprise authentication fields
    is_sso_user = db.Column(db.Boolean, default=False)  # SSO/SAML user
    is_ldap_user = db.Column(db.Boolean, default=False)  # LDAP/AD user
    sso_provider = db.Column(db.String(50), nullable=True)  # SSO provider name
    ldap_dn = db.Column(db.String(500), nullable=True)  # LDAP Distinguished Name
    mfa_enabled = db.Column(db.Boolean, default=False)  # Multi-factor authentication
    mfa_secret = db.Column(db.String(128), nullable=True)  # MFA secret key
    mfa_backup_codes = db.Column(db.JSON, default=list)  # Hashed backup codes
    last_mfa_verification = db.Column(db.DateTime, nullable=True)  # Last MFA verification
    login_attempts = db.Column(db.Integer, default=0)  # Failed login attempts
    locked_until = db.Column(db.DateTime, nullable=True)  # Account lock expiration
    password_expires_at = db.Column(db.DateTime, nullable=True)  # Password expiration
    
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
        """Convert user to dictionary (excluding password and sensitive auth data)."""
        return {
            'id': self.id,
            'email': self.email,
            'display_name': self.display_name,
            'bio': self.bio,
            'profile_image_url': self.profile_image_url,
            'is_sso_user': self.is_sso_user,
            'is_ldap_user': self.is_ldap_user,
            'sso_provider': self.sso_provider,
            'mfa_enabled': self.mfa_enabled,
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
            'band_leader': ['read', 'edit', 'comment', 'manage_participants', 'manage_resources', 'schedule_meetings'],
            'member': ['read', 'edit', 'comment', 'view_resources'],
            'guest': ['read', 'comment', 'view_resources'],
            'observer': ['read'],
            'editor': ['read', 'edit', 'comment'],
            'viewer': ['read', 'comment'],
            'commenter': ['read', 'comment']
        }
        
        # Professional collaboration template permissions
        if category == 'album':
            base_permissions['band_leader'].extend(['approve_recordings', 'manage_schedule'])
            base_permissions['member'].extend(['submit_recordings', 'view_schedule'])
        elif category == 'tour':
            base_permissions['band_leader'].extend(['manage_venues', 'manage_setlists'])
            base_permissions['member'].extend(['view_venues', 'view_setlists'])
        elif category == 'lesson_plan':
            base_permissions['band_leader'] = ['read', 'edit', 'manage_participants', 'manage_resources', 'create_assignments']
            base_permissions['member'] = ['read', 'comment', 'submit_assignments', 'view_resources']
        elif category == 'lesson':
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


# Professional Collaboration Workspace Models

class CollaborationRoom(db.Model):
    """Professional collaboration rooms with persistent state and enhanced features."""
    __tablename__ = 'collaboration_rooms'
    
    id = db.Column(db.String(36), primary_key=True)  # UUID
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    room_type = db.Column(db.String(50), nullable=False)  # 'album', 'tour', 'lesson_plan', 'general'
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Room configuration
    access_mode = db.Column(db.String(20), default='invite-only')  # 'invite-only', 'link-access', 'public'
    max_participants = db.Column(db.Integer, default=50)
    invitation_code = db.Column(db.String(12), unique=True, nullable=True)
    
    # Professional features
    has_resource_library = db.Column(db.Boolean, default=True)
    has_meeting_scheduler = db.Column(db.Boolean, default=True)
    has_calendar_integration = db.Column(db.Boolean, default=False)
    has_progress_tracking = db.Column(db.Boolean, default=True)
    has_chat_enabled = db.Column(db.Boolean, default=True)
    
    # Room state
    status = db.Column(db.String(20), default='active')  # 'active', 'archived', 'suspended'
    is_persistent = db.Column(db.Boolean, default=True)
    last_activity = db.Column(db.DateTime, default=utc_now)
    
    # Settings and metadata
    settings = db.Column(db.JSON, default=dict)
    room_metadata = db.Column(db.JSON, default=dict)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    creator = db.relationship('User', foreign_keys=[creator_id], backref='created_rooms')
    participants = db.relationship('RoomParticipant', backref='room', cascade='all, delete-orphan')
    resources = db.relationship('RoomResource', backref='room', cascade='all, delete-orphan')
    meetings = db.relationship('RoomMeeting', backref='room', cascade='all, delete-orphan')
    chat_messages = db.relationship('RoomChatMessage', backref='room', cascade='all, delete-orphan')
    
    def __init__(self, room_id, name, room_type, creator_id, **kwargs):
        self.id = room_id
        self.name = name
        self.room_type = room_type
        self.creator_id = creator_id
        
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        
        if kwargs.get('access_mode') == 'link-access':
            import secrets
            self.invitation_code = secrets.token_urlsafe(8)
    
    def to_dict(self, include_participants=False, include_resources=False):
        """Convert room to dictionary."""
        result = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'room_type': self.room_type,
            'creator_id': self.creator_id,
            'access_mode': self.access_mode,
            'max_participants': self.max_participants,
            'invitation_code': self.invitation_code,
            'has_resource_library': self.has_resource_library,
            'has_meeting_scheduler': self.has_meeting_scheduler,
            'has_calendar_integration': self.has_calendar_integration,
            'has_progress_tracking': self.has_progress_tracking,
            'has_chat_enabled': self.has_chat_enabled,
            'status': self.status,
            'is_persistent': self.is_persistent,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None,
            'settings': self.settings,
            'room_metadata': self.room_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_participants:
            result['participants'] = [p.to_dict() for p in self.participants]
        
        if include_resources:
            result['resources'] = [r.to_dict() for r in self.resources]
        
        return result
    
    def add_participant(self, user_id, role='member', invited_by=None):
        """Add participant to room."""
        existing = RoomParticipant.query.filter_by(
            room_id=self.id, user_id=user_id
        ).first()
        
        if existing:
            return existing
        
        participant = RoomParticipant(
            room_id=self.id,
            user_id=user_id,
            role=role,
            invited_by=invited_by
        )
        
        db.session.add(participant)
        self.last_activity = utc_now()
        
        return participant
    
    def can_access(self, user_id):
        """Check if user can access this room."""
        if self.creator_id == user_id:
            return True
        
        participant = RoomParticipant.query.filter_by(
            room_id=self.id, user_id=user_id
        ).first()
        
        return participant is not None
    
    def get_user_role(self, user_id):
        """Get user's role in this room."""
        if self.creator_id == user_id:
            return 'owner'
        
        participant = RoomParticipant.query.filter_by(
            room_id=self.id, user_id=user_id
        ).first()
        
        return participant.role if participant else None
    
    def __repr__(self):
        return f'<CollaborationRoom {self.name} ({self.room_type})>'


class RoomParticipant(db.Model):
    """Participants in professional collaboration rooms."""
    __tablename__ = 'room_participants'
    
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.String(36), db.ForeignKey('collaboration_rooms.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Professional role hierarchy
    role = db.Column(db.String(20), default='member')  # 'band_leader', 'member', 'guest', 'observer'
    status = db.Column(db.String(20), default='active')  # 'active', 'inactive', 'suspended'
    invited_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Participation tracking
    joined_at = db.Column(db.DateTime, default=utc_now)
    last_seen = db.Column(db.DateTime, default=utc_now)
    total_time = db.Column(db.Integer, default=0)  # Total time in room (seconds)
    contribution_score = db.Column(db.Integer, default=0)  # Professional contribution metric
    
    # Professional settings
    title = db.Column(db.String(100), nullable=True)  # e.g., "Lead Guitarist", "Vocalist"
    department = db.Column(db.String(100), nullable=True)  # For enterprise users
    notifications_enabled = db.Column(db.Boolean, default=True)
    calendar_integration_enabled = db.Column(db.Boolean, default=False)
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('room_id', 'user_id', name='unique_room_participant'),)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='room_participations')
    inviter = db.relationship('User', foreign_keys=[invited_by])
    
    def __init__(self, room_id, user_id, role='member', invited_by=None):
        self.room_id = room_id
        self.user_id = user_id
        self.role = role
        self.invited_by = invited_by
    
    def to_dict(self, include_user=False):
        """Convert participant to dictionary."""
        result = {
            'id': self.id,
            'room_id': self.room_id,
            'user_id': self.user_id,
            'role': self.role,
            'status': self.status,
            'invited_by': self.invited_by,
            'title': self.title,
            'department': self.department,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'total_time': self.total_time,
            'contribution_score': self.contribution_score,
            'notifications_enabled': self.notifications_enabled,
            'calendar_integration_enabled': self.calendar_integration_enabled
        }
        
        if include_user and self.user:
            result['user'] = {
                'id': self.user.id,
                'email': self.user.email,
                'display_name': self.user.display_name
            }
        
        return result
    
    def has_permission(self, permission):
        """Check if participant has specific permission based on professional role."""
        permissions = {
            'band_leader': [
                'read', 'edit', 'comment', 'manage_participants', 'manage_resources',
                'schedule_meetings', 'manage_calendar', 'manage_room'
            ],
            'member': [
                'read', 'edit', 'comment', 'view_resources', 'join_meetings',
                'use_calendar', 'create_content'
            ],
            'guest': [
                'read', 'comment', 'view_resources', 'join_meetings'
            ],
            'observer': [
                'read', 'view_resources'
            ]
        }
        
        role_permissions = permissions.get(self.role, [])
        return permission in role_permissions
    
    def __repr__(self):
        return f'<RoomParticipant {self.user_id} in {self.room_id} ({self.role})>'


class RoomResource(db.Model):
    """Resource library within collaboration rooms."""
    __tablename__ = 'room_resources'
    
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.String(36), db.ForeignKey('collaboration_rooms.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    resource_type = db.Column(db.String(50), nullable=False)  # 'document', 'audio', 'video', 'chord_chart', 'setlist'
    
    # Resource content
    content_url = db.Column(db.String(500), nullable=True)  # URL for external resources
    content_data = db.Column(db.JSON, nullable=True)  # For embedded content
    file_size = db.Column(db.Integer, nullable=True)  # Size in bytes
    mime_type = db.Column(db.String(100), nullable=True)
    
    # Organization
    category = db.Column(db.String(100), nullable=True)  # e.g., "Sheet Music", "Recordings", "Reference"
    tags = db.Column(db.JSON, default=list)
    
    # Access control
    access_level = db.Column(db.String(20), default='room')  # 'room', 'band_leader_only', 'member_plus'
    is_shared_externally = db.Column(db.Boolean, default=False)
    
    # Metadata
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    version = db.Column(db.Integer, default=1)
    view_count = db.Column(db.Integer, default=0)
    download_count = db.Column(db.Integer, default=0)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    creator = db.relationship('User', backref='created_resources')
    
    def __init__(self, room_id, name, resource_type, created_by, **kwargs):
        self.room_id = room_id
        self.name = name
        self.resource_type = resource_type
        self.created_by = created_by
        
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self):
        """Convert resource to dictionary."""
        return {
            'id': self.id,
            'room_id': self.room_id,
            'name': self.name,
            'description': self.description,
            'resource_type': self.resource_type,
            'content_url': self.content_url,
            'content_data': self.content_data,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'category': self.category,
            'tags': self.tags,
            'access_level': self.access_level,
            'is_shared_externally': self.is_shared_externally,
            'created_by': self.created_by,
            'version': self.version,
            'view_count': self.view_count,
            'download_count': self.download_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def can_access(self, user_role):
        """Check if user role can access this resource."""
        access_permissions = {
            'room': ['band_leader', 'member', 'guest', 'observer'],
            'band_leader_only': ['band_leader'],
            'member_plus': ['band_leader', 'member']
        }
        
        allowed_roles = access_permissions.get(self.access_level, [])
        return user_role in allowed_roles
    
    def __repr__(self):
        return f'<RoomResource {self.name} ({self.resource_type})>'


class RoomMeeting(db.Model):
    """Meeting scheduler and agenda management for collaboration rooms."""
    __tablename__ = 'room_meetings'
    
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.String(36), db.ForeignKey('collaboration_rooms.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # Scheduling
    scheduled_at = db.Column(db.DateTime, nullable=False)
    duration_minutes = db.Column(db.Integer, default=60)
    timezone = db.Column(db.String(50), default='UTC')
    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_pattern = db.Column(db.String(100), nullable=True)  # e.g., "weekly", "monthly"
    
    # Meeting details
    agenda = db.Column(db.JSON, default=list)  # List of agenda items
    location = db.Column(db.String(255), nullable=True)  # Physical or virtual location
    meeting_url = db.Column(db.String(500), nullable=True)  # Video conference URL
    
    # Status and management
    status = db.Column(db.String(20), default='scheduled')  # 'scheduled', 'in_progress', 'completed', 'cancelled'
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    max_attendees = db.Column(db.Integer, nullable=True)
    
    # Calendar integration
    google_calendar_event_id = db.Column(db.String(255), nullable=True)
    outlook_calendar_event_id = db.Column(db.String(255), nullable=True)
    ical_uid = db.Column(db.String(255), nullable=True)
    
    # Meeting outcomes
    meeting_notes = db.Column(db.Text, nullable=True)
    action_items = db.Column(db.JSON, default=list)
    decisions_made = db.Column(db.JSON, default=list)
    next_meeting_date = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    creator = db.relationship('User', backref='created_meetings')
    attendees = db.relationship('MeetingAttendee', backref='meeting', cascade='all, delete-orphan')
    
    def __init__(self, room_id, title, scheduled_at, created_by, **kwargs):
        self.room_id = room_id
        self.title = title
        self.scheduled_at = scheduled_at
        self.created_by = created_by
        
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self, include_attendees=False):
        """Convert meeting to dictionary."""
        result = {
            'id': self.id,
            'room_id': self.room_id,
            'title': self.title,
            'description': self.description,
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'duration_minutes': self.duration_minutes,
            'timezone': self.timezone,
            'is_recurring': self.is_recurring,
            'recurrence_pattern': self.recurrence_pattern,
            'agenda': self.agenda,
            'location': self.location,
            'meeting_url': self.meeting_url,
            'status': self.status,
            'created_by': self.created_by,
            'max_attendees': self.max_attendees,
            'google_calendar_event_id': self.google_calendar_event_id,
            'outlook_calendar_event_id': self.outlook_calendar_event_id,
            'ical_uid': self.ical_uid,
            'meeting_notes': self.meeting_notes,
            'action_items': self.action_items,
            'decisions_made': self.decisions_made,
            'next_meeting_date': self.next_meeting_date.isoformat() if self.next_meeting_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_attendees:
            result['attendees'] = [a.to_dict() for a in self.attendees]
        
        return result
    
    def add_attendee(self, user_id, is_required=False):
        """Add attendee to meeting."""
        existing = MeetingAttendee.query.filter_by(
            meeting_id=self.id, user_id=user_id
        ).first()
        
        if existing:
            return existing
        
        attendee = MeetingAttendee(
            meeting_id=self.id,
            user_id=user_id,
            is_required=is_required
        )
        
        db.session.add(attendee)
        return attendee
    
    def __repr__(self):
        return f'<RoomMeeting {self.title} at {self.scheduled_at}>'


class MeetingAttendee(db.Model):
    """Meeting attendees with RSVP and participation tracking."""
    __tablename__ = 'meeting_attendees'
    
    id = db.Column(db.Integer, primary_key=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey('room_meetings.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # RSVP and participation
    rsvp_status = db.Column(db.String(20), default='pending')  # 'pending', 'accepted', 'declined', 'tentative'
    is_required = db.Column(db.Boolean, default=False)
    attended = db.Column(db.Boolean, nullable=True)  # Null until meeting completion
    join_time = db.Column(db.DateTime, nullable=True)
    leave_time = db.Column(db.DateTime, nullable=True)
    
    # Calendar integration
    calendar_reminder_sent = db.Column(db.Boolean, default=False)
    calendar_updated = db.Column(db.Boolean, default=False)
    
    # Timestamps
    invited_at = db.Column(db.DateTime, default=utc_now)
    responded_at = db.Column(db.DateTime, nullable=True)
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('meeting_id', 'user_id', name='unique_meeting_attendee'),)
    
    # Relationships
    user = db.relationship('User', backref='meeting_attendances')
    
    def __init__(self, meeting_id, user_id, is_required=False):
        self.meeting_id = meeting_id
        self.user_id = user_id
        self.is_required = is_required
    
    def to_dict(self):
        """Convert attendee to dictionary."""
        return {
            'id': self.id,
            'meeting_id': self.meeting_id,
            'user_id': self.user_id,
            'rsvp_status': self.rsvp_status,
            'is_required': self.is_required,
            'attended': self.attended,
            'join_time': self.join_time.isoformat() if self.join_time else None,
            'leave_time': self.leave_time.isoformat() if self.leave_time else None,
            'calendar_reminder_sent': self.calendar_reminder_sent,
            'calendar_updated': self.calendar_updated,
            'invited_at': self.invited_at.isoformat() if self.invited_at else None,
            'responded_at': self.responded_at.isoformat() if self.responded_at else None
        }
    
    def __repr__(self):
        return f'<MeetingAttendee {self.user_id} for meeting {self.meeting_id}>'


class RoomChatMessage(db.Model):
    """Room-specific chat and communication tools."""
    __tablename__ = 'room_chat_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.String(36), db.ForeignKey('collaboration_rooms.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Message content
    message_type = db.Column(db.String(20), default='text')  # 'text', 'file', 'link', 'system', 'announcement'
    content = db.Column(db.Text, nullable=False)
    formatted_content = db.Column(db.Text, nullable=True)  # HTML formatted content
    
    # Threading and replies
    parent_message_id = db.Column(db.Integer, db.ForeignKey('room_chat_messages.id'), nullable=True)
    thread_id = db.Column(db.String(36), nullable=True)  # For message threading
    
    # Attachments and metadata
    attachments = db.Column(db.JSON, default=list)  # File attachments
    mentions = db.Column(db.JSON, default=list)  # User mentions
    reactions = db.Column(db.JSON, default=dict)  # Message reactions/emoji
    
    # Message status
    is_pinned = db.Column(db.Boolean, default=False)
    is_edited = db.Column(db.Boolean, default=False)
    is_deleted = db.Column(db.Boolean, default=False)
    deleted_at = db.Column(db.DateTime, nullable=True)
    edited_at = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=utc_now)
    
    # Relationships
    sender = db.relationship('User', backref='chat_messages')
    parent = db.relationship('RoomChatMessage', remote_side=[id], backref='replies')
    
    def __init__(self, room_id, sender_id, content, message_type='text'):
        self.room_id = room_id
        self.sender_id = sender_id
        self.content = content
        self.message_type = message_type
    
    def to_dict(self, include_replies=False):
        """Convert message to dictionary."""
        result = {
            'id': self.id,
            'room_id': self.room_id,
            'sender_id': self.sender_id,
            'message_type': self.message_type,
            'content': self.content,
            'formatted_content': self.formatted_content,
            'parent_message_id': self.parent_message_id,
            'thread_id': self.thread_id,
            'attachments': self.attachments,
            'mentions': self.mentions,
            'reactions': self.reactions,
            'is_pinned': self.is_pinned,
            'is_edited': self.is_edited,
            'is_deleted': self.is_deleted,
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'edited_at': self.edited_at.isoformat() if self.edited_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if include_replies:
            result['replies'] = [r.to_dict() for r in self.replies]
        
        return result
    
    def add_reaction(self, user_id, emoji):
        """Add reaction to message."""
        if not self.reactions:
            self.reactions = {}
        
        if emoji not in self.reactions:
            self.reactions[emoji] = []
        
        if user_id not in self.reactions[emoji]:
            self.reactions[emoji].append(user_id)
    
    def remove_reaction(self, user_id, emoji):
        """Remove reaction from message."""
        if self.reactions and emoji in self.reactions:
            if user_id in self.reactions[emoji]:
                self.reactions[emoji].remove(user_id)
                if not self.reactions[emoji]:
                    del self.reactions[emoji]
    
    def __repr__(self):
        return f'<RoomChatMessage {self.id} from {self.sender_id}>'


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
    """Setlist sharing and collaboration with role-based band coordination."""
    __tablename__ = 'setlist_collaborators'
    
    id = db.Column(db.Integer, primary_key=True)
    setlist_id = db.Column(db.Integer, db.ForeignKey('setlists.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Permission level
    permission_level = db.Column(db.String(20), default='view')  # view, comment, edit, admin
    
    # Band role coordination (NEW)
    band_role = db.Column(db.String(30))  # lead, rhythm, bass, drums, keys, vocals, sound_engineer, etc.
    instrument = db.Column(db.String(50))  # primary instrument for this collaborator
    is_lead_for_role = db.Column(db.Boolean, default=False)  # lead guitarist, lead vocalist, etc.
    backup_roles = db.Column(db.JSON, default=list)  # additional roles this person can fill
    
    # External sharing capabilities (NEW)
    external_access_level = db.Column(db.String(20))  # full, limited, view_only, none
    can_download_files = db.Column(db.Boolean, default=False)
    can_view_contact_info = db.Column(db.Boolean, default=False)
    external_notes = db.Column(db.Text)  # notes for external collaborators (venues, sound engineers)
    
    # Performance preparation (NEW)
    preparation_tasks = db.Column(db.JSON, default=list)  # assigned preparation tasks
    task_completion_status = db.Column(db.JSON, default=dict)  # task_id -> completion status
    
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
            'band_role': self.band_role,
            'instrument': self.instrument,
            'is_lead_for_role': self.is_lead_for_role,
            'backup_roles': self.backup_roles,
            'external_access_level': self.external_access_level,
            'can_download_files': self.can_download_files,
            'can_view_contact_info': self.can_view_contact_info,
            'external_notes': self.external_notes,
            'preparation_tasks': self.preparation_tasks,
            'task_completion_status': self.task_completion_status,
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


class SetlistComment(db.Model):
    """Comments and annotations for setlist items."""
    __tablename__ = 'setlist_comments'
    
    id = db.Column(db.Integer, primary_key=True)
    setlist_id = db.Column(db.Integer, db.ForeignKey('setlists.id'), nullable=False)
    setlist_song_id = db.Column(db.Integer, db.ForeignKey('setlist_songs.id'), nullable=True)  # null for general comments
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    parent_comment_id = db.Column(db.Integer, db.ForeignKey('setlist_comments.id'), nullable=True)  # for threaded comments
    
    # Comment content
    content = db.Column(db.Text, nullable=False)
    comment_type = db.Column(db.String(30), default='general')  # general, suggestion, arrangement, technical, performance
    priority = db.Column(db.String(10), default='normal')  # low, normal, high, urgent
    
    # Status tracking
    is_resolved = db.Column(db.Boolean, default=False)
    resolved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    resolved_at = db.Column(db.DateTime)
    
    # Positioning for inline comments
    target_element = db.Column(db.String(50))  # song_title, section, lyrics, chords, etc.
    element_position = db.Column(db.Integer)  # line number, character position, etc.
    
    # Visibility and permissions
    is_private = db.Column(db.Boolean, default=False)  # private to the author
    visible_to_roles = db.Column(db.JSON, default=list)  # specific roles that can see this comment
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    setlist = db.relationship('Setlist', backref='comments')
    setlist_song = db.relationship('SetlistSong', backref='comments')
    author = db.relationship('User', foreign_keys=[user_id], backref='setlist_comments')
    resolver = db.relationship('User', foreign_keys=[resolved_by])
    parent_comment = db.relationship('SetlistComment', remote_side=[id], backref='replies')
    
    def __init__(self, setlist_id, user_id, content, **kwargs):
        self.setlist_id = setlist_id
        self.user_id = user_id
        self.content = content
        
        # Handle additional parameters
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self, include_author=True, include_replies=False):
        """Convert comment to dictionary."""
        result = {
            'id': self.id,
            'setlist_id': self.setlist_id,
            'setlist_song_id': self.setlist_song_id,
            'user_id': self.user_id,
            'parent_comment_id': self.parent_comment_id,
            'content': self.content,
            'comment_type': self.comment_type,
            'priority': self.priority,
            'is_resolved': self.is_resolved,
            'resolved_by': self.resolved_by,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'target_element': self.target_element,
            'element_position': self.element_position,
            'is_private': self.is_private,
            'visible_to_roles': self.visible_to_roles,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_author and self.author:
            result['author'] = {
                'id': self.author.id,
                'email': self.author.email,
                'display_name': self.author.display_name
            }
        
        if include_replies:
            result['replies'] = [reply.to_dict(include_author=include_author, include_replies=False) 
                               for reply in self.replies]
        
        return result
    
    def can_user_view(self, user_id):
        """Check if a user can view this comment."""
        # Author can always view
        if self.user_id == user_id:
            return True
        
        # Private comments only visible to author
        if self.is_private:
            return False
        
        # Check setlist access
        setlist = Setlist.query.get(self.setlist_id)
        if not setlist or not setlist.can_user_access(user_id):
            return False
        
        # Check role-based visibility
        if self.visible_to_roles:
            collaborator = SetlistCollaborator.query.filter_by(
                setlist_id=self.setlist_id, user_id=user_id, status='accepted'
            ).first()
            
            if collaborator and collaborator.band_role in self.visible_to_roles:
                return True
            
            # Owner has access to all comments
            if setlist.user_id == user_id:
                return True
            
            return False
        
        return True
    
    def __repr__(self):
        return f'<SetlistComment {self.id} on setlist {self.setlist_id}>'


class SetlistTask(db.Model):
    """Performance preparation tasks for setlist collaborators."""
    __tablename__ = 'setlist_tasks'
    
    id = db.Column(db.Integer, primary_key=True)
    setlist_id = db.Column(db.Integer, db.ForeignKey('setlists.id'), nullable=False)
    setlist_song_id = db.Column(db.Integer, db.ForeignKey('setlist_songs.id'), nullable=True)  # null for general tasks
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # null for unassigned
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Task details
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    task_type = db.Column(db.String(30), default='general')  # practice, setup, coordination, technical, review
    priority = db.Column(db.String(10), default='normal')  # low, normal, high, urgent
    
    # Status and tracking
    status = db.Column(db.String(20), default='todo')  # todo, in_progress, completed, cancelled
    progress_percentage = db.Column(db.Integer, default=0)
    estimated_duration = db.Column(db.Integer)  # minutes
    actual_duration = db.Column(db.Integer)  # minutes
    
    # Scheduling
    due_date = db.Column(db.DateTime)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    # Dependencies and coordination
    depends_on_tasks = db.Column(db.JSON, default=list)  # task IDs this depends on
    role_requirements = db.Column(db.JSON, default=list)  # roles needed for this task
    
    # Notes and updates
    notes = db.Column(db.Text)
    completion_notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    setlist = db.relationship('Setlist', backref='tasks')
    setlist_song = db.relationship('SetlistSong', backref='tasks')
    assignee = db.relationship('User', foreign_keys=[assigned_to], backref='assigned_setlist_tasks')
    creator = db.relationship('User', foreign_keys=[created_by])
    
    def __init__(self, setlist_id, created_by, title, **kwargs):
        self.setlist_id = setlist_id
        self.created_by = created_by
        self.title = title
        
        # Handle additional parameters
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self, include_assignee=True, include_creator=True):
        """Convert task to dictionary."""
        result = {
            'id': self.id,
            'setlist_id': self.setlist_id,
            'setlist_song_id': self.setlist_song_id,
            'assigned_to': self.assigned_to,
            'created_by': self.created_by,
            'title': self.title,
            'description': self.description,
            'task_type': self.task_type,
            'priority': self.priority,
            'status': self.status,
            'progress_percentage': self.progress_percentage,
            'estimated_duration': self.estimated_duration,
            'actual_duration': self.actual_duration,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'depends_on_tasks': self.depends_on_tasks,
            'role_requirements': self.role_requirements,
            'notes': self.notes,
            'completion_notes': self.completion_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_assignee and self.assignee:
            result['assignee'] = {
                'id': self.assignee.id,
                'email': self.assignee.email,
                'display_name': self.assignee.display_name
            }
        
        if include_creator and self.creator:
            result['creator'] = {
                'id': self.creator.id,
                'email': self.creator.email,
                'display_name': self.creator.display_name
            }
        
        return result
    
    def __repr__(self):
        return f'<SetlistTask {self.title} for setlist {self.setlist_id}>'


class PerformanceSession(db.Model):
    """
    Detailed performance session tracking for analytics and feedback.
    Records real-time user interactions during song/setlist performances.
    """
    __tablename__ = 'performance_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id'), nullable=True)
    setlist_id = db.Column(db.Integer, db.ForeignKey('setlists.id'), nullable=True)
    
    # Session context
    session_type = db.Column(db.String(50), nullable=False)  # 'practice', 'performance', 'rehearsal'
    device_type = db.Column(db.String(50))  # 'mobile', 'tablet', 'desktop'
    
    # Session timing
    started_at = db.Column(db.DateTime(timezone=True), nullable=False)
    ended_at = db.Column(db.DateTime(timezone=True))
    total_duration = db.Column(db.Integer)  # Total session duration in seconds
    active_duration = db.Column(db.Integer)  # Time actively engaged (excluding long pauses)
    
    # Performance metrics
    tempo_changes = db.Column(db.Integer, default=0)  # Number of tempo adjustments
    pause_count = db.Column(db.Integer, default=0)  # Number of pauses
    rewind_count = db.Column(db.Integer, default=0)  # Number of rewinds/seeks backward
    fast_forward_count = db.Column(db.Integer, default=0)  # Number of fast forwards
    completion_percentage = db.Column(db.Float, default=0.0)  # How much of content was completed
    
    # Quality metrics
    session_rating = db.Column(db.Integer)  # User's self-rating 1-5
    difficulty_rating = db.Column(db.Integer)  # User's difficulty rating 1-5
    
    # Privacy and consent
    analytics_consent = db.Column(db.Boolean, default=False)  # User consented to detailed analytics
    anonymous_data_only = db.Column(db.Boolean, default=True)  # Only collect anonymous data
    
    # Metadata
    session_metadata = db.Column(db.JSON, default=dict)  # Additional session context
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    user = db.relationship('User', backref='performance_sessions')
    song = db.relationship('Song', backref='performance_sessions')
    setlist = db.relationship('Setlist', backref='performance_sessions')
    events = db.relationship('PerformanceEvent', backref='session', cascade='all, delete-orphan')
    problem_sections = db.relationship('ProblemSection', backref='session', cascade='all, delete-orphan')
    
    def __init__(self, user_id, session_type, **kwargs):
        self.user_id = user_id
        self.session_type = session_type
        self.started_at = datetime.now(UTC)
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def end_session(self):
        """Mark session as ended and calculate metrics."""
        self.ended_at = datetime.now(UTC)
        if self.started_at:
            self.total_duration = int((self.ended_at - self.started_at).total_seconds())
    
    def to_dict(self, include_events=False):
        """Convert session to dictionary."""
        result = {
            'id': self.id,
            'user_id': self.user_id if not self.anonymous_data_only else None,
            'song_id': self.song_id,
            'setlist_id': self.setlist_id,
            'session_type': self.session_type,
            'device_type': self.device_type,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'total_duration': self.total_duration,
            'active_duration': self.active_duration,
            'tempo_changes': self.tempo_changes,
            'pause_count': self.pause_count,
            'rewind_count': self.rewind_count,
            'fast_forward_count': self.fast_forward_count,
            'completion_percentage': self.completion_percentage,
            'session_rating': self.session_rating,
            'difficulty_rating': self.difficulty_rating,
            'session_metadata': self.session_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if include_events:
            result['events'] = [event.to_dict() for event in self.events]
            result['problem_sections'] = [ps.to_dict() for ps in self.problem_sections]
        
        return result
    
    def __repr__(self):
        return f'<PerformanceSession {self.id} by user {self.user_id}>'


class PerformanceEvent(db.Model):
    """
    Individual events during a performance session (pause, rewind, tempo change, etc.).
    Used for detailed analysis of user behavior patterns.
    """
    __tablename__ = 'performance_events'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('performance_sessions.id'), nullable=False)
    
    # Event details
    event_type = db.Column(db.String(50), nullable=False)  # 'pause', 'play', 'rewind', 'fast_forward', 'tempo_change', 'seek'
    timestamp = db.Column(db.DateTime(timezone=True), nullable=False)  # When the event occurred
    position_seconds = db.Column(db.Float)  # Position in the song/content when event occurred
    
    # Event-specific data
    event_data = db.Column(db.JSON, default=dict)  # Additional event context
    
    # Context
    chord_at_position = db.Column(db.String(20))  # Chord being played when event occurred
    section_name = db.Column(db.String(100))  # Song section (verse, chorus, etc.)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    
    def __init__(self, session_id, event_type, position_seconds=None, **kwargs):
        self.session_id = session_id
        self.event_type = event_type
        self.position_seconds = position_seconds
        self.timestamp = datetime.now(UTC)
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self):
        """Convert event to dictionary."""
        return {
            'id': self.id,
            'session_id': self.session_id,
            'event_type': self.event_type,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'position_seconds': self.position_seconds,
            'event_data': self.event_data,
            'chord_at_position': self.chord_at_position,
            'section_name': self.section_name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<PerformanceEvent {self.event_type} at {self.position_seconds}s>'


class ProblemSection(db.Model):
    """
    Identified problem sections where users frequently pause, rewind, or struggle.
    Generated by analytics algorithms from performance events.
    """
    __tablename__ = 'problem_sections'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('performance_sessions.id'), nullable=False)
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id'), nullable=True)
    
    # Section details
    start_position = db.Column(db.Float, nullable=False)  # Start position in seconds
    end_position = db.Column(db.Float, nullable=False)  # End position in seconds
    section_name = db.Column(db.String(100))  # Identified section name
    
    # Problem metrics
    problem_type = db.Column(db.String(50), nullable=False)  # 'frequent_pauses', 'multiple_rewinds', 'tempo_struggles'
    severity_score = db.Column(db.Float, default=1.0)  # 1.0 (low) to 5.0 (high)
    event_count = db.Column(db.Integer, default=1)  # Number of problematic events in this section
    
    # Analysis
    identified_issues = db.Column(db.JSON, default=list)  # List of specific issues found
    suggested_improvements = db.Column(db.JSON, default=list)  # AI-generated improvement suggestions
    
    # Context
    chord_changes = db.Column(db.JSON, default=list)  # Chord progression in this section
    tempo_bpm = db.Column(db.Integer)  # Expected tempo for this section
    difficulty_factors = db.Column(db.JSON, default=list)  # Factors making this section difficult
    
    created_at = db.Column(db.DateTime, default=utc_now)
    
    # Relationships
    song = db.relationship('Song', backref='problem_sections')
    
    def __init__(self, session_id, start_position, end_position, problem_type, **kwargs):
        self.session_id = session_id
        self.start_position = start_position
        self.end_position = end_position
        self.problem_type = problem_type
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self):
        """Convert problem section to dictionary."""
        return {
            'id': self.id,
            'session_id': self.session_id,
            'song_id': self.song_id,
            'start_position': self.start_position,
            'end_position': self.end_position,
            'section_name': self.section_name,
            'problem_type': self.problem_type,
            'severity_score': self.severity_score,
            'event_count': self.event_count,
            'identified_issues': self.identified_issues,
            'suggested_improvements': self.suggested_improvements,
            'chord_changes': self.chord_changes,
            'tempo_bpm': self.tempo_bpm,
            'difficulty_factors': self.difficulty_factors,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<ProblemSection {self.problem_type} at {self.start_position}-{self.end_position}s>'


class PerformanceAnalytics(db.Model):
    """
    Aggregated analytics data for songs and users.
    Contains machine learning insights and recommendations.
    """
    __tablename__ = 'performance_analytics'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Null for anonymous data
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id'), nullable=True)
    setlist_id = db.Column(db.Integer, db.ForeignKey('setlists.id'), nullable=True)
    
    # Time period for this analytics snapshot
    analytics_period = db.Column(db.String(20), nullable=False)  # 'daily', 'weekly', 'monthly'
    period_start = db.Column(db.DateTime(timezone=True), nullable=False)
    period_end = db.Column(db.DateTime(timezone=True), nullable=False)
    
    # Aggregated metrics
    total_sessions = db.Column(db.Integer, default=0)
    total_practice_time = db.Column(db.Integer, default=0)  # Total time in seconds
    average_session_length = db.Column(db.Float, default=0.0)
    completion_rate = db.Column(db.Float, default=0.0)  # Average completion percentage
    
    # Problem analysis
    most_common_problems = db.Column(db.JSON, default=list)  # Most frequent problem types
    problem_sections_count = db.Column(db.Integer, default=0)
    improvement_score = db.Column(db.Float, default=0.0)  # Overall improvement trend
    
    # Recommendations
    ai_recommendations = db.Column(db.JSON, default=list)  # AI-generated recommendations
    practice_suggestions = db.Column(db.JSON, default=list)  # Specific practice suggestions
    difficulty_assessment = db.Column(db.JSON, default=dict)  # Assessment of user's skill level
    
    # Progress tracking
    previous_period_comparison = db.Column(db.JSON, default=dict)  # Comparison with previous period
    progress_trends = db.Column(db.JSON, default=dict)  # Progress trends over time
    
    # Privacy
    is_anonymous = db.Column(db.Boolean, default=True)
    data_retention_days = db.Column(db.Integer, default=90)  # How long to keep this data
    
    created_at = db.Column(db.DateTime, default=utc_now)
    expires_at = db.Column(db.DateTime)  # When this analytics data should be deleted
    
    # Relationships
    user = db.relationship('User', backref='analytics_snapshots')
    song = db.relationship('Song', backref='analytics_snapshots')
    setlist = db.relationship('Setlist', backref='analytics_snapshots')
    
    def __init__(self, analytics_period, period_start, period_end, **kwargs):
        self.analytics_period = analytics_period
        self.period_start = period_start
        self.period_end = period_end
        # Set expiration based on retention policy
        if 'data_retention_days' in kwargs:
            retention_days = kwargs['data_retention_days']
        else:
            retention_days = 90
        self.expires_at = datetime.now(UTC) + timedelta(days=retention_days)
        
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self):
        """Convert analytics to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id if not self.is_anonymous else None,
            'song_id': self.song_id,
            'setlist_id': self.setlist_id,
            'analytics_period': self.analytics_period,
            'period_start': self.period_start.isoformat() if self.period_start else None,
            'period_end': self.period_end.isoformat() if self.period_end else None,
            'total_sessions': self.total_sessions,
            'total_practice_time': self.total_practice_time,
            'average_session_length': self.average_session_length,
            'completion_rate': self.completion_rate,
            'most_common_problems': self.most_common_problems,
            'problem_sections_count': self.problem_sections_count,
            'improvement_score': self.improvement_score,
            'ai_recommendations': self.ai_recommendations,
            'practice_suggestions': self.practice_suggestions,
            'difficulty_assessment': self.difficulty_assessment,
            'previous_period_comparison': self.previous_period_comparison,
            'progress_trends': self.progress_trends,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }
    
    def __repr__(self):
        return f'<PerformanceAnalytics {self.analytics_period} for {self.period_start.date()}>'


class Project(db.Model):
    """Project management for grouping setlists, tasks, and milestones."""
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    project_type = db.Column(db.String(50), default='album')  # album, tour, lesson_plan, general
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    collaboration_room_id = db.Column(db.Integer, db.ForeignKey('collaboration_rooms.id'), nullable=True)
    
    # Project timeline
    start_date = db.Column(db.DateTime)
    target_end_date = db.Column(db.DateTime)
    actual_end_date = db.Column(db.DateTime)
    
    # Status and progress
    status = db.Column(db.String(20), default='planning')  # planning, active, on_hold, completed, cancelled
    overall_progress = db.Column(db.Integer, default=0)  # 0-100
    
    # Project settings
    is_template = db.Column(db.Boolean, default=False)
    template_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)  # project template reference
    is_public = db.Column(db.Boolean, default=False)
    
    # Metadata
    tags = db.Column(db.JSON, default=list)
    custom_fields = db.Column(db.JSON, default=dict)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    owner = db.relationship('User', foreign_keys=[owner_id], backref='owned_projects')
    collaboration_room = db.relationship('CollaborationRoom', backref='project')
    template = db.relationship('Project', remote_side=[id], backref='instances')
    
    def __repr__(self):
        return f'<Project {self.name}>'
    
    def to_dict(self, include_stats=False):
        """Convert project to dictionary."""
        result = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'project_type': self.project_type,
            'owner_id': self.owner_id,
            'collaboration_room_id': self.collaboration_room_id,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'target_end_date': self.target_end_date.isoformat() if self.target_end_date else None,
            'actual_end_date': self.actual_end_date.isoformat() if self.actual_end_date else None,
            'status': self.status,
            'overall_progress': self.overall_progress,
            'is_template': self.is_template,
            'template_id': self.template_id,
            'is_public': self.is_public,
            'tags': self.tags,
            'custom_fields': self.custom_fields,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_stats:
            # Add calculated statistics
            total_tasks = ProjectTask.query.filter_by(project_id=self.id).count()
            completed_tasks = ProjectTask.query.filter_by(project_id=self.id, status='completed').count()
            overdue_tasks = ProjectTask.query.filter(
                ProjectTask.project_id == self.id,
                ProjectTask.due_date < utc_now(),
                ProjectTask.status.in_(['todo', 'in_progress'])
            ).count()
            
            result['stats'] = {
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'overdue_tasks': overdue_tasks,
                'completion_rate': (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
            }
        
        return result


class ProjectTask(db.Model):
    """Project-level tasks that can span multiple setlists."""
    __tablename__ = 'project_tasks'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    parent_task_id = db.Column(db.Integer, db.ForeignKey('project_tasks.id'), nullable=True)  # for subtasks
    setlist_id = db.Column(db.Integer, db.ForeignKey('setlists.id'), nullable=True)  # optional setlist link
    milestone_id = db.Column(db.Integer, db.ForeignKey('project_milestones.id'), nullable=True)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Task details
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    task_type = db.Column(db.String(30), default='general')  # songwriting, arrangement, recording, rehearsal, performance, administrative
    priority = db.Column(db.String(10), default='normal')  # low, normal, high, urgent
    
    # Status and tracking
    status = db.Column(db.String(20), default='todo')  # todo, in_progress, completed, cancelled, blocked
    progress_percentage = db.Column(db.Integer, default=0)
    estimated_hours = db.Column(db.Float)  # estimated hours for completion
    actual_hours = db.Column(db.Float, default=0)  # tracked hours
    
    # Scheduling
    start_date = db.Column(db.DateTime)
    due_date = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    # Dependencies and workflow
    depends_on_tasks = db.Column(db.JSON, default=list)  # task IDs this depends on
    blocks_tasks = db.Column(db.JSON, default=list)  # task IDs this blocks
    
    # Collaboration
    watchers = db.Column(db.JSON, default=list)  # user IDs watching this task
    tags = db.Column(db.JSON, default=list)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    project = db.relationship('Project', backref='tasks')
    parent_task = db.relationship('ProjectTask', remote_side=[id], backref='subtasks')
    setlist = db.relationship('Setlist', backref='project_tasks')
    milestone = db.relationship('ProjectMilestone', backref='tasks')
    assignee = db.relationship('User', foreign_keys=[assigned_to], backref='assigned_project_tasks')
    creator = db.relationship('User', foreign_keys=[created_by])
    
    def __repr__(self):
        return f'<ProjectTask {self.title}>'
    
    def to_dict(self, include_time_entries=False):
        """Convert task to dictionary."""
        result = {
            'id': self.id,
            'project_id': self.project_id,
            'parent_task_id': self.parent_task_id,
            'setlist_id': self.setlist_id,
            'milestone_id': self.milestone_id,
            'assigned_to': self.assigned_to,
            'created_by': self.created_by,
            'title': self.title,
            'description': self.description,
            'task_type': self.task_type,
            'priority': self.priority,
            'status': self.status,
            'progress_percentage': self.progress_percentage,
            'estimated_hours': self.estimated_hours,
            'actual_hours': self.actual_hours,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'depends_on_tasks': self.depends_on_tasks,
            'blocks_tasks': self.blocks_tasks,
            'watchers': self.watchers,
            'tags': self.tags,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_time_entries:
            result['time_entries'] = [entry.to_dict() for entry in self.time_entries]
        
        return result


class ProjectMilestone(db.Model):
    """Project milestones for tracking major deliverables."""
    __tablename__ = 'project_milestones'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    
    # Milestone details
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    milestone_type = db.Column(db.String(30), default='deliverable')  # deliverable, checkpoint, deadline, release
    
    # Timeline
    target_date = db.Column(db.DateTime, nullable=False)
    actual_date = db.Column(db.DateTime)
    
    # Status and progress
    status = db.Column(db.String(20), default='upcoming')  # upcoming, on_track, at_risk, completed, overdue
    completion_percentage = db.Column(db.Integer, default=0)
    
    # Dependencies
    depends_on_milestones = db.Column(db.JSON, default=list)  # milestone IDs this depends on
    
    # Metadata
    priority = db.Column(db.String(10), default='normal')  # low, normal, high, critical
    tags = db.Column(db.JSON, default=list)
    deliverables = db.Column(db.JSON, default=list)  # list of expected deliverables
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    project = db.relationship('Project', backref='milestones')
    
    def __repr__(self):
        return f'<ProjectMilestone {self.name}>'
    
    def to_dict(self):
        """Convert milestone to dictionary."""
        return {
            'id': self.id,
            'project_id': self.project_id,
            'name': self.name,
            'description': self.description,
            'milestone_type': self.milestone_type,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'actual_date': self.actual_date.isoformat() if self.actual_date else None,
            'status': self.status,
            'completion_percentage': self.completion_percentage,
            'depends_on_milestones': self.depends_on_milestones,
            'priority': self.priority,
            'tags': self.tags,
            'deliverables': self.deliverables,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class TimeEntry(db.Model):
    """Time tracking for project tasks."""
    __tablename__ = 'time_entries'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    task_id = db.Column(db.Integer, db.ForeignKey('project_tasks.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Time tracking
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime)
    duration_minutes = db.Column(db.Integer)  # calculated duration in minutes
    
    # Entry details
    description = db.Column(db.Text)
    activity_type = db.Column(db.String(30), default='work')  # work, meeting, research, practice, review
    is_billable = db.Column(db.Boolean, default=True)
    
    # Manual vs automatic
    is_manual_entry = db.Column(db.Boolean, default=False)
    is_running = db.Column(db.Boolean, default=False)  # for active timers
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    project = db.relationship('Project', backref='time_entries')
    task = db.relationship('ProjectTask', backref='time_entries')
    user = db.relationship('User', backref='time_entries')
    
    def __repr__(self):
        return f'<TimeEntry {self.duration_minutes}min by user {self.user_id}>'
    
    def to_dict(self):
        """Convert time entry to dictionary."""
        return {
            'id': self.id,
            'project_id': self.project_id,
            'task_id': self.task_id,
            'user_id': self.user_id,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'duration_minutes': self.duration_minutes,
            'description': self.description,
            'activity_type': self.activity_type,
            'is_billable': self.is_billable,
            'is_manual_entry': self.is_manual_entry,
            'is_running': self.is_running,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class ProjectTemplate(db.Model):
    """Predefined project templates for common music scenarios."""
    __tablename__ = 'project_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    template_type = db.Column(db.String(50), nullable=False)  # album_production, tour_management, lesson_plan
    category = db.Column(db.String(50), default='music')  # music, education, business
    
    # Template definition
    stages = db.Column(db.JSON, nullable=False)  # predefined workflow stages
    default_tasks = db.Column(db.JSON, default=list)  # template tasks
    default_milestones = db.Column(db.JSON, default=list)  # template milestones
    estimated_duration_days = db.Column(db.Integer)
    
    # Usage and metadata
    is_public = db.Column(db.Boolean, default=True)
    usage_count = db.Column(db.Integer, default=0)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Internationalization
    localized_names = db.Column(db.JSON, default=dict)  # {locale: name}
    localized_descriptions = db.Column(db.JSON, default=dict)  # {locale: description}
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    creator = db.relationship('User', backref='created_project_templates')
    
    def __repr__(self):
        return f'<ProjectTemplate {self.name}>'
    
    def to_dict(self, locale='en'):
        """Convert template to dictionary with localization."""
        name = self.localized_names.get(locale, self.name)
        description = self.localized_descriptions.get(locale, self.description)
        
        return {
            'id': self.id,
            'name': name,
            'description': description,
            'template_type': self.template_type,
            'category': self.category,
            'stages': self.stages,
            'default_tasks': self.default_tasks,
            'default_milestones': self.default_milestones,
            'estimated_duration_days': self.estimated_duration_days,
            'is_public': self.is_public,
            'usage_count': self.usage_count,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


# Community Forum Models

class ForumCategory(db.Model):
    """Forum categories for organizing discussions."""
    __tablename__ = 'forum_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    slug = db.Column(db.String(100), unique=True, nullable=False, index=True)
    color = db.Column(db.String(7), default='#3498db')  # Hex color code
    icon = db.Column(db.String(50))  # Font icon class or emoji
    
    # Hierarchy support
    parent_id = db.Column(db.Integer, db.ForeignKey('forum_categories.id'), nullable=True)
    display_order = db.Column(db.Integer, default=0)
    
    # Access control
    is_public = db.Column(db.Boolean, default=True)
    required_reputation = db.Column(db.Integer, default=0)  # Minimum reputation to post
    moderator_only = db.Column(db.Boolean, default=False)
    
    # Moderation settings
    auto_approve_posts = db.Column(db.Boolean, default=True)
    allow_anonymous = db.Column(db.Boolean, default=False)
    
    # Internationalization
    localized_names = db.Column(db.JSON, default=dict)  # {locale: name}
    localized_descriptions = db.Column(db.JSON, default=dict)  # {locale: description}
    
    # Statistics
    thread_count = db.Column(db.Integer, default=0)
    post_count = db.Column(db.Integer, default=0)
    last_activity_at = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    subcategories = db.relationship('ForumCategory', backref=db.backref('parent', remote_side=[id]))
    threads = db.relationship('ForumThread', backref='category', lazy=True, cascade='all, delete-orphan')
    
    def __init__(self, name, slug, description=None, parent_id=None, color='#3498db'):
        self.name = name
        self.slug = slug
        self.description = description
        self.parent_id = parent_id
        self.color = color
    
    def to_dict(self, locale='en', include_stats=True):
        """Convert category to dictionary with localization."""
        name = self.localized_names.get(locale, self.name)
        description = self.localized_descriptions.get(locale, self.description)
        
        result = {
            'id': self.id,
            'name': name,
            'description': description,
            'slug': self.slug,
            'color': self.color,
            'icon': self.icon,
            'parent_id': self.parent_id,
            'display_order': self.display_order,
            'is_public': self.is_public,
            'required_reputation': self.required_reputation,
            'moderator_only': self.moderator_only,
            'auto_approve_posts': self.auto_approve_posts,
            'allow_anonymous': self.allow_anonymous,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_stats:
            result.update({
                'thread_count': self.thread_count,
                'post_count': self.post_count,
                'last_activity_at': self.last_activity_at.isoformat() if self.last_activity_at else None
            })
            
        return result
    
    def __repr__(self):
        return f'<ForumCategory {self.name}>'


class ForumThread(db.Model):
    """Forum discussion threads."""
    __tablename__ = 'forum_threads'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), nullable=False, index=True)
    
    # Content and metadata
    content = db.Column(db.Text, nullable=False)  # First post content
    thread_type = db.Column(db.String(20), default='discussion')  # discussion, question, announcement, feature_request
    tags = db.Column(db.JSON, default=list)  # Array of tag strings
    
    # Ownership and moderation
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('forum_categories.id'), nullable=False)
    
    # Thread status
    is_locked = db.Column(db.Boolean, default=False)
    is_pinned = db.Column(db.Boolean, default=False)
    is_solved = db.Column(db.Boolean, default=False)  # For Q&A threads
    is_approved = db.Column(db.Boolean, default=True)
    is_deleted = db.Column(db.Boolean, default=False)
    
    # Statistics
    view_count = db.Column(db.Integer, default=0)
    post_count = db.Column(db.Integer, default=1)  # Include initial post
    participant_count = db.Column(db.Integer, default=1)
    vote_score = db.Column(db.Integer, default=0)  # Net upvotes - downvotes
    
    # Activity tracking
    last_activity_at = db.Column(db.DateTime, default=utc_now)
    last_post_id = db.Column(db.Integer, db.ForeignKey('forum_posts.id'), nullable=True)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    deleted_at = db.Column(db.DateTime)
    
    # Relationships
    author = db.relationship('User', backref='forum_threads')
    posts = db.relationship('ForumPost', backref='thread', lazy=True, cascade='all, delete-orphan', 
                           foreign_keys='ForumPost.thread_id', order_by='ForumPost.created_at')
    votes = db.relationship('ForumVote', backref='thread_voted', lazy=True, cascade='all, delete-orphan',
                           foreign_keys='ForumVote.thread_id')
    last_post = db.relationship('ForumPost', foreign_keys=[last_post_id], post_update=True)
    
    def __init__(self, title, content, author_id, category_id, thread_type='discussion', tags=None):
        self.title = title
        self.content = content
        self.author_id = author_id
        self.category_id = category_id
        self.thread_type = thread_type
        self.tags = tags or []
        # Generate slug from title
        import re
        self.slug = re.sub(r'[^\w\s-]', '', title.lower()).strip()
        self.slug = re.sub(r'[-\s]+', '-', self.slug)
    
    def update_activity(self, post_id=None):
        """Update last activity tracking."""
        self.last_activity_at = utc_now()
        if post_id:
            self.last_post_id = post_id
    
    def to_dict(self, include_content=False, include_author=False):
        """Convert thread to dictionary."""
        result = {
            'id': self.id,
            'title': self.title,
            'slug': self.slug,
            'thread_type': self.thread_type,
            'tags': self.tags,
            'author_id': self.author_id,
            'category_id': self.category_id,
            'is_locked': self.is_locked,
            'is_pinned': self.is_pinned,
            'is_solved': self.is_solved,
            'is_approved': self.is_approved,
            'is_deleted': self.is_deleted,
            'view_count': self.view_count,
            'post_count': self.post_count,
            'participant_count': self.participant_count,
            'vote_score': self.vote_score,
            'last_activity_at': self.last_activity_at.isoformat() if self.last_activity_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_content:
            result['content'] = self.content
            
        if include_author and self.author:
            result['author'] = {
                'id': self.author.id,
                'display_name': self.author.display_name,
                'profile_image_url': self.author.profile_image_url
            }
            
        return result
    
    def __repr__(self):
        return f'<ForumThread {self.title}>'


class ForumPost(db.Model):
    """Individual posts within forum threads."""
    __tablename__ = 'forum_posts'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    content_html = db.Column(db.Text)  # Rendered HTML content
    
    # Ownership and threading
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    thread_id = db.Column(db.Integer, db.ForeignKey('forum_threads.id'), nullable=False)
    parent_post_id = db.Column(db.Integer, db.ForeignKey('forum_posts.id'), nullable=True)
    
    # Post metadata
    post_number = db.Column(db.Integer, nullable=False)  # Position in thread (1, 2, 3...)
    is_solution = db.Column(db.Boolean, default=False)  # Marked as solution for Q&A
    is_approved = db.Column(db.Boolean, default=True)
    is_deleted = db.Column(db.Boolean, default=False)
    
    # Editing and moderation
    edit_count = db.Column(db.Integer, default=0)
    last_edited_at = db.Column(db.DateTime)
    last_edited_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    moderation_notes = db.Column(db.Text)
    
    # Voting and engagement
    vote_score = db.Column(db.Integer, default=0)  # Net upvotes - downvotes
    helpful_count = db.Column(db.Integer, default=0)  # Helpful votes
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    deleted_at = db.Column(db.DateTime)
    
    # Relationships
    author = db.relationship('User', foreign_keys=[author_id], backref='forum_posts')
    editor = db.relationship('User', foreign_keys=[last_edited_by])
    replies = db.relationship('ForumPost', backref=db.backref('parent_post', remote_side=[id]))
    votes = db.relationship('ForumVote', backref='post_voted', lazy=True, cascade='all, delete-orphan',
                           foreign_keys='ForumVote.post_id')
    
    def __init__(self, content, author_id, thread_id, parent_post_id=None):
        self.content = content
        self.author_id = author_id
        self.thread_id = thread_id
        self.parent_post_id = parent_post_id
        
        # Set post number
        from sqlalchemy import func
        last_post_number = db.session.query(func.max(ForumPost.post_number)).filter_by(thread_id=thread_id).scalar()
        self.post_number = (last_post_number or 0) + 1
    
    def mark_as_edited(self, editor_id):
        """Mark post as edited."""
        self.edit_count += 1
        self.last_edited_at = utc_now()
        self.last_edited_by = editor_id
    
    def to_dict(self, include_author=False, include_thread=False):
        """Convert post to dictionary."""
        result = {
            'id': self.id,
            'content': self.content,
            'content_html': self.content_html,
            'author_id': self.author_id,
            'thread_id': self.thread_id,
            'parent_post_id': self.parent_post_id,
            'post_number': self.post_number,
            'is_solution': self.is_solution,
            'is_approved': self.is_approved,
            'is_deleted': self.is_deleted,
            'edit_count': self.edit_count,
            'last_edited_at': self.last_edited_at.isoformat() if self.last_edited_at else None,
            'last_edited_by': self.last_edited_by,
            'vote_score': self.vote_score,
            'helpful_count': self.helpful_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_author and self.author:
            result['author'] = {
                'id': self.author.id,
                'display_name': self.author.display_name,
                'profile_image_url': self.author.profile_image_url
            }
            
        if include_thread and self.thread:
            result['thread'] = self.thread.to_dict()
            
        return result
    
    def __repr__(self):
        return f'<ForumPost {self.id} in thread {self.thread_id}>'


class ForumVote(db.Model):
    """Voting system for threads and posts."""
    __tablename__ = 'forum_votes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    vote_type = db.Column(db.String(10), nullable=False)  # upvote, downvote, helpful
    
    # Polymorphic voting - can vote on threads OR posts
    thread_id = db.Column(db.Integer, db.ForeignKey('forum_threads.id'), nullable=True)
    post_id = db.Column(db.Integer, db.ForeignKey('forum_posts.id'), nullable=True)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    voter = db.relationship('User', backref='forum_votes')
    
    # Constraints
    __table_args__ = (
        db.CheckConstraint('(thread_id IS NOT NULL) OR (post_id IS NOT NULL)', 
                          name='vote_target_check'),
        db.UniqueConstraint('user_id', 'thread_id', name='unique_thread_vote'),
        db.UniqueConstraint('user_id', 'post_id', name='unique_post_vote'),
        db.CheckConstraint("vote_type IN ('upvote', 'downvote', 'helpful')", 
                          name='valid_vote_type')
    )
    
    def __init__(self, user_id, vote_type, thread_id=None, post_id=None):
        if not (thread_id or post_id) or (thread_id and post_id):
            raise ValueError("Must specify either thread_id or post_id, but not both")
        
        self.user_id = user_id
        self.vote_type = vote_type
        self.thread_id = thread_id
        self.post_id = post_id
    
    def to_dict(self):
        """Convert vote to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'vote_type': self.vote_type,
            'thread_id': self.thread_id,
            'post_id': self.post_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        target = f"thread:{self.thread_id}" if self.thread_id else f"post:{self.post_id}"
        return f'<ForumVote {self.vote_type} on {target} by user:{self.user_id}>'


class UserReputation(db.Model):
    """User reputation tracking for forum participation."""
    __tablename__ = 'user_reputation'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    
    # Reputation scores
    total_score = db.Column(db.Integer, default=0)
    post_score = db.Column(db.Integer, default=0)  # From post upvotes
    thread_score = db.Column(db.Integer, default=0)  # From thread upvotes
    solution_score = db.Column(db.Integer, default=0)  # From accepted solutions
    helpful_score = db.Column(db.Integer, default=0)  # From helpful votes
    
    # Activity metrics
    posts_created = db.Column(db.Integer, default=0)
    threads_created = db.Column(db.Integer, default=0)
    solutions_provided = db.Column(db.Integer, default=0)
    votes_cast = db.Column(db.Integer, default=0)
    
    # Reputation level
    level = db.Column(db.Integer, default=1)
    level_name = db.Column(db.String(50), default='Newcomer')
    
    # Achievement tracking
    badges_earned = db.Column(db.JSON, default=list)  # Array of badge IDs
    milestones_achieved = db.Column(db.JSON, default=list)  # Array of milestone names
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('reputation', uselist=False))
    
    def __init__(self, user_id):
        self.user_id = user_id
    
    def calculate_level(self):
        """Calculate user level based on total score."""
        if self.total_score >= 10000:
            self.level = 10
            self.level_name = 'Expert'
        elif self.total_score >= 5000:
            self.level = 9
            self.level_name = 'Master'
        elif self.total_score >= 2500:
            self.level = 8
            self.level_name = 'Advanced'
        elif self.total_score >= 1000:
            self.level = 7
            self.level_name = 'Experienced'
        elif self.total_score >= 500:
            self.level = 6
            self.level_name = 'Skilled'
        elif self.total_score >= 250:
            self.level = 5
            self.level_name = 'Contributor'
        elif self.total_score >= 100:
            self.level = 4
            self.level_name = 'Regular'
        elif self.total_score >= 50:
            self.level = 3
            self.level_name = 'Member'
        elif self.total_score >= 10:
            self.level = 2
            self.level_name = 'Participant'
        else:
            self.level = 1
            self.level_name = 'Newcomer'
    
    def add_score(self, points, category='post'):
        """Add reputation points and update totals."""
        if category == 'post':
            self.post_score += points
        elif category == 'thread':
            self.thread_score += points
        elif category == 'solution':
            self.solution_score += points
        elif category == 'helpful':
            self.helpful_score += points
        
        self.total_score = (self.post_score + self.thread_score + 
                           self.solution_score + self.helpful_score)
        self.calculate_level()
    
    def to_dict(self):
        """Convert reputation to dictionary."""
        return {
            'user_id': self.user_id,
            'total_score': self.total_score,
            'post_score': self.post_score,
            'thread_score': self.thread_score,
            'solution_score': self.solution_score,
            'helpful_score': self.helpful_score,
            'posts_created': self.posts_created,
            'threads_created': self.threads_created,
            'solutions_provided': self.solutions_provided,
            'votes_cast': self.votes_cast,
            'level': self.level,
            'level_name': self.level_name,
            'badges_earned': self.badges_earned,
            'milestones_achieved': self.milestones_achieved,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<UserReputation user:{self.user_id} score:{self.total_score} level:{self.level}>'


class UserBadge(db.Model):
    """Badge system for community achievements."""
    __tablename__ = 'user_badges'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=False)
    icon = db.Column(db.String(100))  # Icon class or image URL
    color = db.Column(db.String(7), default='#3498db')  # Hex color
    
    # Badge type and requirements
    badge_type = db.Column(db.String(20), nullable=False)  # achievement, milestone, special
    requirements = db.Column(db.JSON, nullable=False)  # Requirements criteria
    rarity = db.Column(db.String(20), default='common')  # common, uncommon, rare, epic, legendary
    
    # Internationalization
    localized_names = db.Column(db.JSON, default=dict)  # {locale: name}
    localized_descriptions = db.Column(db.JSON, default=dict)  # {locale: description}
    
    # Tracking
    is_active = db.Column(db.Boolean, default=True)
    awarded_count = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    def __init__(self, name, description, badge_type, requirements, icon=None, color='#3498db', rarity='common'):
        self.name = name
        self.description = description
        self.badge_type = badge_type
        self.requirements = requirements
        self.icon = icon
        self.color = color
        self.rarity = rarity
    
    def to_dict(self, locale='en'):
        """Convert badge to dictionary with localization."""
        name = self.localized_names.get(locale, self.name)
        description = self.localized_descriptions.get(locale, self.description)
        
        return {
            'id': self.id,
            'name': name,
            'description': description,
            'icon': self.icon,
            'color': self.color,
            'badge_type': self.badge_type,
            'requirements': self.requirements,
            'rarity': self.rarity,
            'is_active': self.is_active,
            'awarded_count': self.awarded_count,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<UserBadge {self.name}>'


class ForumModeration(db.Model):
    """Moderation actions and history for forum content."""
    __tablename__ = 'forum_moderation'
    
    id = db.Column(db.Integer, primary_key=True)
    moderator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action_type = db.Column(db.String(20), nullable=False)  # lock, unlock, pin, unpin, delete, approve, warn
    reason = db.Column(db.String(255), nullable=False)
    notes = db.Column(db.Text)
    
    # Target content (polymorphic)
    thread_id = db.Column(db.Integer, db.ForeignKey('forum_threads.id'), nullable=True)
    post_id = db.Column(db.Integer, db.ForeignKey('forum_posts.id'), nullable=True)
    target_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # User being moderated
    
    # Action details
    is_automated = db.Column(db.Boolean, default=False)
    severity = db.Column(db.String(10), default='low')  # low, medium, high, critical
    
    created_at = db.Column(db.DateTime, default=utc_now)
    
    # Relationships
    moderator = db.relationship('User', foreign_keys=[moderator_id], backref='moderation_actions')
    target_user = db.relationship('User', foreign_keys=[target_user_id])
    thread = db.relationship('ForumThread', backref='moderation_history')
    post = db.relationship('ForumPost', backref='moderation_history')
    
    # Constraints
    __table_args__ = (
        db.CheckConstraint('(thread_id IS NOT NULL) OR (post_id IS NOT NULL) OR (target_user_id IS NOT NULL)', 
                          name='moderation_target_check'),
        db.CheckConstraint("action_type IN ('lock', 'unlock', 'pin', 'unpin', 'delete', 'approve', 'warn', 'ban', 'unban')", 
                          name='valid_action_type'),
        db.CheckConstraint("severity IN ('low', 'medium', 'high', 'critical')", 
                          name='valid_severity')
    )
    
    def __init__(self, moderator_id, action_type, reason, thread_id=None, post_id=None, target_user_id=None, notes=None):
        self.moderator_id = moderator_id
        self.action_type = action_type
        self.reason = reason
        self.thread_id = thread_id
        self.post_id = post_id
        self.target_user_id = target_user_id
        self.notes = notes
    
    def to_dict(self):
        """Convert moderation action to dictionary."""
        return {
            'id': self.id,
            'moderator_id': self.moderator_id,
            'action_type': self.action_type,
            'reason': self.reason,
            'notes': self.notes,
            'thread_id': self.thread_id,
            'post_id': self.post_id,
            'target_user_id': self.target_user_id,
            'is_automated': self.is_automated,
            'severity': self.severity,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        target = f"thread:{self.thread_id}" if self.thread_id else f"post:{self.post_id}" if self.post_id else f"user:{self.target_user_id}"
        return f'<ForumModeration {self.action_type} on {target}>'


# User-Generated Content System Models

class ContentSubmission(db.Model):
    """User-generated content submissions with quality gates and workflow."""
    __tablename__ = 'content_submissions'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    content_type = db.Column(db.String(50), nullable=False)  # song, arrangement, tutorial, etc.
    
    # Submission metadata
    submitter_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    original_song_id = db.Column(db.Integer, db.ForeignKey('songs.id'), nullable=True)  # If this is an arrangement/revision
    content_data = db.Column(db.JSON)  # Flexible content storage (ChordPro, metadata, etc.)
    
    # Workflow status
    status = db.Column(db.String(20), default='pending')  # pending, under_review, approved, rejected, featured
    submission_stage = db.Column(db.String(30), default='initial')  # initial, quality_check, community_review, editorial_review
    
    # Quality gates
    auto_quality_score = db.Column(db.Float, default=0.0)  # Automated quality assessment
    manual_quality_check = db.Column(db.Boolean, default=False)
    quality_issues = db.Column(db.JSON, default=list)  # List of quality issues found
    
    # Review aggregates
    review_count = db.Column(db.Integer, default=0)
    average_rating = db.Column(db.Float, default=0.0)
    community_score = db.Column(db.Integer, default=0)  # Net votes from community
    
    # Editorial curation
    is_featured = db.Column(db.Boolean, default=False)
    featured_at = db.Column(db.DateTime)
    featured_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    editorial_notes = db.Column(db.Text)
    
    # Analytics
    view_count = db.Column(db.Integer, default=0)
    download_count = db.Column(db.Integer, default=0)
    share_count = db.Column(db.Integer, default=0)
    
    # Timestamps
    submitted_at = db.Column(db.DateTime, default=utc_now)
    reviewed_at = db.Column(db.DateTime)
    published_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    submitter = db.relationship('User', foreign_keys=[submitter_id], backref='content_submissions')
    featured_by_user = db.relationship('User', foreign_keys=[featured_by])
    original_song = db.relationship('Song', foreign_keys=[original_song_id])
    reviews = db.relationship('ContentReview', backref='submission', cascade='all, delete-orphan')
    votes = db.relationship('ContentVote', backref='submission', cascade='all, delete-orphan')
    
    def __init__(self, title, submitter_id, content_type, description=None, original_song_id=None, content_data=None):
        self.title = title
        self.submitter_id = submitter_id
        self.content_type = content_type
        self.description = description
        self.original_song_id = original_song_id
        self.content_data = content_data or {}
    
    def calculate_quality_score(self):
        """Calculate automated quality score based on content analysis."""
        score = 0.0
        
        # Title completeness (0-20 points)
        if self.title and len(self.title.strip()) >= 5:
            score += 20
        
        # Description quality (0-20 points) 
        if self.description and len(self.description.strip()) >= 20:
            score += 20
        
        # Content completeness (0-40 points)
        if self.content_data:
            if self.content_type == 'song' and self.content_data.get('chordpro_content'):
                # Basic ChordPro validation
                content = self.content_data.get('chordpro_content', '')
                if len(content) >= 50:  # Minimum content length
                    score += 20
                if '[' in content and ']' in content:  # Has chords
                    score += 10
                if '{' in content and '}' in content:  # Has directives
                    score += 10
        
        # Metadata completeness (0-20 points)
        if self.content_data:
            metadata_fields = ['artist', 'genre', 'key', 'tempo', 'time_signature']
            filled_fields = sum(1 for field in metadata_fields if self.content_data.get(field))
            score += (filled_fields / len(metadata_fields)) * 20
        
        self.auto_quality_score = min(score, 100.0)
        return self.auto_quality_score
    
    def update_aggregates(self):
        """Update review and voting aggregates."""
        # Update review aggregates
        from sqlalchemy import func
        review_stats = db.session.query(
            func.count(ContentReview.id).label('count'),
            func.avg(ContentReview.rating).label('avg_rating')
        ).filter(ContentReview.submission_id == self.id).first()
        
        self.review_count = review_stats.count or 0
        self.average_rating = float(review_stats.avg_rating or 0.0)
        
        # Update voting aggregates
        vote_stats = db.session.query(
            func.sum(db.case((ContentVote.vote_type == 'upvote', 1), else_=0)).label('upvotes'),
            func.sum(db.case((ContentVote.vote_type == 'downvote', 1), else_=0)).label('downvotes')
        ).filter(ContentVote.submission_id == self.id).first()
        
        upvotes = vote_stats.upvotes or 0
        downvotes = vote_stats.downvotes or 0
        self.community_score = upvotes - downvotes
    
    def to_dict(self, include_content=True):
        """Convert submission to dictionary."""
        result = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'content_type': self.content_type,
            'submitter_id': self.submitter_id,
            'original_song_id': self.original_song_id,
            'status': self.status,
            'submission_stage': self.submission_stage,
            'auto_quality_score': self.auto_quality_score,
            'manual_quality_check': self.manual_quality_check,
            'quality_issues': self.quality_issues,
            'review_count': self.review_count,
            'average_rating': self.average_rating,
            'community_score': self.community_score,
            'is_featured': self.is_featured,
            'featured_at': self.featured_at.isoformat() if self.featured_at else None,
            'featured_by': self.featured_by,
            'editorial_notes': self.editorial_notes,
            'view_count': self.view_count,
            'download_count': self.download_count,
            'share_count': self.share_count,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'published_at': self.published_at.isoformat() if self.published_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_content:
            result['content_data'] = self.content_data
            
        return result
    
    def __repr__(self):
        return f'<ContentSubmission {self.title} ({self.content_type}) by user:{self.submitter_id}>'


class ContentReview(db.Model):
    """Community reviews for user-generated content submissions."""
    __tablename__ = 'content_reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey('content_submissions.id'), nullable=False)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Review details
    rating = db.Column(db.Integer, nullable=False)  # 1-5 star rating
    review_text = db.Column(db.Text)
    
    # Review categories
    quality_rating = db.Column(db.Integer)  # 1-5 rating for quality
    accuracy_rating = db.Column(db.Integer)  # 1-5 rating for accuracy
    usefulness_rating = db.Column(db.Integer)  # 1-5 rating for usefulness
    
    # Review metadata
    is_verified_reviewer = db.Column(db.Boolean, default=False)  # High-reputation reviewer
    helpful_votes = db.Column(db.Integer, default=0)  # How many found this review helpful
    
    # Status
    status = db.Column(db.String(20), default='active')  # active, hidden, flagged
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    reviewer = db.relationship('User', foreign_keys=[reviewer_id], backref='content_reviews')
    
    # Constraints
    __table_args__ = (
        db.UniqueConstraint('submission_id', 'reviewer_id', name='unique_submission_reviewer'),
        db.CheckConstraint('rating >= 1 AND rating <= 5', name='valid_rating'),
        db.CheckConstraint('quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5)', name='valid_quality_rating'),
        db.CheckConstraint('accuracy_rating IS NULL OR (accuracy_rating >= 1 AND accuracy_rating <= 5)', name='valid_accuracy_rating'),
        db.CheckConstraint('usefulness_rating IS NULL OR (usefulness_rating >= 1 AND usefulness_rating <= 5)', name='valid_usefulness_rating')
    )
    
    def __init__(self, submission_id, reviewer_id, rating, review_text=None, 
                 quality_rating=None, accuracy_rating=None, usefulness_rating=None):
        self.submission_id = submission_id
        self.reviewer_id = reviewer_id
        self.rating = rating
        self.review_text = review_text
        self.quality_rating = quality_rating
        self.accuracy_rating = accuracy_rating
        self.usefulness_rating = usefulness_rating
    
    def to_dict(self):
        """Convert review to dictionary."""
        return {
            'id': self.id,
            'submission_id': self.submission_id,
            'reviewer_id': self.reviewer_id,
            'rating': self.rating,
            'review_text': self.review_text,
            'quality_rating': self.quality_rating,
            'accuracy_rating': self.accuracy_rating,
            'usefulness_rating': self.usefulness_rating,
            'is_verified_reviewer': self.is_verified_reviewer,
            'helpful_votes': self.helpful_votes,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<ContentReview {self.rating}★ for submission:{self.submission_id} by user:{self.reviewer_id}>'


class ContentVote(db.Model):
    """Community voting system for content submissions."""
    __tablename__ = 'content_votes'
    
    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey('content_submissions.id'), nullable=False)
    voter_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    vote_type = db.Column(db.String(10), nullable=False)  # upvote, downvote
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    voter = db.relationship('User', foreign_keys=[voter_id], backref='content_votes')
    
    # Constraints
    __table_args__ = (
        db.UniqueConstraint('submission_id', 'voter_id', name='unique_submission_vote'),
        db.CheckConstraint("vote_type IN ('upvote', 'downvote')", name='valid_vote_type')
    )
    
    def __init__(self, submission_id, voter_id, vote_type):
        self.submission_id = submission_id
        self.voter_id = voter_id
        self.vote_type = vote_type
    
    def to_dict(self):
        """Convert vote to dictionary."""
        return {
            'id': self.id,
            'submission_id': self.submission_id,
            'voter_id': self.voter_id,
            'vote_type': self.vote_type,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<ContentVote {self.vote_type} for submission:{self.submission_id} by user:{self.voter_id}>'


class ContentLicense(db.Model):
    """Copyright and licensing management for user-generated content."""
    __tablename__ = 'content_licenses'
    
    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey('content_submissions.id'), nullable=False)
    
    # License information
    license_type = db.Column(db.String(50), nullable=False)  # CC, public_domain, original, copyrighted
    license_details = db.Column(db.String(100))  # e.g., "CC BY-SA 4.0", "Public Domain", "Original Work"
    copyright_holder = db.Column(db.String(255))  # Copyright holder name
    
    # Attribution requirements
    attribution_required = db.Column(db.Boolean, default=True)
    attribution_text = db.Column(db.Text)  # Required attribution text
    
    # Original work declaration
    is_original_work = db.Column(db.Boolean, default=False)
    original_work_declaration = db.Column(db.Text)  # Declaration of originality
    
    # Permission and usage
    commercial_use_allowed = db.Column(db.Boolean, default=False)
    derivative_works_allowed = db.Column(db.Boolean, default=True)
    share_alike_required = db.Column(db.Boolean, default=False)
    
    # Source information
    source_url = db.Column(db.String(500))  # URL to original source if applicable
    source_notes = db.Column(db.Text)  # Additional source information
    
    # Verification
    license_verified = db.Column(db.Boolean, default=False)
    verified_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    verification_notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    submission = db.relationship('ContentSubmission', backref=db.backref('license', uselist=False))
    verifier = db.relationship('User', foreign_keys=[verified_by])
    
    def __init__(self, submission_id, license_type, copyright_holder=None, is_original_work=False):
        self.submission_id = submission_id
        self.license_type = license_type
        self.copyright_holder = copyright_holder
        self.is_original_work = is_original_work
        
        # Set defaults based on license type
        if license_type.startswith('CC'):
            self.attribution_required = True
            self.derivative_works_allowed = True
            if 'SA' in license_type:
                self.share_alike_required = True
            if 'NC' not in license_type:
                self.commercial_use_allowed = True
        elif license_type == 'public_domain':
            self.attribution_required = False
            self.commercial_use_allowed = True
            self.derivative_works_allowed = True
        elif license_type == 'original':
            self.is_original_work = True
            self.attribution_required = True
    
    def to_dict(self):
        """Convert license to dictionary."""
        return {
            'id': self.id,
            'submission_id': self.submission_id,
            'license_type': self.license_type,
            'license_details': self.license_details,
            'copyright_holder': self.copyright_holder,
            'attribution_required': self.attribution_required,
            'attribution_text': self.attribution_text,
            'is_original_work': self.is_original_work,
            'original_work_declaration': self.original_work_declaration,
            'commercial_use_allowed': self.commercial_use_allowed,
            'derivative_works_allowed': self.derivative_works_allowed,
            'share_alike_required': self.share_alike_required,
            'source_url': self.source_url,
            'source_notes': self.source_notes,
            'license_verified': self.license_verified,
            'verified_by': self.verified_by,
            'verification_notes': self.verification_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<ContentLicense {self.license_type} for submission:{self.submission_id}>'


class ContentAnalytics(db.Model):
    """Analytics and performance tracking for user-generated content."""
    __tablename__ = 'content_analytics'
    
    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey('content_submissions.id'), nullable=False)
    
    # Time-based metrics
    date = db.Column(db.Date, nullable=False)  # Analytics date
    views = db.Column(db.Integer, default=0)
    downloads = db.Column(db.Integer, default=0)
    shares = db.Column(db.Integer, default=0)
    favorites = db.Column(db.Integer, default=0)
    
    # Engagement metrics
    time_spent_avg = db.Column(db.Float, default=0.0)  # Average time spent viewing (seconds)
    bounce_rate = db.Column(db.Float, default=0.0)  # Percentage who left immediately
    
    # Source tracking
    traffic_sources = db.Column(db.JSON, default=dict)  # {source: count}
    referrers = db.Column(db.JSON, default=dict)  # {referrer: count}
    
    # Geographic data
    countries = db.Column(db.JSON, default=dict)  # {country_code: count}
    
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    submission = db.relationship('ContentSubmission', backref='analytics')
    
    # Constraints
    __table_args__ = (
        db.UniqueConstraint('submission_id', 'date', name='unique_submission_date'),
    )
    
    def __init__(self, submission_id, date=None):
        self.submission_id = submission_id
        self.date = date or datetime.utcnow().date()
    
    def add_view(self, source='direct', referrer=None, country=None, time_spent=0.0):
        """Record a view with optional metadata."""
        self.views += 1
        
        if time_spent > 0:
            # Update average time spent (simple moving average)
            current_avg = self.time_spent_avg or 0.0
            self.time_spent_avg = ((current_avg * (self.views - 1)) + time_spent) / self.views
        
        # Update traffic sources
        if not self.traffic_sources:
            self.traffic_sources = {}
        self.traffic_sources[source] = self.traffic_sources.get(source, 0) + 1
        
        # Update referrers
        if referrer:
            if not self.referrers:
                self.referrers = {}
            self.referrers[referrer] = self.referrers.get(referrer, 0) + 1
        
        # Update countries
        if country:
            if not self.countries:
                self.countries = {}
            self.countries[country] = self.countries.get(country, 0) + 1
        
        # Mark JSON fields as modified for SQLAlchemy
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(self, 'traffic_sources')
        flag_modified(self, 'referrers')
        flag_modified(self, 'countries')
    
    def to_dict(self):
        """Convert analytics to dictionary."""
        return {
            'id': self.id,
            'submission_id': self.submission_id,
            'date': self.date.isoformat() if self.date else None,
            'views': self.views,
            'downloads': self.downloads,
            'shares': self.shares,
            'favorites': self.favorites,
            'time_spent_avg': self.time_spent_avg,
            'bounce_rate': self.bounce_rate,
            'traffic_sources': self.traffic_sources,
            'referrers': self.referrers,
            'countries': self.countries,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<ContentAnalytics submission:{self.submission_id} date:{self.date}>'