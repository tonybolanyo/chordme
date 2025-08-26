---
layout: default
lang: en
title: Error Handling Guide
---

# Error Handling Guide

This guide covers the comprehensive error handling system in ChordMe, including error response formats, client-side error handling, retry mechanisms, and troubleshooting.

## Error Response Format

ChordMe uses a standardized error response format that provides structured information about errors, including error codes, categories, and retry guidance.

### Standard Error Response

All API errors follow this structure:

```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message",
    "category": "error_category",
    "retryable": true|false,
    "details": { /* Additional details in debug mode */ }
  }
}
```

### Legacy Error Response

For backward compatibility, some errors may still use the legacy format:

```json
{
  "status": "error",
  "error": "Error message string"
}
```

## Error Categories

Errors are categorized to help with handling and user experience:

### Validation Errors (`validation`)
- **Retryable**: `false`
- **Common Codes**: `INVALID_EMAIL`, `INVALID_PASSWORD`, `MISSING_REQUIRED_FIELD`
- **HTTP Status**: 400

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_EMAIL",
    "message": "Please enter a valid email address",
    "category": "validation",
    "retryable": false
  }
}
```

### Authentication Errors (`authentication`)
- **Retryable**: `false`
- **Common Codes**: `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `TOKEN_INVALID`
- **HTTP Status**: 401

```json
{
  "status": "error",
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Your session has expired. Please log in again",
    "category": "authentication",
    "retryable": false
  }
}
```

### Authorization Errors (`authorization`)
- **Retryable**: `false`
- **Common Codes**: `ACCESS_DENIED`, `INSUFFICIENT_PERMISSIONS`
- **HTTP Status**: 403

```json
{
  "status": "error",
  "error": {
    "code": "ACCESS_DENIED",
    "message": "You do not have permission to access this resource",
    "category": "authorization",
    "retryable": false
  }
}
```

### Not Found Errors (`not_found`)
- **Retryable**: `false`
- **Common Codes**: `RESOURCE_NOT_FOUND`, `USER_NOT_FOUND`, `SONG_NOT_FOUND`
- **HTTP Status**: 404

### Conflict Errors (`conflict`)
- **Retryable**: `false`
- **Common Codes**: `EMAIL_ALREADY_EXISTS`, `RESOURCE_CONFLICT`
- **HTTP Status**: 409

### Rate Limiting (`rate_limit`)
- **Retryable**: `true`
- **Common Codes**: `RATE_LIMIT_EXCEEDED`
- **HTTP Status**: 429

```json
{
  "status": "error",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later",
    "category": "rate_limit",
    "retryable": true
  }
}
```

### Server Errors (`server_error`)
- **Retryable**: `true`
- **Common Codes**: `INTERNAL_SERVER_ERROR`, `DATABASE_ERROR`, `SERVICE_UNAVAILABLE`
- **HTTP Status**: 500, 503

```json
{
  "status": "error",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred. Please try again",
    "category": "server_error",
    "retryable": true
  }
}
```

### Network Errors (`network`)
- **Retryable**: `true`
- **Common Codes**: `NETWORK_ERROR`, `TIMEOUT_ERROR`
- **HTTP Status**: N/A (client-side)

## Frontend Error Handling

ChordMe provides comprehensive client-side error handling with global error boundaries, notification systems, and retry mechanisms.

### Error Context

The error context provides global error state management:

```typescript
import { useError } from '../contexts/ErrorContext';

function MyComponent() {
  const { addError, addNotification, isRetryableError } = useError();
  
  // Add an error
  addError({
    message: 'Something went wrong',
    code: 'NETWORK_ERROR',
    category: 'network',
    retryable: true
  });
  
  // Add a notification
  addNotification({
    message: 'Operation completed successfully',
    type: 'info'
  });
}
```

### Error Boundary

Wrap your application with the error boundary to catch React errors:

```typescript
import ErrorBoundary from '../components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

### Notification System

Display error notifications to users:

```typescript
import NotificationSystem from '../components/NotificationSystem';

function App() {
  return (
    <ErrorProvider>
      <YourApp />
      <NotificationSystem />
    </ErrorProvider>
  );
}
```

### Retry Mechanisms

ChordMe includes automatic retry for retryable errors:

```typescript
import { fetchWithRetry, createRetryFunction } from '../utils/apiUtils';

// Fetch with automatic retry
const response = await fetchWithRetry('/api/v1/songs', {
  method: 'GET',
  headers: { Authorization: `Bearer ${token}` }
});

