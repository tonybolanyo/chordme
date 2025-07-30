"""Test configuration for ChordMe application."""

SECRET_KEY = 'test-secret-key'
SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
SQLALCHEMY_TRACK_MODIFICATIONS = False
JWT_SECRET_KEY = 'test-jwt-secret-key'
JWT_EXPIRATION_DELTA = 3600
TESTING = True
WTF_CSRF_ENABLED = False
