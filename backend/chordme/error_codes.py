"""
Centralized error codes and messages for ChordMe API.
"""

# Error categories
ERROR_CATEGORIES = {
    'VALIDATION': 'validation',
    'AUTHENTICATION': 'authentication', 
    'AUTHORIZATION': 'authorization',
    'NOT_FOUND': 'not_found',
    'CONFLICT': 'conflict',
    'RATE_LIMIT': 'rate_limit',
    'SERVER_ERROR': 'server_error',
    'NETWORK': 'network'
}

# Specific error codes with user-friendly messages
ERROR_CODES = {
    # Validation errors (4xx)
    'INVALID_EMAIL': {
        'code': 'INVALID_EMAIL',
        'category': ERROR_CATEGORIES['VALIDATION'],
        'message': 'Please enter a valid email address',
        'http_status': 400,
        'retryable': False
    },
    'INVALID_PASSWORD': {
        'code': 'INVALID_PASSWORD', 
        'category': ERROR_CATEGORIES['VALIDATION'],
        'message': 'Password must be at least 8 characters with uppercase, lowercase, and numbers',
        'http_status': 400,
        'retryable': False
    },
    'MISSING_REQUIRED_FIELD': {
        'code': 'MISSING_REQUIRED_FIELD',
        'category': ERROR_CATEGORIES['VALIDATION'],
        'message': 'Missing required field',
        'http_status': 400,
        'retryable': False
    },
    'INVALID_INPUT_FORMAT': {
        'code': 'INVALID_INPUT_FORMAT',
        'category': ERROR_CATEGORIES['VALIDATION'],
        'message': 'Invalid input format',
        'http_status': 400,
        'retryable': False
    },
    'ANALYSIS_FAILED': {
        'code': 'ANALYSIS_FAILED',
        'category': ERROR_CATEGORIES['VALIDATION'],
        'message': 'Analysis failed due to invalid or insufficient content',
        'http_status': 422,
        'retryable': False
    },
    
    # Authentication errors (401)
    'INVALID_CREDENTIALS': {
        'code': 'INVALID_CREDENTIALS',
        'category': ERROR_CATEGORIES['AUTHENTICATION'],
        'message': 'Invalid email or password',
        'http_status': 401,
        'retryable': False
    },
    'TOKEN_EXPIRED': {
        'code': 'TOKEN_EXPIRED',
        'category': ERROR_CATEGORIES['AUTHENTICATION'],
        'message': 'Your session has expired. Please log in again',
        'http_status': 401,
        'retryable': False
    },
    'TOKEN_INVALID': {
        'code': 'TOKEN_INVALID',
        'category': ERROR_CATEGORIES['AUTHENTICATION'],
        'message': 'Invalid authentication token',
        'http_status': 401,
        'retryable': False
    },
    'TOKEN_MISSING': {
        'code': 'TOKEN_MISSING',
        'category': ERROR_CATEGORIES['AUTHENTICATION'],
        'message': 'Authentication required',
        'http_status': 401,
        'retryable': False
    },
    
    # Authorization errors (403)
    'ACCESS_DENIED': {
        'code': 'ACCESS_DENIED',
        'category': ERROR_CATEGORIES['AUTHORIZATION'],
        'message': 'You do not have permission to access this resource',
        'http_status': 403,
        'retryable': False
    },
    'INSUFFICIENT_PERMISSIONS': {
        'code': 'INSUFFICIENT_PERMISSIONS',
        'category': ERROR_CATEGORIES['AUTHORIZATION'],
        'message': 'Insufficient permissions for this action',
        'http_status': 403,
        'retryable': False
    },
    
    # Not found errors (404)
    'RESOURCE_NOT_FOUND': {
        'code': 'RESOURCE_NOT_FOUND',
        'category': ERROR_CATEGORIES['NOT_FOUND'],
        'message': 'The requested resource was not found',
        'http_status': 404,
        'retryable': False
    },
    'USER_NOT_FOUND': {
        'code': 'USER_NOT_FOUND',
        'category': ERROR_CATEGORIES['NOT_FOUND'],
        'message': 'User not found',
        'http_status': 404,
        'retryable': False
    },
    'SONG_NOT_FOUND': {
        'code': 'SONG_NOT_FOUND',
        'category': ERROR_CATEGORIES['NOT_FOUND'],
        'message': 'Song not found',
        'http_status': 404,
        'retryable': False
    },
    
    # Conflict errors (409)
    'EMAIL_ALREADY_EXISTS': {
        'code': 'EMAIL_ALREADY_EXISTS',
        'category': ERROR_CATEGORIES['CONFLICT'],
        'message': 'An account with this email already exists',
        'http_status': 409,
        'retryable': False
    },
    'RESOURCE_CONFLICT': {
        'code': 'RESOURCE_CONFLICT',
        'category': ERROR_CATEGORIES['CONFLICT'],
        'message': 'Resource conflict detected',
        'http_status': 409,
        'retryable': False
    },
    
    # Rate limiting (429)
    'RATE_LIMIT_EXCEEDED': {
        'code': 'RATE_LIMIT_EXCEEDED',
        'category': ERROR_CATEGORIES['RATE_LIMIT'],
        'message': 'Too many requests. Please try again later',
        'http_status': 429,
        'retryable': True
    },
    
    # Server errors (5xx)
    'INTERNAL_SERVER_ERROR': {
        'code': 'INTERNAL_SERVER_ERROR',
        'category': ERROR_CATEGORIES['SERVER_ERROR'],
        'message': 'An unexpected error occurred. Please try again',
        'http_status': 500,
        'retryable': True
    },
    'DATABASE_ERROR': {
        'code': 'DATABASE_ERROR',
        'category': ERROR_CATEGORIES['SERVER_ERROR'],
        'message': 'Database temporarily unavailable. Please try again',
        'http_status': 503,
        'retryable': True
    },
    'SERVICE_UNAVAILABLE': {
        'code': 'SERVICE_UNAVAILABLE',
        'category': ERROR_CATEGORIES['SERVER_ERROR'],
        'message': 'Service temporarily unavailable. Please try again',
        'http_status': 503,
        'retryable': True
    },
    
    # YouTube API errors
    'YOUTUBE_API_ERROR': {
        'code': 'YOUTUBE_API_ERROR',
        'category': ERROR_CATEGORIES['VALIDATION'],
        'message': 'YouTube API error. Please check your request and try again',
        'http_status': 400,
        'retryable': False
    },
    'YOUTUBE_API_UNAVAILABLE': {
        'code': 'YOUTUBE_API_UNAVAILABLE',
        'category': ERROR_CATEGORIES['SERVER_ERROR'],
        'message': 'YouTube service temporarily unavailable. Please try again',
        'http_status': 503,
        'retryable': True
    },
    'YOUTUBE_QUOTA_EXCEEDED': {
        'code': 'YOUTUBE_QUOTA_EXCEEDED',
        'category': ERROR_CATEGORIES['RATE_LIMIT'],
        'message': 'YouTube API quota exceeded. Please try again later',
        'http_status': 429,
        'retryable': True
    },
    
    # Validation errors continued
    'INVALID_INPUT': {
        'code': 'INVALID_INPUT',
        'category': ERROR_CATEGORIES['VALIDATION'],
        'message': 'Invalid input provided',
        'http_status': 400,
        'retryable': False
    },
    
    # Network errors (client-side)
    'NETWORK_ERROR': {
        'code': 'NETWORK_ERROR',
        'category': ERROR_CATEGORIES['NETWORK'],
        'message': 'Network error. Please check your connection and try again',
        'http_status': 0,  # Client-side error
        'retryable': True
    },
    'TIMEOUT_ERROR': {
        'code': 'TIMEOUT_ERROR',
        'category': ERROR_CATEGORIES['NETWORK'],
        'message': 'Request timed out. Please try again',
        'http_status': 0,  # Client-side error
        'retryable': True
    }
}

