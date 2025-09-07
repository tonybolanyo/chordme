"""
SAML 2.0 SSO Integration for Enterprise Authentication

This module provides SAML 2.0 Single Sign-On integration for enterprise deployments.
Supports multiple SAML identity providers with configurable metadata.
"""

import logging
from typing import Dict, Optional, Any
from flask import current_app, request, redirect, url_for, session
from datetime import datetime, UTC
import xml.etree.ElementTree as ET
import base64
import uuid
from urllib.parse import quote_plus, unquote_plus
import hashlib
import hmac

from .enterprise_auth import EnterpriseAuditLogger, enterprise_session_manager
from .models import User
from . import db

logger = logging.getLogger(__name__)


class SAMLProvider:
    """SAML 2.0 Service Provider implementation"""
    
    def __init__(self):
        self._entity_id = None
        self._acs_url = None
        self._sls_url = None
        self._x509_cert = None
        self._private_key = None
    
    @property
    def entity_id(self):
        if self._entity_id is None:
            self._entity_id = current_app.config.get('SAML_ENTITY_ID', 'chordme-saml-sp')
        return self._entity_id
    
    @property
    def acs_url(self):
        if self._acs_url is None:
            self._acs_url = current_app.config.get('SAML_ACS_URL', '/api/v1/auth/saml/acs')
        return self._acs_url
    
    @property
    def sls_url(self):
        if self._sls_url is None:
            self._sls_url = current_app.config.get('SAML_SLS_URL', '/api/v1/auth/saml/sls')
        return self._sls_url
    
    @property
    def x509_cert(self):
        if self._x509_cert is None:
            self._x509_cert = current_app.config.get('SAML_X509_CERT', '')
        return self._x509_cert
    
    @property
    def private_key(self):
        if self._private_key is None:
            self._private_key = current_app.config.get('SAML_PRIVATE_KEY', '')
        return self._private_key
    
    def generate_authn_request(self, idp_config: Dict[str, Any]) -> tuple[str, str]:
        """
        Generate SAML Authentication Request
        
        Args:
            idp_config: Identity Provider configuration
            
        Returns:
            (redirect_url, request_id)
        """
        try:
            request_id = f"_{uuid.uuid4()}"
            timestamp = datetime.now(UTC).strftime('%Y-%m-%dT%H:%M:%SZ')
            
            # Build SAML AuthnRequest
            authn_request = f'''<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest 
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="{request_id}"
    Version="2.0"
    IssueInstant="{timestamp}"
    AssertionConsumerServiceURL="{self._get_full_acs_url()}"
    Destination="{idp_config['sso_url']}"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
    <saml:Issuer>{self.entity_id}</saml:Issuer>
    <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
</samlp:AuthnRequest>'''
            
            # Encode request
            encoded_request = base64.b64encode(authn_request.encode('utf-8')).decode('utf-8')
            
            # Build redirect URL
            redirect_url = f"{idp_config['sso_url']}?SAMLRequest={quote_plus(encoded_request)}"
            
            # Store request ID for validation
            session[f'saml_request_{request_id}'] = {
                'timestamp': timestamp,
                'idp_config': idp_config['name']
            }
            
            # Log SAML request
            EnterpriseAuditLogger.log_auth_event('SAML_REQUEST_GENERATED', {
                'request_id': request_id,
                'idp_name': idp_config['name'],
                'destination': idp_config['sso_url']
            })
            
            return redirect_url, request_id
            
        except Exception as e:
            logger.error(f"SAML AuthnRequest generation failed: {e}")
            return None, None
    
    def process_saml_response(self, saml_response: str) -> Optional[Dict[str, Any]]:
        """
        Process SAML Response from Identity Provider
        
        Args:
            saml_response: Base64 encoded SAML Response
            
        Returns:
            User attributes if successful, None otherwise
        """
        try:
            # Decode SAML Response
            decoded_response = base64.b64decode(saml_response).decode('utf-8')
            
            # Parse XML
            root = ET.fromstring(decoded_response)
            
            # Extract namespaces
            namespaces = {
                'samlp': 'urn:oasis:names:tc:SAML:2.0:protocol',
                'saml': 'urn:oasis:names:tc:SAML:2.0:assertion'
            }
            
            # Validate response status
            status = root.find('.//samlp:StatusCode', namespaces)
            if status is None or status.get('Value') != 'urn:oasis:names:tc:SAML:2.0:status:Success':
                logger.error("SAML Response status is not success")
                return None
            
            # Extract assertion
            assertion = root.find('.//saml:Assertion', namespaces)
            if assertion is None:
                logger.error("No assertion found in SAML Response")
                return None
            
            # Validate assertion (basic validation - production should include signature verification)
            if not self._validate_assertion(assertion, namespaces):
                return None
            
            # Extract user attributes
            user_attributes = self._extract_user_attributes(assertion, namespaces)
            
            # Log successful SAML response processing
            EnterpriseAuditLogger.log_auth_event('SAML_RESPONSE_PROCESSED', {
                'email': user_attributes.get('email'),
                'assertion_id': assertion.get('ID')
            })
            
            return user_attributes
            
        except Exception as e:
            logger.error(f"SAML Response processing failed: {e}")
            EnterpriseAuditLogger.log_auth_event('SAML_RESPONSE_ERROR', {
                'error': str(e)
            })
            return None
    
    def _validate_assertion(self, assertion: ET.Element, namespaces: Dict[str, str]) -> bool:
        """Validate SAML assertion (basic validation)"""
        try:
            # Check assertion has ID
            if not assertion.get('ID'):
                logger.error("Assertion missing ID")
                return False
            
            # Check issue instant
            issue_instant = assertion.get('IssueInstant')
            if not issue_instant:
                logger.error("Assertion missing IssueInstant")
                return False
            
            # Basic time validation (should be more comprehensive in production)
            # TODO: Implement proper time window validation
            
            # Check for subject
            subject = assertion.find('.//saml:Subject', namespaces)
            if subject is None:
                logger.error("Assertion missing Subject")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Assertion validation error: {e}")
            return False
    
    def _extract_user_attributes(self, assertion: ET.Element, namespaces: Dict[str, str]) -> Dict[str, Any]:
        """Extract user attributes from SAML assertion"""
        attributes = {}
        
        try:
            # Extract NameID (usually email)
            name_id = assertion.find('.//saml:NameID', namespaces)
            if name_id is not None:
                attributes['email'] = name_id.text
            
            # Extract attribute statements
            attr_statements = assertion.findall('.//saml:AttributeStatement', namespaces)
            for attr_statement in attr_statements:
                attrs = attr_statement.findall('.//saml:Attribute', namespaces)
                for attr in attrs:
                    attr_name = attr.get('Name')
                    attr_values = attr.findall('.//saml:AttributeValue', namespaces)
                    
                    if len(attr_values) == 1:
                        attributes[attr_name] = attr_values[0].text
                    else:
                        attributes[attr_name] = [av.text for av in attr_values]
            
            # Map common attribute names
            if 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress' in attributes:
                attributes['email'] = attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']
            
            if 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name' in attributes:
                attributes['display_name'] = attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
            
            if 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname' in attributes:
                attributes['first_name'] = attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname']
            
            if 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname' in attributes:
                attributes['last_name'] = attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname']
            
        except Exception as e:
            logger.error(f"Attribute extraction error: {e}")
        
        return attributes
    
    def _get_full_acs_url(self) -> str:
        """Get full ACS URL"""
        base_url = current_app.config.get('BASE_URL', 'http://localhost:5000')
        return f"{base_url}{self.acs_url}"
    
    def generate_sp_metadata(self) -> str:
        """Generate Service Provider metadata XML"""
        metadata = f'''<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="{self.entity_id}">
    <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true"
                        protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                     Location="{self._get_full_acs_url()}"
                                     index="1"/>
        <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                                Location="{current_app.config.get('BASE_URL', 'http://localhost:5000')}{self.sls_url}"/>
    </md:SPSSODescriptor>
</md:EntityDescriptor>'''
        
        return metadata


