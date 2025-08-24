SECRET_KEY='your-super-secret-key'

# Password hashing configuration
BCRYPT_ROUNDS = 12  # Default bcrypt rounds for password hashing

# HTTPS enforcement configuration
# Set to True to force HTTPS redirects, False to disable, None for auto-detect
# Auto-detect: enabled in production (DEBUG=False), disabled in development (DEBUG=True)
HTTPS_ENFORCED = None

# JWT configuration
JWT_SECRET_KEY = 'your-jwt-secret-key'
JWT_EXPIRATION_DELTA = 86400  # 24 hours in seconds

# Database configuration
SQLALCHEMY_DATABASE_URI = 'sqlite:///chordme.db'
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Google Drive API configuration (for server-side operations)
# These are optional - server can work without Google Drive integration
GOOGLE_DRIVE_ENABLED = False  # Set to True to enable server-side Google Drive features
GOOGLE_CLIENT_ID = ''  # Google OAuth2 client ID (same as frontend)
GOOGLE_CLIENT_SECRET = ''  # Google OAuth2 client secret (server-side only)
GOOGLE_REDIRECT_URI = ''  # OAuth2 redirect URI