class ErrorCode:
    """Error code constants for easier imports"""
    # Validation errors
    INVALID_EMAIL = 'INVALID_EMAIL'
    INVALID_PASSWORD = 'INVALID_PASSWORD'
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD'
    INVALID_INPUT_FORMAT = 'INVALID_INPUT_FORMAT'
    INVALID_INPUT = 'INVALID_INPUT'
    
    # Authentication errors
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS'
    TOKEN_EXPIRED = 'TOKEN_EXPIRED'
    TOKEN_INVALID = 'TOKEN_INVALID'
    TOKEN_MISSING = 'TOKEN_MISSING'
    
    # Authorization errors
    ACCESS_DENIED = 'ACCESS_DENIED'
    INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS'
    
    # Not found errors
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND'
    USER_NOT_FOUND = 'USER_NOT_FOUND'
    SONG_NOT_FOUND = 'SONG_NOT_FOUND'
    
    # Conflict errors
    EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS'
    RESOURCE_CONFLICT = 'RESOURCE_CONFLICT'
    
    # Rate limiting
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
    
    # Server errors
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
    DATABASE_ERROR = 'DATABASE_ERROR'
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
    
    # YouTube errors
    YOUTUBE_API_ERROR = 'YOUTUBE_API_ERROR'
    YOUTUBE_API_UNAVAILABLE = 'YOUTUBE_API_UNAVAILABLE'
    YOUTUBE_QUOTA_EXCEEDED = 'YOUTUBE_QUOTA_EXCEEDED'
    
    # Network errors
    NETWORK_ERROR = 'NETWORK_ERROR'
    TIMEOUT_ERROR = 'TIMEOUT_ERROR'

def get_error_details(error_code: str) -> dict:
    """Get error details for a given error code."""
    return ERROR_CODES.get(error_code, ERROR_CODES['INTERNAL_SERVER_ERROR'])

def is_retryable_error(error_code: str) -> bool:
    """Check if an error is retryable."""
    error_details = get_error_details(error_code)
    return error_details.get('retryable', False)

def get_error_category(error_code: str) -> str:
    """Get error category for a given error code."""
    error_details = get_error_details(error_code)
    return error_details.get('category', ERROR_CATEGORIES['SERVER_ERROR'])