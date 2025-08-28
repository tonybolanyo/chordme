---
layout: default
lang: en
title: HTTPS Enforcement Documentation
---

# HTTPS Enforcement Documentation

This document describes the HTTPS enforcement functionality implemented in the ChordMe backend application.

## Overview

The HTTPS enforcement system automatically redirects HTTP requests to HTTPS and adds security headers to ensure all API traffic is encrypted. This is crucial for protecting user data, authentication tokens, and API communications.

## Features

### 1. Automatic HTTPS Redirection
- HTTP requests are automatically redirected to HTTPS with a 301 (Permanent Redirect) status
- Supports various proxy configurations (X-Forwarded-Proto, X-Forwarded-SSL, etc.)
- Maintains query parameters and request paths during redirection

### 2. HSTS (HTTP Strict Transport Security) Headers
- Automatically adds HSTS headers to HTTPS responses
- Configured with 1-year max-age and includeSubDomains directive
- Includes preload directive in production for enhanced security

### 3. Flexible Configuration
- Environment-based configuration for different deployment scenarios
- Automatic detection based on DEBUG/TESTING mode
- Manual override options for specific requirements

### 4. Proxy and Load Balancer Support
- Detects HTTPS termination at proxy/load balancer level
- Supports common proxy headers used by major cloud providers
- Works with reverse proxy setups

## Configuration

### Configuration Options

The HTTPS enforcement can be configured in three ways:

1. **Application Configuration** (highest priority)
2. **Environment Variables** (medium priority)  
3. **Automatic Detection** (lowest priority)

### Application Configuration

Set in your configuration file (config.py):

```python
# Explicit HTTPS enforcement
HTTPS_ENFORCED = True   # Always enforce HTTPS
HTTPS_ENFORCED = False  # Never enforce HTTPS
HTTPS_ENFORCED = None   # Auto-detect based on environment
```

### Environment Variables

Set the `HTTPS_ENFORCED` environment variable:

```bash
# Enable HTTPS enforcement
export HTTPS_ENFORCED=true

# Disable HTTPS enforcement  
export HTTPS_ENFORCED=false

# Use auto-detection (default)
unset HTTPS_ENFORCED
```

Accepted values for enabling: `true`, `True`, `1`, `yes`, `YES`, `on`, `ON`
Accepted values for disabling: `false`, `False`, `0`, `no`, `NO`, `off`, `OFF`

### Automatic Detection

When no explicit configuration is provided, HTTPS enforcement is:
- **Enabled** in production mode (`DEBUG=False` and `TESTING=False`)
- **Disabled** in development mode (`DEBUG=True`)
- **Disabled** in testing mode (`TESTING=True`)

## Deployment Scenarios

### Production Deployment

For production deployments, HTTPS enforcement is typically enabled automatically:

```python
# Production configuration
DEBUG = False
TESTING = False
HTTPS_ENFORCED = None  # Auto-detect (will be True)
```

Or explicitly:

```python
# Explicit production configuration
HTTPS_ENFORCED = True
```

### Development Environment

For development, HTTPS enforcement is disabled by default to allow easier testing:

```python
# Development configuration
DEBUG = True
HTTPS_ENFORCED = None  # Auto-detect (will be False)
```

#### HTTPS in Development (Optional)

To test HTTPS behavior in development:

1. **Install pyopenssl** (for self-signed certificates):
   ```bash
   pip install pyopenssl
   ```

2. **Enable development HTTPS**:
   ```bash
   export FLASK_SSL_DEV=true
   export HTTPS_ENFORCED=true
   python run.py
   ```

3. **Access the application**:
   ```
   https://localhost:5000
   ```
   Note: Browser will show security warning for self-signed certificate.

### Testing Environment

In testing, HTTPS enforcement is disabled to avoid test complications:

```python
# Test configuration
TESTING = True
HTTPS_ENFORCED = False  # Explicitly disabled for tests
```

## Proxy and Load Balancer Configuration

### Supported Headers

The system detects HTTPS through these headers:

- `X-Forwarded-Proto: https`
- `X-Forwarded-SSL: on`
- `X-Scheme: https`
- `HTTP_X_FORWARDED_PROTO: https`

### Common Configurations

#### AWS Application Load Balancer
```
X-Forwarded-Proto: https
```

#### Nginx Reverse Proxy
```nginx
proxy_set_header X-Forwarded-Proto $scheme;
```

#### Cloudflare
```
X-Forwarded-Proto: https
```

#### Apache Reverse Proxy
```apache
ProxyPreserveHost On
ProxyPass / http://backend:5000/
ProxyPassReverse / http://backend:5000/
ProxyPreserveHost On
RequestHeader set X-Forwarded-Proto "https"
```

