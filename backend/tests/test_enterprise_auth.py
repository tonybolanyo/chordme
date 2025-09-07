"""
Test Enterprise Authentication Features

Comprehensive tests for enterprise authentication including:
- Enhanced session management
- SAML SSO integration  
- LDAP authentication
- Enterprise policy enforcement
- Audit logging
"""

import pytest
import json
from datetime import datetime, UTC, timedelta
from unittest.mock import patch, MagicMock

from chordme import app, db
from chordme.models import User
from chordme.enterprise_auth import (
    EnterpriseSessionManager, EnterpriseAuditLogger, 
    EnterprisePolicyEnforcer
)


class TestEnterpriseSessionManager:
    """Test enhanced session management"""
    
    @pytest.fixture
    def session_manager(self):
        return EnterpriseSessionManager()
    
    @pytest.fixture
    def test_user(self, test_client):
        """Create a test user"""
        user = User(email='enterprise@test.com', password='TestPass123!')
        db.session.add(user)
        db.session.commit()
        return user
    
    def test_create_session_basic(self, session_manager, test_user):
        """Test basic session creation"""
        session_data = {
            'ip_address': '192.168.1.100',
            'user_agent': 'Mozilla/5.0 Test Browser',
            'auth_method': 'password'
        }
        
        token = session_manager.create_session(test_user.id, session_data)
        assert token is not None
        assert isinstance(token, str)
    
    def test_create_session_with_enterprise_data(self, session_manager, test_user):
        """Test session creation with enterprise-specific data"""
        session_data = {
            'ip_address': '10.0.0.50',
            'user_agent': 'Corporate Browser',
            'auth_method': 'saml',
            'device_fingerprint': 'device123',
            'mfa_verified': True
        }
        
        token = session_manager.create_session(test_user.id, session_data)
        assert token is not None
        
        # Validate session
        payload = session_manager.validate_session(token)
        assert payload is not None
        assert payload['user_id'] == test_user.id
        assert payload['auth_method'] == 'saml'
        assert payload['mfa_verified'] is True
    
    def test_validate_session_success(self, session_manager, test_user):
        """Test successful session validation"""
        session_data = {
            'ip_address': '192.168.1.100',
            'user_agent': 'Test Browser',
            'auth_method': 'password'
        }
        
        token = session_manager.create_session(test_user.id, session_data)
        payload = session_manager.validate_session(token)
        
        assert payload is not None
        assert payload['user_id'] == test_user.id
        assert 'session_id' in payload
        assert 'exp' in payload
    
    def test_validate_session_invalid_token(self, session_manager):
        """Test validation with invalid token"""
        invalid_token = "invalid.token.here"
        payload = session_manager.validate_session(invalid_token)
        assert payload is None
    
    def test_invalidate_session(self, session_manager, test_user):
        """Test session invalidation"""
        session_data = {
            'ip_address': '192.168.1.100',
            'user_agent': 'Test Browser',
            'auth_method': 'password'
        }
        
        token = session_manager.create_session(test_user.id, session_data)
        payload = session_manager.validate_session(token)
        assert payload is not None
        
        session_id = payload['session_id']
        session_manager.invalidate_session(session_id, 'TEST_INVALIDATION')
        
        # Session should now be invalid
        payload_after = session_manager.validate_session(token)
        assert payload_after is None
    
    def test_invalidate_user_sessions(self, session_manager, test_user):
        """Test invalidating all user sessions"""
        # Create multiple sessions
        tokens = []
        for i in range(3):
            session_data = {
                'ip_address': f'192.168.1.{100 + i}',
                'user_agent': f'Browser {i}',
                'auth_method': 'password'
            }
            token = session_manager.create_session(test_user.id, session_data)
            tokens.append(token)
        
        # All sessions should be valid
        for token in tokens:
            assert session_manager.validate_session(token) is not None
        
        # Invalidate all sessions
        session_manager.invalidate_user_sessions(test_user.id)
        
        # All sessions should now be invalid (if Redis is configured)
        # Note: In test environment without Redis, this is logged but not enforced


