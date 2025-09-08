---
layout: default
lang: en
title: Enterprise Authentication Setup Guide
---

# Enterprise Authentication Setup Guide

This guide covers the setup and configuration of enterprise authentication features in ChordMe, including SSO, LDAP, and MFA.

## Overview

ChordMe's enterprise authentication system provides:

- **SAML 2.0 SSO**: Single Sign-On with enterprise identity providers
- **LDAP/Active Directory**: Direct authentication against directory services
- **Multi-Factor Authentication**: TOTP-based MFA with backup codes
- **Enhanced Session Management**: Configurable timeouts and device validation
- **Enterprise Policy Enforcement**: Password complexity, domain restrictions
- **Comprehensive Audit Logging**: Full compliance and security monitoring

## Quick Start

### 1. Install Dependencies

For full enterprise authentication functionality, install additional dependencies:

```bash
# LDAP/Active Directory support
pip install ldap3==2.9.1

# MFA support
pip install pyotp==2.9.0 qrcode[pil]==7.4.2

# Enhanced SAML support (optional)
pip install lxml==5.3.0
```

### 2. Basic Configuration

Add these settings to your `config.py`:

```python
# Enable enterprise features
SAML_ENABLED = True
MFA_ENABLED = True

# Session management
ENTERPRISE_SESSION_TIMEOUT = 28800  # 8 hours
ENTERPRISE_DEVICE_VALIDATION = True

# Password policy
ENTERPRISE_PASSWORD_MIN_LENGTH = 12
ENTERPRISE_PASSWORD_REQUIRE_SPECIAL = True

# Domain whitelist (optional)
ENTERPRISE_DOMAIN_WHITELIST = ['company.com', 'corp.example.com']
```

### 3. Test the Setup

Check that enterprise features are available:

```bash
curl http://localhost:5000/api/v1/auth/enterprise/config
```

## SAML 2.0 SSO Configuration

### Identity Provider Setup

1. **Configure your IdP** (Azure AD, Okta, ADFS, etc.) with these settings:
   - **SP Entity ID**: `chordme-saml-sp` (configurable)
   - **ACS URL**: `https://yourapp.com/api/v1/auth/saml/acs`
   - **Metadata URL**: `https://yourapp.com/api/v1/auth/saml/metadata`

2. **Environment Variables**:

```bash
# Basic SAML configuration
export SAML_ENABLED=true
export SAML_ENTITY_ID=chordme-saml-sp
export BASE_URL=https://yourapp.com

# Identity Provider details
export SAML_IDP_NAME="Company IdP"
export SAML_IDP_SSO_URL=https://idp.company.com/sso
export SAML_IDP_ENTITY_ID=https://idp.company.com/entity
export SAML_IDP_X509_CERT="-----BEGIN CERTIFICATE-----..."

# User provisioning
export SAML_AUTO_PROVISION_USERS=true
```

### SAML Endpoints

- **Initiate SSO**: `POST /api/v1/auth/saml/login`
- **Assertion Consumer**: `POST /api/v1/auth/saml/acs`
- **SP Metadata**: `GET /api/v1/auth/saml/metadata`

### Example SSO Flow

```javascript
// Frontend: Initiate SSO
const response = await fetch('/api/v1/auth/saml/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({provider: 'default'})
});

const {redirect_url} = await response.json();
window.location.href = redirect_url;
```

## LDAP/Active Directory Configuration

### Environment Variables

```bash
# LDAP Server Configuration
export LDAP_SERVER_URI=ldaps://ldap.company.com:636
export LDAP_BIND_DN="CN=service-account,OU=Services,DC=company,DC=com"
export LDAP_BIND_PASSWORD=service_password

# User Search Configuration
export LDAP_USER_SEARCH_BASE="OU=Users,DC=company,DC=com"
export LDAP_USER_SEARCH_FILTER="(sAMAccountName={username})"

# Group Search Configuration
export LDAP_GROUP_SEARCH_BASE="OU=Groups,DC=company,DC=com"
export LDAP_GROUP_SEARCH_FILTER="(member={user_dn})"

# Active Directory specific
export LDAP_PROVIDER_TYPE=ad
export AD_DOMAIN_SUFFIX=company.com

# Security Settings
export LDAP_USE_TLS=true
export LDAP_VALIDATE_CERT=true
export LDAP_CA_CERT_FILE=/path/to/ca.crt
```

