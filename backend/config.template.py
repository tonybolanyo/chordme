import os

SECRET_KEY = os.environ.get('SECRET_KEY', 'your-super-secret-key')

# Password hashing configuration
BCRYPT_ROUNDS = 12  # Default bcrypt rounds for password hashing

# HTTPS enforcement configuration
# Set to True to force HTTPS redirects, False to disable, None for auto-detect
# Auto-detect: enabled in production (DEBUG=False), disabled in development (DEBUG=True)
HTTPS_ENFORCED = None

# JWT configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-jwt-secret-key')
JWT_EXPIRATION_DELTA = int(os.environ.get('JWT_EXPIRATION_DELTA', 86400))  # 24 hours in seconds

# Database configuration
import os

# Use environment variable for database URI, fallback to SQLite for development
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    # Handle Supabase/PostgreSQL URL format
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
else:
    # Development fallback
    SQLALCHEMY_DATABASE_URI = 'sqlite:///chordme.db'

SQLALCHEMY_TRACK_MODIFICATIONS = False

# Google Drive API configuration (for server-side operations)
# These are optional - server can work without Google Drive integration
GOOGLE_DRIVE_ENABLED = os.environ.get('GOOGLE_DRIVE_ENABLED', 'False').lower() == 'true'
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')  # Google OAuth2 client ID (same as frontend)
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')  # Google OAuth2 client secret (server-side only)
GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI', '')  # OAuth2 redirect URI

# Supabase configuration (optional, for future integration)
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')