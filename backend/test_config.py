"""Test configuration for ChordMe application."""

SECRET_KEY = 'test-secret-key'
SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'  # In-memory database for testing
SQLALCHEMY_TRACK_MODIFICATIONS = False
JWT_SECRET_KEY = 'test-jwt-secret-key'
JWT_EXPIRATION_DELTA = 3600  # 1 hour in seconds
TESTING = True
WTF_CSRF_ENABLED = False

# Password hashing configuration
BCRYPT_ROUNDS = 4  # Lower rounds for faster testing