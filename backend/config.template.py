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

# Enterprise Authentication Configuration
ENTERPRISE_SESSION_TIMEOUT = int(os.environ.get('ENTERPRISE_SESSION_TIMEOUT', 28800))  # 8 hours
ENTERPRISE_DEVICE_VALIDATION = os.environ.get('ENTERPRISE_DEVICE_VALIDATION', 'False').lower() == 'true'
ENTERPRISE_IP_VALIDATION = os.environ.get('ENTERPRISE_IP_VALIDATION', 'False').lower() == 'true'

# Enterprise Password Policy
ENTERPRISE_PASSWORD_MIN_LENGTH = int(os.environ.get('ENTERPRISE_PASSWORD_MIN_LENGTH', 12))
ENTERPRISE_PASSWORD_REQUIRE_UPPERCASE = os.environ.get('ENTERPRISE_PASSWORD_REQUIRE_UPPERCASE', 'True').lower() == 'true'
ENTERPRISE_PASSWORD_REQUIRE_LOWERCASE = os.environ.get('ENTERPRISE_PASSWORD_REQUIRE_LOWERCASE', 'True').lower() == 'true'
ENTERPRISE_PASSWORD_REQUIRE_NUMBERS = os.environ.get('ENTERPRISE_PASSWORD_REQUIRE_NUMBERS', 'True').lower() == 'true'
ENTERPRISE_PASSWORD_REQUIRE_SPECIAL = os.environ.get('ENTERPRISE_PASSWORD_REQUIRE_SPECIAL', 'True').lower() == 'true'

# Domain whitelist for user registration
ENTERPRISE_DOMAIN_WHITELIST = os.environ.get('ENTERPRISE_DOMAIN_WHITELIST', '').split(',') if os.environ.get('ENTERPRISE_DOMAIN_WHITELIST') else []

# SAML Configuration
SAML_ENABLED = os.environ.get('SAML_ENABLED', 'False').lower() == 'true'
SAML_ENTITY_ID = os.environ.get('SAML_ENTITY_ID', 'chordme-saml-sp')
SAML_ACS_URL = os.environ.get('SAML_ACS_URL', '/api/v1/auth/saml/acs')
SAML_SLS_URL = os.environ.get('SAML_SLS_URL', '/api/v1/auth/saml/sls')
SAML_X509_CERT = os.environ.get('SAML_X509_CERT', '')
SAML_PRIVATE_KEY = os.environ.get('SAML_PRIVATE_KEY', '')
SAML_AUTO_PROVISION_USERS = os.environ.get('SAML_AUTO_PROVISION_USERS', 'True').lower() == 'true'

# SAML Identity Providers - can be configured via environment or database
SAML_IDENTITY_PROVIDERS = {
    'default': {
        'name': os.environ.get('SAML_IDP_NAME', 'Default IdP'),
        'sso_url': os.environ.get('SAML_IDP_SSO_URL', ''),
        'metadata_url': os.environ.get('SAML_IDP_METADATA_URL', ''),
        'x509_cert': os.environ.get('SAML_IDP_X509_CERT', ''),
        'entity_id': os.environ.get('SAML_IDP_ENTITY_ID', '')
    }
}

# LDAP Configuration
LDAP_SERVER_URI = os.environ.get('LDAP_SERVER_URI', 'ldap://localhost:389')
LDAP_BIND_DN = os.environ.get('LDAP_BIND_DN', '')
LDAP_BIND_PASSWORD = os.environ.get('LDAP_BIND_PASSWORD', '')
LDAP_USER_SEARCH_BASE = os.environ.get('LDAP_USER_SEARCH_BASE', 'ou=users,dc=example,dc=com')
LDAP_USER_SEARCH_FILTER = os.environ.get('LDAP_USER_SEARCH_FILTER', '(uid={username})')
LDAP_GROUP_SEARCH_BASE = os.environ.get('LDAP_GROUP_SEARCH_BASE', 'ou=groups,dc=example,dc=com')
LDAP_GROUP_SEARCH_FILTER = os.environ.get('LDAP_GROUP_SEARCH_FILTER', '(member={user_dn})')
LDAP_USE_TLS = os.environ.get('LDAP_USE_TLS', 'True').lower() == 'true'
LDAP_VALIDATE_CERT = os.environ.get('LDAP_VALIDATE_CERT', 'True').lower() == 'true'
LDAP_CA_CERT_FILE = os.environ.get('LDAP_CA_CERT_FILE', None)
LDAP_PROVIDER_TYPE = os.environ.get('LDAP_PROVIDER_TYPE', 'ldap')  # 'ldap' or 'ad'

# LDAP Attribute Mappings
LDAP_ATTR_EMAIL = os.environ.get('LDAP_ATTR_EMAIL', 'mail')
LDAP_ATTR_FIRST_NAME = os.environ.get('LDAP_ATTR_FIRST_NAME', 'givenName')
LDAP_ATTR_LAST_NAME = os.environ.get('LDAP_ATTR_LAST_NAME', 'sn')
LDAP_ATTR_DISPLAY_NAME = os.environ.get('LDAP_ATTR_DISPLAY_NAME', 'displayName')
LDAP_ATTR_PHONE = os.environ.get('LDAP_ATTR_PHONE', 'telephoneNumber')
LDAP_ATTR_DEPARTMENT = os.environ.get('LDAP_ATTR_DEPARTMENT', 'department')
LDAP_ATTR_TITLE = os.environ.get('LDAP_ATTR_TITLE', 'title')

# Active Directory specific
AD_DOMAIN_SUFFIX = os.environ.get('AD_DOMAIN_SUFFIX', '')

# Multi-Factor Authentication
MFA_ENABLED = os.environ.get('MFA_ENABLED', 'False').lower() == 'true'
MFA_ISSUER_NAME = os.environ.get('MFA_ISSUER_NAME', 'ChordMe')
MFA_BACKUP_CODES_COUNT = int(os.environ.get('MFA_BACKUP_CODES_COUNT', 10))
MFA_REQUIRED_FOR_ALL = os.environ.get('MFA_REQUIRED_FOR_ALL', 'False').lower() == 'true'
MFA_REQUIRED_FOR_SSO = os.environ.get('MFA_REQUIRED_FOR_SSO', 'False').lower() == 'true'
MFA_REQUIRED_DOMAINS = os.environ.get('MFA_REQUIRED_DOMAINS', '').split(',') if os.environ.get('MFA_REQUIRED_DOMAINS') else []

# Redis Configuration (for session storage)
REDIS_URL = os.environ.get('REDIS_URL', None)

# Base URL for redirects and metadata
BASE_URL = os.environ.get('BASE_URL', 'http://localhost:5000')

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