class SAMLAuthenticator:
    """SAML Authentication handler"""
    
    def __init__(self):
        self._saml_provider = None
        self._identity_providers = None
    
    @property
    def saml_provider(self):
        if self._saml_provider is None:
            self._saml_provider = SAMLProvider()
        return self._saml_provider
    
    @property
    def identity_providers(self):
        if self._identity_providers is None:
            self._identity_providers = self._load_idp_configs()
        return self._identity_providers
    
    def _load_idp_configs(self) -> Dict[str, Dict[str, Any]]:
        """Load Identity Provider configurations"""
        # Load from configuration or database
        configs = current_app.config.get('SAML_IDENTITY_PROVIDERS', {})
        
        # Default configuration for testing
        if not configs:
            configs = {
                'default': {
                    'name': 'Default IdP',
                    'sso_url': 'https://example.com/sso',
                    'metadata_url': 'https://example.com/metadata',
                    'x509_cert': '',
                    'entity_id': 'https://example.com/entity'
                }
            }
        
        return configs
    
    def initiate_sso(self, idp_name: str = 'default') -> Optional[str]:
        """
        Initiate SSO with specified Identity Provider
        
        Args:
            idp_name: Name of the Identity Provider
            
        Returns:
            Redirect URL for SSO
        """
        if idp_name not in self.identity_providers:
            logger.error(f"Unknown Identity Provider: {idp_name}")
            return None
        
        idp_config = self.identity_providers[idp_name]
        redirect_url, request_id = self.saml_provider.generate_authn_request(idp_config)
        
        return redirect_url
    
    def handle_sso_response(self, saml_response: str) -> Optional[User]:
        """
        Handle SSO response and authenticate user
        
        Args:
            saml_response: SAML Response from IdP
            
        Returns:
            Authenticated User object or None
        """
        try:
            # Process SAML response
            user_attributes = self.saml_provider.process_saml_response(saml_response)
            if not user_attributes:
                return None
            
            email = user_attributes.get('email')
            if not email:
                logger.error("No email found in SAML response")
                return None
            
            # Find or create user
            user = User.query.filter_by(email=email.lower()).first()
            if not user:
                # Auto-provision user if enabled
                if current_app.config.get('SAML_AUTO_PROVISION_USERS', True):
                    user = self._provision_user(user_attributes)
                else:
                    logger.error(f"User auto-provisioning disabled for {email}")
                    return None
            
            # Update user attributes from SAML
            self._update_user_from_saml(user, user_attributes)
            
            # Log successful SSO login
            EnterpriseAuditLogger.log_auth_event('SSO_LOGIN_SUCCESS', {
                'email': email,
                'auth_method': 'saml',
                'user_id': user.id
            }, user_id=user.id)
            
            return user
            
        except Exception as e:
            logger.error(f"SSO response handling failed: {e}")
            EnterpriseAuditLogger.log_auth_event('SSO_LOGIN_ERROR', {
                'error': str(e)
            })
            return None
    
    def _provision_user(self, attributes: Dict[str, Any]) -> Optional[User]:
        """Auto-provision user from SAML attributes"""
        try:
            email = attributes.get('email').lower()
            display_name = attributes.get('display_name', email.split('@')[0])
            
            # Create user without password (SSO-only)
            user = User(email=email, password='')  # Empty password for SSO users
            user.display_name = display_name
            
            # Set SSO-specific attributes
            user.is_sso_user = True  # We'll need to add this field to the User model
            user.sso_provider = 'saml'
            
            db.session.add(user)
            db.session.commit()
            
            logger.info(f"Auto-provisioned user: {email}")
            EnterpriseAuditLogger.log_auth_event('USER_AUTO_PROVISIONED', {
                'email': email,
                'provider': 'saml'
            }, user_id=user.id)
            
            return user
            
        except Exception as e:
            logger.error(f"User provisioning failed: {e}")
            db.session.rollback()
            return None
    
    def _update_user_from_saml(self, user: User, attributes: Dict[str, Any]):
        """Update user attributes from SAML response"""
        try:
            updated = False
            
            # Update display name if provided
            if 'display_name' in attributes and attributes['display_name'] != user.display_name:
                user.display_name = attributes['display_name']
                updated = True
            
            # Update other attributes as needed
            # TODO: Add more attribute mappings based on requirements
            
            if updated:
                db.session.commit()
                logger.info(f"Updated user attributes for {user.email}")
            
        except Exception as e:
            logger.error(f"User attribute update failed: {e}")
            db.session.rollback()


# Global instance
saml_authenticator = SAMLAuthenticator()