// Create retry function for custom operations
const retryableOperation = createRetryFunction(async () => {
  return await someApiCall();
}, {
  maxAttempts: 3,
  delay: 1000,
  backoffMultiplier: 2
});
```

## Troubleshooting

### Common Error Scenarios

#### "Your session has expired. Please log in again"
- **Cause**: JWT token has expired
- **Solution**: 
  1. Click the login link
  2. Re-enter your credentials
  3. Your session will be renewed

#### "Network error. Please check your connection and try again"
- **Cause**: Internet connection issues or server unavailable
- **Solution**:
  1. Check your internet connection
  2. Wait a moment and try again
  3. If problem persists, the service may be temporarily down

#### "Too many requests. Please try again later"
- **Cause**: Rate limiting to prevent abuse
- **Solution**:
  1. Wait a few minutes before trying again
  2. Reduce the frequency of your requests

#### "Invalid email or password"
- **Cause**: Incorrect login credentials
- **Solution**:
  1. Double-check your email address
  2. Verify your password (check caps lock)
  3. Use the "Forgot Password" option if needed

#### "An account with this email already exists"
- **Cause**: Attempting to register with an existing email
- **Solution**:
  1. Use the login form instead of registration
  2. Use the "Forgot Password" option if you don't remember your password
  3. Use a different email address for a new account

### Error Recovery Steps

1. **For Validation Errors**:
   - Review the error message
   - Correct the invalid input
   - Resubmit the form

2. **For Authentication Errors**:
   - Log out and log back in
   - Clear browser cache if issues persist
   - Check if your account is still active

3. **For Network Errors**:
   - Check internet connection
   - Wait and retry automatically (app will retry for you)
   - Refresh the page if problems persist

4. **For Server Errors**:
   - Wait a moment and try again (app will retry automatically)
   - If problems persist, try again later
   - Contact support if the issue continues

### Developer Debugging

#### Checking Error Details

In development mode, additional error details are available:

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "category": "validation",
    "retryable": false,
    "details": {
      "field": "email",
      "value": "invalid-email",
      "validation_rule": "email_format"
    }
  }
}
```

#### Error Logging

Server-side errors are logged with appropriate detail levels:

```python
# In production - minimal logging
app.logger.error("Authentication failed for user from IP 192.168.1.1")

# In development - detailed logging
app.logger.error("JWT verification failed: Invalid signature")
```

#### Testing Error Scenarios

Use the test utilities to simulate errors:

```typescript
// Frontend testing
import { createApiError, createNetworkError } from '../contexts/ErrorContext';

// Backend testing
from chordme.utils import create_error_response
response = create_error_response("Test error", error_code="TEST_ERROR")
```

## Best Practices

### For Users

1. **Read Error Messages**: Error messages are designed to be helpful - read them carefully
2. **Try Simple Solutions First**: Check your internet connection, refresh the page
3. **Don't Repeatedly Retry**: The app will automatically retry when appropriate
4. **Contact Support**: If errors persist, contact support with the error details

### For Developers

1. **Use Structured Errors**: Always use error codes and categories for new errors
2. **Provide User-Friendly Messages**: Error messages should be actionable for users
3. **Log Appropriately**: Log enough detail for debugging without exposing sensitive data
4. **Test Error Scenarios**: Include error cases in your tests
5. **Handle Retries Gracefully**: Implement exponential backoff for retryable operations

## Error Code Reference

### Complete Error Code List

| Code | Category | HTTP | Retryable | Description |
|------|----------|------|-----------|-------------|
| `INVALID_EMAIL` | validation | 400 | No | Invalid email format |
| `INVALID_PASSWORD` | validation | 400 | No | Password doesn't meet requirements |
| `MISSING_REQUIRED_FIELD` | validation | 400 | No | Required field not provided |
| `INVALID_CREDENTIALS` | authentication | 401 | No | Invalid login credentials |
| `TOKEN_EXPIRED` | authentication | 401 | No | JWT token has expired |
| `TOKEN_INVALID` | authentication | 401 | No | JWT token is invalid |
| `ACCESS_DENIED` | authorization | 403 | No | Access to resource denied |
| `INSUFFICIENT_PERMISSIONS` | authorization | 403 | No | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | not_found | 404 | No | Requested resource not found |
| `USER_NOT_FOUND` | not_found | 404 | No | User account not found |
| `SONG_NOT_FOUND` | not_found | 404 | No | Song not found |
| `EMAIL_ALREADY_EXISTS` | conflict | 409 | No | Email already registered |
| `RESOURCE_CONFLICT` | conflict | 409 | No | Resource conflict detected |
| `RATE_LIMIT_EXCEEDED` | rate_limit | 429 | Yes | Too many requests |
| `INTERNAL_SERVER_ERROR` | server_error | 500 | Yes | Unexpected server error |
| `DATABASE_ERROR` | server_error | 503 | Yes | Database temporarily unavailable |
| `SERVICE_UNAVAILABLE` | server_error | 503 | Yes | Service temporarily unavailable |
| `NETWORK_ERROR` | network | 0 | Yes | Network connectivity issue |
| `TIMEOUT_ERROR` | network | 0 | Yes | Request timed out |

This comprehensive error handling system ensures a better user experience and easier debugging for developers.