## Security Headers

### HSTS (HTTP Strict Transport Security)

When HTTPS enforcement is enabled, the following header is added to all responses:

**Production Mode:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Development Mode:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Header Explanation

- `max-age=31536000`: Enforce HTTPS for 1 year (31,536,000 seconds)
- `includeSubDomains`: Apply to all subdomains
- `preload`: Eligible for browser HSTS preload lists (production only)

## API Behavior

### HTTP Requests

When HTTPS enforcement is enabled, HTTP requests receive:

**Status:** `301 Moved Permanently`
**Location:** `https://example.com/api/v1/endpoint`

Example:
```
GET http://api.example.com/api/v1/health
↓
301 Moved Permanently
Location: https://api.example.com/api/v1/health
```

### HTTPS Requests

HTTPS requests are processed normally with additional security headers:

```
GET https://api.example.com/api/v1/health
↓
200 OK
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

## Testing

### Manual Testing

Test HTTPS enforcement manually:

```bash
# Test HTTP redirect (should return 301)
curl -I http://localhost:5000/api/v1/health

# Test HTTPS (simulate with header)
curl -I -H "X-Forwarded-Proto: https" http://localhost:5000/api/v1/health
```

### Automated Testing

The test suite includes comprehensive HTTPS enforcement tests:

```bash
# Run HTTPS enforcement tests
python -m pytest tests/test_https_enforcement_minimal.py -v
```

## Troubleshooting

### Common Issues

#### 1. Redirect Loop
**Symptom:** Infinite redirects between HTTP and HTTPS
**Cause:** Proxy not forwarding correct headers
**Solution:** Configure proxy to send `X-Forwarded-Proto: https`

#### 2. HTTPS Not Enforced
**Symptom:** HTTP requests not redirected to HTTPS
**Cause:** HTTPS enforcement disabled or misconfigured
**Solution:** Check configuration and environment variables

#### 3. Development HTTPS Issues
**Symptom:** Cannot access HTTPS in development
**Cause:** Missing pyopenssl or misconfigured SSL
**Solution:** Install pyopenssl and check environment variables

### Debugging

Enable debug logging to troubleshoot HTTPS enforcement:

```python
import logging
logging.basicConfig(level=logging.INFO)

# Check configuration
with app.app_context():
    from chordme.https_enforcement import is_https_required
    print(f"HTTPS enforcement: {is_https_required()}")
```

### Configuration Verification

Verify your configuration:

```python
from chordme import app

with app.app_context():
    print(f"DEBUG: {app.config.get('DEBUG')}")
    print(f"TESTING: {app.config.get('TESTING')}")
    print(f"HTTPS_ENFORCED: {app.config.get('HTTPS_ENFORCED')}")
```

## Best Practices

### Production Deployment

1. **Use environment variables** for configuration
2. **Configure load balancer** to terminate SSL/TLS
3. **Set proper proxy headers** for HTTPS detection
4. **Test redirect behavior** before going live
5. **Monitor HSTS compliance** using browser developer tools

### Development Workflow

1. **Disable HTTPS enforcement** for local development
2. **Test HTTPS behavior** in staging environment
3. **Use environment-specific** configuration files
4. **Document configuration** requirements for team

### Security Considerations

1. **Always use HTTPS** in production
2. **Configure HSTS properly** to prevent downgrade attacks
3. **Test proxy configurations** to avoid security bypasses
4. **Monitor for redirect loops** that could impact availability
5. **Keep SSL/TLS certificates** up to date

## Example Configurations

### Docker Deployment

```dockerfile
# Dockerfile
ENV HTTPS_ENFORCED=true
ENV FLASK_DEBUG=false
EXPOSE 5000
```

### Docker Compose with Nginx

```yaml
# docker-compose.yml
version: '3'
services:
  nginx:
    image: nginx
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
  
  backend:
    build: .
    environment:
      - HTTPS_ENFORCED=true
    expose:
      - "5000"
```

### Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chordme-backend
spec:
  template:
    spec:
      containers:
      - name: backend
        env:
        - name: HTTPS_ENFORCED
          value: "true"
```

## Integration Examples

### Frontend Integration

When HTTPS enforcement is enabled, ensure frontend code uses HTTPS URLs:

```javascript
// Frontend configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.example.com' 
  : 'http://localhost:5000';
```

### API Client Configuration

Configure API clients to follow redirects:

```python
# Python requests example
import requests
session = requests.Session()
session.max_redirects = 3  # Follow HTTPS redirects
```

```javascript
// JavaScript fetch example
fetch(url, {
  redirect: 'follow'  // Follow HTTPS redirects
})
```