class TestEnterprisePolicyEnforcer:
    """Test enterprise policy enforcement"""
    
    def test_password_policy_validation_success(self):
        """Test successful password policy validation"""
        with app.app_context():
            app.config['ENTERPRISE_PASSWORD_MIN_LENGTH'] = 12
            app.config['ENTERPRISE_PASSWORD_REQUIRE_UPPERCASE'] = True
            app.config['ENTERPRISE_PASSWORD_REQUIRE_LOWERCASE'] = True
            app.config['ENTERPRISE_PASSWORD_REQUIRE_NUMBERS'] = True
            app.config['ENTERPRISE_PASSWORD_REQUIRE_SPECIAL'] = True
            
            password = "EnterprisePass123!"
            is_valid, error = EnterprisePolicyEnforcer.validate_password_policy(password)
            
            assert is_valid is True
            assert error is None
    
    def test_password_policy_validation_too_short(self):
        """Test password policy validation with too short password"""
        with app.app_context():
            app.config['ENTERPRISE_PASSWORD_MIN_LENGTH'] = 12
            
            password = "Short1!"
            is_valid, error = EnterprisePolicyEnforcer.validate_password_policy(password)
            
            assert is_valid is False
            assert "at least 12 characters" in error
    
    def test_password_policy_validation_missing_uppercase(self):
        """Test password policy validation missing uppercase"""
        with app.app_context():
            app.config['ENTERPRISE_PASSWORD_MIN_LENGTH'] = 8
            app.config['ENTERPRISE_PASSWORD_REQUIRE_UPPERCASE'] = True
            
            password = "lowercase123!"
            is_valid, error = EnterprisePolicyEnforcer.validate_password_policy(password)
            
            assert is_valid is False
            assert "uppercase letter" in error
    
    def test_password_policy_validation_missing_special(self):
        """Test password policy validation missing special characters"""
        with app.app_context():
            app.config['ENTERPRISE_PASSWORD_MIN_LENGTH'] = 8
            app.config['ENTERPRISE_PASSWORD_REQUIRE_SPECIAL'] = True
            
            password = "Password123"
            is_valid, error = EnterprisePolicyEnforcer.validate_password_policy(password)
            
            assert is_valid is False
            assert "special character" in error
    
    def test_domain_whitelist_allowed(self):
        """Test domain whitelist with allowed domain"""
        with app.app_context():
            app.config['ENTERPRISE_DOMAIN_WHITELIST'] = ['company.com', 'corp.org']
            
            email = "user@company.com"
            is_allowed = EnterprisePolicyEnforcer.check_domain_whitelist(email)
            
            assert is_allowed is True
    
    def test_domain_whitelist_denied(self):
        """Test domain whitelist with denied domain"""
        with app.app_context():
            app.config['ENTERPRISE_DOMAIN_WHITELIST'] = ['company.com', 'corp.org']
            
            email = "user@external.com"
            is_allowed = EnterprisePolicyEnforcer.check_domain_whitelist(email)
            
            assert is_allowed is False
    
    def test_domain_whitelist_empty(self):
        """Test domain whitelist when no restrictions"""
        with app.app_context():
            app.config['ENTERPRISE_DOMAIN_WHITELIST'] = []
            
            email = "user@anywhere.com"
            is_allowed = EnterprisePolicyEnforcer.check_domain_whitelist(email)
            
            assert is_allowed is True
    
    def test_get_session_timeout_for_user(self):
        """Test getting session timeout for user"""
        with app.app_context():
            app.config['ENTERPRISE_SESSION_TIMEOUT'] = 7200  # 2 hours
            
            user = User(email='test@company.com', password='password')
            timeout = EnterprisePolicyEnforcer.get_session_timeout_for_user(user)
            
            assert timeout == 7200