### Attribute Mapping

```bash
# Map LDAP attributes to user fields
export LDAP_ATTR_EMAIL=mail
export LDAP_ATTR_FIRST_NAME=givenName
export LDAP_ATTR_LAST_NAME=sn
export LDAP_ATTR_DISPLAY_NAME=displayName
export LDAP_ATTR_DEPARTMENT=department
export LDAP_ATTR_TITLE=title
```

### LDAP Authentication

```javascript
// Frontend: LDAP login
const response = await fetch('/api/v1/auth/ldap/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    username: 'john.doe',  // or john.doe@company.com
    password: 'user_password'
  })
});
```

### Test LDAP Connection

```bash
# Admin endpoint to test LDAP configuration
curl -X POST http://localhost:5000/api/v1/auth/ldap/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Multi-Factor Authentication (MFA)

### Setup MFA for Users

1. **Setup Phase** (generates QR code):
```javascript
const response = await fetch('/api/v1/auth/mfa/setup', {
  method: 'POST',
  headers: {'Authorization': 'Bearer USER_TOKEN'}
});

const {qr_code, backup_codes} = await response.json();
// Display QR code and backup codes to user
```

2. **Enable Phase** (verify setup):
```javascript
const response = await fetch('/api/v1/auth/mfa/enable', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer USER_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({token: '123456'})  // From authenticator app
});
```

### MFA Login Flow

1. **Initial Login** (username/password):
```javascript
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: 'user@company.com',
    password: 'user_password'
  })
});

if (response.data.mfa_required) {
  // Show MFA token input
}
```

2. **MFA Verification**:
```javascript
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: 'user@company.com',
    password: 'user_password',
    mfa_token: '123456'  // Or backup code
  })
});
```

### MFA Management

```javascript
// Verify MFA token
await fetch('/api/v1/auth/mfa/verify', {
  method: 'POST',
  headers: {'Authorization': 'Bearer USER_TOKEN'},
  body: JSON.stringify({token: '123456'})
});

// Regenerate backup codes
const response = await fetch('/api/v1/auth/mfa/backup-codes/regenerate', {
  method: 'POST',
  headers: {'Authorization': 'Bearer USER_TOKEN'},
  body: JSON.stringify({token: '123456'})
});

// Disable MFA
await fetch('/api/v1/auth/mfa/disable', {
  method: 'POST',
  headers: {'Authorization': 'Bearer USER_TOKEN'},
  body: JSON.stringify({token: 'BACKUP_CODE'})
});
```

## Enhanced Session Management

### Configuration Options

```python
# Session timeout (seconds)
ENTERPRISE_SESSION_TIMEOUT = 28800  # 8 hours

# Device validation
ENTERPRISE_DEVICE_VALIDATION = True

# IP address validation
ENTERPRISE_IP_VALIDATION = True

# Redis for distributed sessions
REDIS_URL = 'redis://localhost:6379'
```

### Session Validation

```javascript
// Validate session with enhanced checks
const response = await fetch('/api/v1/auth/enterprise/session/validate', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({token: 'SESSION_TOKEN'})
});
```

### Session Management

```javascript
// Invalidate current session
await fetch('/api/v1/auth/enterprise/session/invalidate', {
  method: 'POST',
  headers: {'Authorization': 'Bearer USER_TOKEN'}
});

// Invalidate all user sessions
await fetch('/api/v1/auth/enterprise/session/invalidate', {
  method: 'POST',
  headers: {'Authorization': 'Bearer USER_TOKEN'},
  body: JSON.stringify({all_sessions: true})
});
```

## Enterprise Policy Enforcement

### Password Policies

```python
# Password requirements
ENTERPRISE_PASSWORD_MIN_LENGTH = 12
ENTERPRISE_PASSWORD_REQUIRE_UPPERCASE = True
ENTERPRISE_PASSWORD_REQUIRE_LOWERCASE = True
ENTERPRISE_PASSWORD_REQUIRE_NUMBERS = True
ENTERPRISE_PASSWORD_REQUIRE_SPECIAL = True
```

### Domain Restrictions

```python
# Allowed email domains for registration
ENTERPRISE_DOMAIN_WHITELIST = [
    'company.com',
    'subsidiary.org',
    'partner.net'
]
```

### Policy Validation

```javascript
// Validate policies before registration
const response = await fetch('/api/v1/auth/enterprise/policy/validate', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    password: 'NewPassword123!',
    email: 'user@company.com'
  })
});

