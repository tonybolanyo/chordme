"""
LDAP/Active Directory Authentication Provider

This module provides LDAP and Active Directory authentication integration
for enterprise deployments with configurable directory services.
"""

import logging
from typing import Dict, Optional, Any, List
from flask import current_app
from datetime import datetime, UTC

from .enterprise_auth import EnterpriseAuditLogger
from .models import User
from . import db

logger = logging.getLogger(__name__)

# LDAP library import with fallback
try:
    import ldap3
    from ldap3 import Server, Connection, ALL, SUBTREE
    LDAP_AVAILABLE = True
    ServerType = Server
except ImportError:
    LDAP_AVAILABLE = False
    ServerType = Any
    logger.warning("python-ldap3 not installed. LDAP authentication will not be available.")


class LDAPAuthProvider:
    """LDAP/Active Directory authentication provider"""
    
    def __init__(self):
        if not LDAP_AVAILABLE:
            raise ImportError("python-ldap3 is required for LDAP authentication")
        
        # Load LDAP configuration
        self.server_uri = current_app.config.get('LDAP_SERVER_URI', 'ldap://localhost:389')
        self.bind_dn = current_app.config.get('LDAP_BIND_DN', '')
        self.bind_password = current_app.config.get('LDAP_BIND_PASSWORD', '')
        self.user_search_base = current_app.config.get('LDAP_USER_SEARCH_BASE', 'ou=users,dc=example,dc=com')
        self.user_search_filter = current_app.config.get('LDAP_USER_SEARCH_FILTER', '(uid={username})')
        self.group_search_base = current_app.config.get('LDAP_GROUP_SEARCH_BASE', 'ou=groups,dc=example,dc=com')
        self.group_search_filter = current_app.config.get('LDAP_GROUP_SEARCH_FILTER', '(member={user_dn})')
        
        # Attribute mappings
        self.attr_mappings = {
            'email': current_app.config.get('LDAP_ATTR_EMAIL', 'mail'),
            'first_name': current_app.config.get('LDAP_ATTR_FIRST_NAME', 'givenName'),
            'last_name': current_app.config.get('LDAP_ATTR_LAST_NAME', 'sn'),
            'display_name': current_app.config.get('LDAP_ATTR_DISPLAY_NAME', 'displayName'),
            'phone': current_app.config.get('LDAP_ATTR_PHONE', 'telephoneNumber'),
            'department': current_app.config.get('LDAP_ATTR_DEPARTMENT', 'department'),
            'title': current_app.config.get('LDAP_ATTR_TITLE', 'title')
        }
        
        # TLS/SSL configuration
        self.use_tls = current_app.config.get('LDAP_USE_TLS', True)
        self.ca_cert_file = current_app.config.get('LDAP_CA_CERT_FILE', None)
        self.validate_cert = current_app.config.get('LDAP_VALIDATE_CERT', True)
    
    def authenticate(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Authenticate user against LDAP directory
        
        Args:
            username: Username or email
            password: User password
            
        Returns:
            User attributes if authentication successful, None otherwise
        """
        try:
            # Create LDAP server connection
            server = self._create_server()
            if not server:
                return None
            
            # Find user DN
            user_dn, user_attributes = self._find_user(server, username)
            if not user_dn:
                EnterpriseAuditLogger.log_auth_event('LDAP_USER_NOT_FOUND', {
                    'username': username,
                    'search_base': self.user_search_base
                })
                return None
            
            # Authenticate user
            if not self._authenticate_user(server, user_dn, password):
                EnterpriseAuditLogger.log_auth_event('LDAP_AUTH_FAILED', {
                    'username': username,
                    'user_dn': user_dn
                })
                return None
            
            # Get user groups
            user_groups = self._get_user_groups(server, user_dn)
            
            # Map LDAP attributes to application attributes
            mapped_attributes = self._map_attributes(user_attributes)
            mapped_attributes['groups'] = user_groups
            mapped_attributes['auth_method'] = 'ldap'
            
            # Log successful authentication
            EnterpriseAuditLogger.log_auth_event('LDAP_AUTH_SUCCESS', {
                'username': username,
                'user_dn': user_dn,
                'email': mapped_attributes.get('email')
            })
            
            return mapped_attributes
            
        except Exception as e:
            logger.error(f"LDAP authentication error: {e}")
            EnterpriseAuditLogger.log_auth_event('LDAP_AUTH_ERROR', {
                'username': username,
                'error': str(e)
            })
            return None
    
    def _create_server(self) -> Optional[ServerType]:
        """Create LDAP server connection"""
        try:
            # Configure TLS if enabled
            tls_config = None
            if self.use_tls:
                from ldap3 import Tls
                tls_config = Tls(
                    ca_certs_file=self.ca_cert_file,
                    validate=ldap3.CERT_REQUIRED if self.validate_cert else ldap3.CERT_NONE
                )
            
            server = Server(
                self.server_uri,
                get_info=ALL,
                tls=tls_config,
                use_ssl=self.server_uri.startswith('ldaps://')
            )
            
            return server
            
        except Exception as e:
            logger.error(f"LDAP server creation failed: {e}")
            return None
    
    def _find_user(self, server: ServerType, username: str) -> tuple[Optional[str], Optional[Dict[str, Any]]]:
        """Find user in LDAP directory"""
        try:
            # Create search connection
            conn = Connection(server, self.bind_dn, self.bind_password, auto_bind=True)
            
            # Prepare search filter
            search_filter = self.user_search_filter.format(username=username)
            
            # Get all attribute names for search
            attributes = list(self.attr_mappings.values()) + ['objectClass', 'memberOf']
            
            # Search for user
            conn.search(
                self.user_search_base,
                search_filter,
                SUBTREE,
                attributes=attributes
            )
            
            if len(conn.entries) == 0:
                return None, None
            
            if len(conn.entries) > 1:
                logger.warning(f"Multiple users found for username: {username}")
            
            # Get first matching user
            entry = conn.entries[0]
            user_dn = entry.entry_dn
            user_attributes = {}
            
            # Extract attributes
            for attr_name in attributes:
                if hasattr(entry, attr_name):
                    attr_value = getattr(entry, attr_name)
                    if attr_value:
                        # Handle multi-valued attributes
                        if isinstance(attr_value, list):
                            user_attributes[attr_name] = [str(v) for v in attr_value]
                        else:
                            user_attributes[attr_name] = str(attr_value)
            
            conn.unbind()
            return user_dn, user_attributes
            
        except Exception as e:
            logger.error(f"LDAP user search failed: {e}")
            return None, None
    
    def _authenticate_user(self, server: ServerType, user_dn: str, password: str) -> bool:
        """Authenticate user with their credentials"""
        try:
            # Try to bind with user credentials
            user_conn = Connection(server, user_dn, password)
            if user_conn.bind():
                user_conn.unbind()
                return True
            else:
                return False
                
        except Exception as e:
            logger.error(f"LDAP user authentication failed: {e}")
            return False
    
    def _get_user_groups(self, server: ServerType, user_dn: str) -> List[str]:
        """Get user group memberships"""
        try:
            # Create search connection
            conn = Connection(server, self.bind_dn, self.bind_password, auto_bind=True)
            
            # Search for groups
            search_filter = self.group_search_filter.format(user_dn=user_dn)
            
            conn.search(
                self.group_search_base,
                search_filter,
                SUBTREE,
                attributes=['cn', 'name']
            )
            
            groups = []
            for entry in conn.entries:
                # Try to get group name from cn or name attribute
                group_name = getattr(entry, 'cn', None) or getattr(entry, 'name', None)
                if group_name:
                    groups.append(str(group_name))
            
            conn.unbind()
            return groups
            
        except Exception as e:
            logger.error(f"LDAP group search failed: {e}")
            return []
    
    def _map_attributes(self, ldap_attributes: Dict[str, Any]) -> Dict[str, Any]:
        """Map LDAP attributes to application attributes"""
        mapped = {}
        
        for app_attr, ldap_attr in self.attr_mappings.items():
            if ldap_attr in ldap_attributes:
                value = ldap_attributes[ldap_attr]
                # Handle multi-valued attributes by taking first value
                if isinstance(value, list) and value:
                    mapped[app_attr] = value[0]
                elif value:
                    mapped[app_attr] = value
        
        return mapped
    
    def test_connection(self) -> Dict[str, Any]:
        """Test LDAP connection and configuration"""
        result = {
            'success': False,
            'message': '',
            'details': {}
        }
        
        try:
            server = self._create_server()
            if not server:
                result['message'] = 'Failed to create LDAP server connection'
                return result
            
            # Test bind
            conn = Connection(server, self.bind_dn, self.bind_password)
            if not conn.bind():
                result['message'] = f'LDAP bind failed: {conn.result}'
                return result
            
            # Test search
            conn.search(self.user_search_base, '(objectClass=*)', SUBTREE, size_limit=1)
            
            result['success'] = True
            result['message'] = 'LDAP connection successful'
            result['details'] = {
                'server': self.server_uri,
                'bind_dn': self.bind_dn,
                'user_search_base': self.user_search_base,
                'group_search_base': self.group_search_base,
                'use_tls': self.use_tls
            }
            
            conn.unbind()
            
        except Exception as e:
            result['message'] = f'LDAP connection test failed: {str(e)}'
        
        return result


class ActiveDirectoryAuthProvider(LDAPAuthProvider):
    """Active Directory specific authentication provider"""
    
    def __init__(self):
        super().__init__()
        
        # AD-specific defaults
        if not current_app.config.get('LDAP_USER_SEARCH_FILTER'):
            self.user_search_filter = '(sAMAccountName={username})'
        
        if not current_app.config.get('LDAP_GROUP_SEARCH_FILTER'):
            self.group_search_filter = '(member={user_dn})'
        
        # AD-specific attribute mappings
        self.attr_mappings.update({
            'username': 'sAMAccountName',
            'employee_id': 'employeeID',
            'manager': 'manager',
            'office': 'physicalDeliveryOfficeName'
        })
    
    def authenticate(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate against Active Directory"""
        # For AD, try both username and email formats
        result = super().authenticate(username, password)
        
        if not result and '@' not in username:
            # Try with domain suffix
            domain_suffix = current_app.config.get('AD_DOMAIN_SUFFIX', '')
            if domain_suffix:
                email_format = f"{username}@{domain_suffix}"
                result = super().authenticate(email_format, password)
        
        return result


class LDAPUserProvisioner:
    """Automatic user provisioning from LDAP"""
    
    def __init__(self, ldap_provider: LDAPAuthProvider):
        self.ldap_provider = ldap_provider
    
    def provision_user(self, ldap_attributes: Dict[str, Any]) -> Optional[User]:
        """
        Auto-provision user from LDAP attributes
        
        Args:
            ldap_attributes: Mapped LDAP attributes
            
        Returns:
            Created User object or None
        """
        try:
            email = ldap_attributes.get('email')
            if not email:
                logger.error("Cannot provision user without email")
                return None
            
            # Check if user already exists
            existing_user = User.query.filter_by(email=email.lower()).first()
            if existing_user:
                # Update existing user
                self._update_user_from_ldap(existing_user, ldap_attributes)
                return existing_user
            
            # Create new user
            user = User(email=email.lower(), password='')  # No password for LDAP users
            
            # Set user attributes
            user.display_name = ldap_attributes.get('display_name', email.split('@')[0])
            user.is_ldap_user = True  # We'll need to add this field
            user.ldap_dn = ldap_attributes.get('dn', '')
            
            # Set additional attributes if available
            if 'first_name' in ldap_attributes:
                user.first_name = ldap_attributes['first_name']
            if 'last_name' in ldap_attributes:
                user.last_name = ldap_attributes['last_name']
            
            db.session.add(user)
            db.session.commit()
            
            logger.info(f"Auto-provisioned LDAP user: {email}")
            EnterpriseAuditLogger.log_auth_event('LDAP_USER_PROVISIONED', {
                'email': email,
                'display_name': user.display_name,
                'groups': ldap_attributes.get('groups', [])
            }, user_id=user.id)
            
            return user
            
        except Exception as e:
            logger.error(f"LDAP user provisioning failed: {e}")
            db.session.rollback()
            return None
    
    def _update_user_from_ldap(self, user: User, ldap_attributes: Dict[str, Any]):
        """Update existing user with current LDAP attributes"""
        try:
            updated = False
            
            # Update display name
            new_display_name = ldap_attributes.get('display_name')
            if new_display_name and new_display_name != user.display_name:
                user.display_name = new_display_name
                updated = True
            
            # Update other attributes as needed
            # TODO: Add more attribute updates based on requirements
            
            if updated:
                user.updated_at = datetime.now(UTC)
                db.session.commit()
                logger.info(f"Updated LDAP user attributes: {user.email}")
            
        except Exception as e:
            logger.error(f"LDAP user update failed: {e}")
            db.session.rollback()


def create_ldap_provider() -> Optional[LDAPAuthProvider]:
    """Factory function to create appropriate LDAP provider"""
    if not LDAP_AVAILABLE:
        return None
    
    provider_type = current_app.config.get('LDAP_PROVIDER_TYPE', 'ldap')
    
    if provider_type.lower() == 'ad' or provider_type.lower() == 'activedirectory':
        return ActiveDirectoryAuthProvider()
    else:
        return LDAPAuthProvider()


# Global instance (will be None if LDAP not available)
ldap_provider = create_ldap_provider() if LDAP_AVAILABLE else None