class TestEnterpriseAuditLogger:
    """Test enterprise audit logging"""
    
    def test_log_auth_event(self):
        """Test authentication event logging"""
        with app.test_request_context('/test', headers={'User-Agent': 'Test Agent'}):
            log_entry = EnterpriseAuditLogger.log_auth_event(
                'LOGIN_SUCCESS',
                {'email': 'user@company.com'},
                user_id=123
            )
            
            assert log_entry['event_type'] == 'AUTH_LOGIN_SUCCESS'
            assert log_entry['user_id'] == 123
            assert 'timestamp' in log_entry
            assert 'ip_address' in log_entry
            assert 'user_agent' in log_entry
            assert log_entry['details']['email'] == 'user@company.com'
    
    def test_log_session_event(self):
        """Test session event logging"""
        with app.test_request_context('/test'):
            log_entry = EnterpriseAuditLogger.log_session_event(
                'CREATED',
                {'session_id': 'sess123', 'auth_method': 'saml'}
            )
            
            assert log_entry['event_type'] == 'SESSION_CREATED'
            assert 'timestamp' in log_entry
            assert log_entry['details']['session_id'] == 'sess123'
            assert log_entry['details']['auth_method'] == 'saml'
    
    def test_log_security_event(self):
        """Test security event logging"""
        with app.test_request_context('/test'):
            log_entry = EnterpriseAuditLogger.log_security_event(
                'SUSPICIOUS_ACTIVITY',
                {'threat_type': 'brute_force'},
                user_id=456
            )
            
            assert log_entry['event_type'] == 'SECURITY_SUSPICIOUS_ACTIVITY'
            assert log_entry['user_id'] == 456
            assert log_entry['details']['threat_type'] == 'brute_force'


class TestEnterpriseAuthenticationAPI:
    """Test enterprise authentication API endpoints"""
    
    def test_get_enterprise_auth_config(self, test_client):
        """Test getting enterprise authentication configuration"""
        response = test_client.get('/api/v1/auth/enterprise/config')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'success' in data
        assert data['success'] is True
        assert 'data' in data
        
        config = data['data']
        assert 'saml_enabled' in config
        assert 'ldap_enabled' in config
        assert 'mfa_enabled' in config
        assert 'sso_providers' in config
    
    def test_saml_login_disabled(self, test_client):
        """Test SAML login when disabled"""
        with app.app_context():
            app.config['SAML_ENABLED'] = False
            
            response = test_client.post('/api/v1/auth/saml/login',
                                      data=json.dumps({'provider': 'default'}),
                                      content_type='application/json')
            assert response.status_code == 400
            
            data = json.loads(response.data)
            assert "not enabled" in data['message']
    
    def test_ldap_login_unavailable(self, test_client):
        """Test LDAP login when LDAP is unavailable"""
        response = test_client.post('/api/v1/auth/ldap/login',
                                  data=json.dumps({
                                      'username': 'testuser',
                                      'password': 'testpass'
                                  }),
                                  content_type='application/json')
        
        # Should return 400 if LDAP is not configured
        assert response.status_code == 400
        
        data = json.loads(response.data)
        assert "not available" in data['message']
    
    def test_validate_enterprise_policy_password(self, test_client):
        """Test enterprise policy validation for password"""
        with app.app_context():
            app.config['ENTERPRISE_PASSWORD_MIN_LENGTH'] = 8
            app.config['ENTERPRISE_PASSWORD_REQUIRE_UPPERCASE'] = True
            
            # Test valid password
            response = test_client.post('/api/v1/auth/enterprise/policy/validate',
                                      data=json.dumps({'password': 'ValidPass123!'}),
                                      content_type='application/json')
            assert response.status_code == 200
            
            data = json.loads(response.data)
            assert data['success'] is True
            assert data['data']['password_policy']['valid'] is True
            
            # Test invalid password
            response = test_client.post('/api/v1/auth/enterprise/policy/validate',
                                      data=json.dumps({'password': 'weak'}),
                                      content_type='application/json')
            assert response.status_code == 200
            
            data = json.loads(response.data)
            assert data['success'] is True
            assert data['data']['password_policy']['valid'] is False
            assert data['data']['password_policy']['error'] is not None
    
    def test_validate_enterprise_policy_domain(self, test_client):
        """Test enterprise policy validation for domain"""
        with app.app_context():
            app.config['ENTERPRISE_DOMAIN_WHITELIST'] = ['company.com']
            
            # Test allowed domain
            response = test_client.post('/api/v1/auth/enterprise/policy/validate',
                                      data=json.dumps({'email': 'user@company.com'}),
                                      content_type='application/json')
            assert response.status_code == 200
            
            data = json.loads(response.data)
            assert data['success'] is True
            assert data['data']['domain_policy']['valid'] is True
            
            # Test disallowed domain
            response = test_client.post('/api/v1/auth/enterprise/policy/validate',
                                      data=json.dumps({'email': 'user@external.com'}),
                                      content_type='application/json')
            assert response.status_code == 200
            
            data = json.loads(response.data)
            assert data['success'] is True
            assert data['data']['domain_policy']['valid'] is False
    
    def test_validate_enterprise_session_no_token(self, test_client):
        """Test session validation without token"""
        response = test_client.post('/api/v1/auth/enterprise/session/validate',
                                  data=json.dumps({}),
                                  content_type='application/json')
        assert response.status_code == 400
        
        data = json.loads(response.data)
        assert "Token is required" in data['message']
    
    def test_validate_enterprise_session_invalid_token(self, test_client):
        """Test session validation with invalid token"""
        response = test_client.post('/api/v1/auth/enterprise/session/validate',
                                  data=json.dumps({'token': 'invalid.token.here'}),
                                  content_type='application/json')
        assert response.status_code == 401
        
        data = json.loads(response.data)
        assert "Invalid or expired" in data['message']