const {password_policy, domain_policy} = response.data;
```

## Audit Logging and Compliance

### Log Categories

The system generates comprehensive audit logs for:

- **Authentication Events**: Login, logout, failures
- **Session Events**: Creation, validation, invalidation
- **Security Events**: Suspicious activity, policy violations
- **MFA Events**: Setup, verification, failures
- **SSO Events**: SAML requests, responses, errors
- **LDAP Events**: Authentication attempts, user provisioning

### Log Format

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "event_type": "AUTH_LOGIN_SUCCESS",
  "user_id": 123,
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "details": {
    "email": "user@company.com",
    "auth_method": "saml",
    "mfa_verified": true
  }
}
```

### Retrieving Audit Logs

```javascript
// Get audit logs (admin only)
const response = await fetch('/api/v1/auth/enterprise/audit?event_type=AUTH_LOGIN&start_date=2024-01-01', {
  headers: {'Authorization': 'Bearer ADMIN_TOKEN'}
});
```

## Security Best Practices

### Production Deployment

1. **Use HTTPS**: Always enable HTTPS in production
2. **Certificate Validation**: Validate all TLS certificates
3. **Strong Secrets**: Use cryptographically secure secrets
4. **Regular Rotation**: Rotate secrets and certificates regularly
5. **Network Security**: Restrict LDAP/SAML traffic to trusted networks

### Monitoring and Alerts

1. **Failed Authentication**: Monitor failed login attempts
2. **Session Anomalies**: Detect unusual session patterns
3. **MFA Bypass Attempts**: Alert on backup code usage
4. **Configuration Changes**: Track authentication setting changes

### Backup and Recovery

1. **Backup MFA Secrets**: Securely backup user MFA secrets
2. **LDAP Failover**: Configure multiple LDAP servers
3. **SSO Redundancy**: Set up backup identity providers
4. **Session Recovery**: Plan for Redis failover scenarios

## Troubleshooting

### Common Issues

1. **SAML Response Validation Fails**:
   - Check certificate configuration
   - Verify time synchronization
   - Validate XML signatures

2. **LDAP Connection Timeout**:
   - Test network connectivity
   - Verify firewall rules
   - Check certificate chain

3. **MFA Token Invalid**:
   - Verify time synchronization
   - Check token window settings
   - Validate secret encoding

### Debug Mode

Enable debug logging for troubleshooting:

```python
import logging
logging.getLogger('chordme.enterprise_auth').setLevel(logging.DEBUG)
logging.getLogger('chordme.saml_auth').setLevel(logging.DEBUG)
logging.getLogger('chordme.ldap_auth').setLevel(logging.DEBUG)
```

## API Reference

### Enterprise Configuration
- `GET /api/v1/auth/enterprise/config` - Get available auth methods

### SAML Endpoints
- `POST /api/v1/auth/saml/login` - Initiate SSO
- `POST /api/v1/auth/saml/acs` - Assertion Consumer Service
- `GET /api/v1/auth/saml/metadata` - SP metadata

### LDAP Endpoints
- `POST /api/v1/auth/ldap/login` - LDAP authentication
- `POST /api/v1/auth/ldap/test` - Test LDAP connection

### MFA Endpoints
- `POST /api/v1/auth/mfa/setup` - Initialize MFA setup
- `POST /api/v1/auth/mfa/enable` - Enable MFA
- `POST /api/v1/auth/mfa/verify` - Verify MFA token
- `POST /api/v1/auth/mfa/disable` - Disable MFA
- `POST /api/v1/auth/mfa/backup-codes/regenerate` - New backup codes

### Session Management
- `POST /api/v1/auth/enterprise/session/validate` - Validate session
- `POST /api/v1/auth/enterprise/session/invalidate` - Invalidate session

### Policy Validation
- `POST /api/v1/auth/enterprise/policy/validate` - Validate policies

### Audit Logging
- `GET /api/v1/auth/enterprise/audit` - Retrieve audit logs

For detailed API specifications, see the Swagger documentation at `/apidocs`.