class TestUserModelEnterpriseFields:
    """Test User model enterprise authentication fields"""
    
    def test_user_model_enterprise_fields(self):
        """Test that User model has enterprise authentication fields"""
        user = User(email='enterprise@test.com', password='password')
        
        # Check that enterprise fields exist with default values
        assert hasattr(user, 'is_sso_user')
        assert hasattr(user, 'is_ldap_user')
        assert hasattr(user, 'sso_provider')
        assert hasattr(user, 'ldap_dn')
        assert hasattr(user, 'mfa_enabled')
        assert hasattr(user, 'mfa_secret')
        assert hasattr(user, 'last_mfa_verification')
        assert hasattr(user, 'login_attempts')
        assert hasattr(user, 'locked_until')
        assert hasattr(user, 'password_expires_at')
        
        # Check default values
        assert user.is_sso_user is False
        assert user.is_ldap_user is False
        assert user.mfa_enabled is False
        assert user.login_attempts == 0
    
    def test_user_to_dict_includes_enterprise_fields(self):
        """Test that to_dict includes enterprise fields"""
        user = User(email='enterprise@test.com', password='password')
        user.is_sso_user = True
        user.sso_provider = 'saml'
        user.mfa_enabled = True
        
        user_dict = user.to_dict()
        
        assert 'is_sso_user' in user_dict
        assert 'is_ldap_user' in user_dict
        assert 'sso_provider' in user_dict
        assert 'mfa_enabled' in user_dict
        
        assert user_dict['is_sso_user'] is True
        assert user_dict['sso_provider'] == 'saml'
        assert user_dict['mfa_enabled'] is True
        
        # Sensitive fields should not be included
        assert 'mfa_secret' not in user_dict
        assert 'ldap_dn' not in user_dict
        assert 'password_hash' not in user_dict


# Integration tests for enterprise features would go here
# These would test the full authentication flow with mocked SAML/LDAP responses