"""
Multi-Factor Authentication (MFA) Implementation

This module provides enterprise-grade multi-factor authentication including:
- TOTP (Time-based One-Time Password) support
- QR code generation for authenticator apps
- Backup codes generation and validation
- MFA enforcement policies
- Recovery mechanisms
"""

import logging
from typing import Dict, Optional, List, Tuple
from flask import current_app
from datetime import datetime, UTC
import secrets
import base64
import io

from .enterprise_auth import EnterpriseAuditLogger
from .models import User
from . import db

logger = logging.getLogger(__name__)

# MFA library imports with fallback
try:
    import pyotp
    import qrcode
    from qrcode.image.pil import PilImage
    MFA_AVAILABLE = True
except ImportError:
    MFA_AVAILABLE = False
    logger.warning("MFA libraries (pyotp, qrcode) not installed. MFA will not be available.")


class MFAProvider:
    """Multi-Factor Authentication provider using TOTP"""
    
    def __init__(self):
        if not MFA_AVAILABLE:
            raise ImportError("pyotp and qrcode are required for MFA functionality")
        
        self.issuer_name = current_app.config.get('MFA_ISSUER_NAME', 'ChordMe')
        self.backup_codes_count = current_app.config.get('MFA_BACKUP_CODES_COUNT', 10)
    
    def generate_secret(self) -> str:
        """Generate a new TOTP secret for a user"""
        return pyotp.random_base32()
    
    def generate_qr_code(self, user: User, secret: str) -> str:
        """
        Generate QR code for TOTP setup
        
        Args:
            user: User object
            secret: TOTP secret
            
        Returns:
            Base64 encoded QR code image
        """
        try:
            # Create TOTP URI
            totp = pyotp.TOTP(secret)
            provisioning_uri = totp.provisioning_uri(
                name=user.email,
                issuer_name=self.issuer_name
            )
            
            # Generate QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(provisioning_uri)
            qr.make(fit=True)
            
            # Create image
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            return qr_code_base64
            
        except Exception as e:
            logger.error(f"QR code generation failed: {e}")
            return None
    
    def verify_totp(self, secret: str, token: str, window: int = 1) -> bool:
        """
        Verify TOTP token
        
        Args:
            secret: User's TOTP secret
            token: Token to verify
            window: Number of time windows to check (for clock drift)
            
        Returns:
            True if token is valid
        """
        try:
            totp = pyotp.TOTP(secret)
            return totp.verify(token, valid_window=window)
        except Exception as e:
            logger.error(f"TOTP verification failed: {e}")
            return False
    
    def generate_backup_codes(self) -> List[str]:
        """Generate backup codes for account recovery"""
        codes = []
        for _ in range(self.backup_codes_count):
            # Generate 8-character alphanumeric codes
            code = ''.join(secrets.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') for _ in range(8))
            codes.append(code)
        return codes
    
    def hash_backup_codes(self, codes: List[str]) -> List[str]:
        """Hash backup codes for secure storage"""
        import bcrypt
        hashed_codes = []
        for code in codes:
            salt = bcrypt.gensalt()
            hashed = bcrypt.hashpw(code.encode('utf-8'), salt)
            hashed_codes.append(hashed.decode('utf-8'))
        return hashed_codes
    
    def verify_backup_code(self, hashed_codes: List[str], provided_code: str) -> Tuple[bool, Optional[int]]:
        """
        Verify backup code and return its index if valid
        
        Args:
            hashed_codes: List of hashed backup codes
            provided_code: Code provided by user
            
        Returns:
            (is_valid, code_index)
        """
        import bcrypt
        try:
            provided_bytes = provided_code.upper().encode('utf-8')
            for i, hashed_code in enumerate(hashed_codes):
                if bcrypt.checkpw(provided_bytes, hashed_code.encode('utf-8')):
                    return True, i
            return False, None
        except Exception as e:
            logger.error(f"Backup code verification failed: {e}")
            return False, None


class MFAManager:
    """MFA management for users"""
    
    def __init__(self):
        if not MFA_AVAILABLE:
            self.mfa_provider = None
        else:
            self.mfa_provider = MFAProvider()
    
    def setup_mfa_for_user(self, user: User) -> Dict[str, str]:
        """
        Set up MFA for a user
        
        Args:
            user: User object
            
        Returns:
            Dictionary with secret and QR code
        """
        if not self.mfa_provider:
            raise RuntimeError("MFA not available")
        
        try:
            # Generate secret
            secret = self.mfa_provider.generate_secret()
            
            # Generate QR code
            qr_code = self.mfa_provider.generate_qr_code(user, secret)
            if not qr_code:
                raise RuntimeError("Failed to generate QR code")
            
            # Generate backup codes
            backup_codes = self.mfa_provider.generate_backup_codes()
            hashed_backup_codes = self.mfa_provider.hash_backup_codes(backup_codes)
            
            # Store secret (but don't enable MFA yet)
            user.mfa_secret = secret
            user.mfa_backup_codes = hashed_backup_codes
            
            # Don't commit here - let the calling code handle it
            
            # Log MFA setup initiation
            EnterpriseAuditLogger.log_auth_event('MFA_SETUP_INITIATED', {
                'user_id': user.id,
                'email': user.email
            }, user_id=user.id)
            
            return {
                'secret': secret,
                'qr_code': qr_code,
                'backup_codes': backup_codes  # Return plain codes to show user once
            }
            
        except Exception as e:
            logger.error(f"MFA setup failed for user {user.id}: {e}")
            raise RuntimeError(f"MFA setup failed: {str(e)}")
    
    def enable_mfa_for_user(self, user: User, verification_token: str) -> bool:
        """
        Enable MFA for user after verifying initial token
        
        Args:
            user: User object
            verification_token: TOTP token for verification
            
        Returns:
            True if MFA was enabled successfully
        """
        if not self.mfa_provider or not user.mfa_secret:
            return False
        
        try:
            # Verify the token
            if not self.mfa_provider.verify_totp(user.mfa_secret, verification_token):
                EnterpriseAuditLogger.log_auth_event('MFA_ENABLE_FAILED', {
                    'user_id': user.id,
                    'reason': 'invalid_token'
                }, user_id=user.id)
                return False
            
            # Enable MFA
            user.mfa_enabled = True
            user.last_mfa_verification = datetime.now(UTC)
            db.session.commit()
            
            # Log successful MFA enablement
            EnterpriseAuditLogger.log_auth_event('MFA_ENABLED', {
                'user_id': user.id,
                'email': user.email
            }, user_id=user.id)
            
            return True
            
        except Exception as e:
            logger.error(f"MFA enablement failed for user {user.id}: {e}")
            db.session.rollback()
            return False
    
    def disable_mfa_for_user(self, user: User, verification_token: str) -> bool:
        """
        Disable MFA for user after verification
        
        Args:
            user: User object
            verification_token: TOTP token or backup code for verification
            
        Returns:
            True if MFA was disabled successfully
        """
        if not self.mfa_provider or not user.mfa_enabled:
            return False
        
        try:
            # Try TOTP first
            totp_valid = False
            if user.mfa_secret:
                totp_valid = self.mfa_provider.verify_totp(user.mfa_secret, verification_token)
            
            # Try backup code if TOTP failed
            backup_valid = False
            backup_index = None
            if not totp_valid and user.mfa_backup_codes:
                backup_valid, backup_index = self.mfa_provider.verify_backup_code(
                    user.mfa_backup_codes, verification_token
                )
            
            if not totp_valid and not backup_valid:
                EnterpriseAuditLogger.log_auth_event('MFA_DISABLE_FAILED', {
                    'user_id': user.id,
                    'reason': 'invalid_token'
                }, user_id=user.id)
                return False
            
            # If backup code was used, mark it as used
            if backup_valid and backup_index is not None:
                user.mfa_backup_codes.pop(backup_index)
            
            # Disable MFA
            user.mfa_enabled = False
            user.mfa_secret = None
            user.mfa_backup_codes = []
            user.last_mfa_verification = None
            db.session.commit()
            
            # Log successful MFA disablement
            EnterpriseAuditLogger.log_auth_event('MFA_DISABLED', {
                'user_id': user.id,
                'email': user.email,
                'method': 'backup_code' if backup_valid else 'totp'
            }, user_id=user.id)
            
            return True
            
        except Exception as e:
            logger.error(f"MFA disablement failed for user {user.id}: {e}")
            db.session.rollback()
            return False
    
    def verify_mfa_token(self, user: User, token: str) -> bool:
        """
        Verify MFA token during login
        
        Args:
            user: User object
            token: TOTP token or backup code
            
        Returns:
            True if token is valid
        """
        if not self.mfa_provider or not user.mfa_enabled:
            return False
        
        try:
            # Try TOTP first
            totp_valid = False
            if user.mfa_secret:
                totp_valid = self.mfa_provider.verify_totp(user.mfa_secret, token)
            
            if totp_valid:
                user.last_mfa_verification = datetime.now(UTC)
                db.session.commit()
                
                EnterpriseAuditLogger.log_auth_event('MFA_VERIFICATION_SUCCESS', {
                    'user_id': user.id,
                    'method': 'totp'
                }, user_id=user.id)
                
                return True
            
            # Try backup code if TOTP failed
            if user.mfa_backup_codes:
                backup_valid, backup_index = self.mfa_provider.verify_backup_code(
                    user.mfa_backup_codes, token
                )
                
                if backup_valid and backup_index is not None:
                    # Mark backup code as used
                    user.mfa_backup_codes.pop(backup_index)
                    user.last_mfa_verification = datetime.now(UTC)
                    db.session.commit()
                    
                    EnterpriseAuditLogger.log_auth_event('MFA_VERIFICATION_SUCCESS', {
                        'user_id': user.id,
                        'method': 'backup_code',
                        'remaining_codes': len(user.mfa_backup_codes)
                    }, user_id=user.id)
                    
                    return True
            
            # If we get here, verification failed
            EnterpriseAuditLogger.log_auth_event('MFA_VERIFICATION_FAILED', {
                'user_id': user.id
            }, user_id=user.id)
            
            return False
            
        except Exception as e:
            logger.error(f"MFA verification failed for user {user.id}: {e}")
            return False
    
    def generate_new_backup_codes(self, user: User, verification_token: str) -> Optional[List[str]]:
        """
        Generate new backup codes for user
        
        Args:
            user: User object
            verification_token: TOTP token for verification
            
        Returns:
            New backup codes if successful, None otherwise
        """
        if not self.mfa_provider or not user.mfa_enabled:
            return None
        
        try:
            # Verify token first
            if not self.mfa_provider.verify_totp(user.mfa_secret, verification_token):
                return None
            
            # Generate new backup codes
            backup_codes = self.mfa_provider.generate_backup_codes()
            hashed_backup_codes = self.mfa_provider.hash_backup_codes(backup_codes)
            
            # Update user
            user.mfa_backup_codes = hashed_backup_codes
            db.session.commit()
            
            # Log backup codes regeneration
            EnterpriseAuditLogger.log_auth_event('MFA_BACKUP_CODES_REGENERATED', {
                'user_id': user.id,
                'email': user.email
            }, user_id=user.id)
            
            return backup_codes
            
        except Exception as e:
            logger.error(f"Backup codes regeneration failed for user {user.id}: {e}")
            db.session.rollback()
            return None
    
    def is_mfa_required_for_user(self, user: User) -> bool:
        """
        Check if MFA is required for this user based on policies
        
        Args:
            user: User object
            
        Returns:
            True if MFA is required
        """
        # Global MFA requirement
        if current_app.config.get('MFA_REQUIRED_FOR_ALL', False):
            return True
        
        # Domain-based MFA requirement
        mfa_required_domains = current_app.config.get('MFA_REQUIRED_DOMAINS', [])
        if mfa_required_domains:
            user_domain = user.email.split('@')[1].lower()
            if user_domain in mfa_required_domains:
                return True
        
        # Role-based MFA requirement (placeholder for future implementation)
        # TODO: Implement role-based MFA requirements
        
        # SSO users might have different requirements
        if user.is_sso_user:
            return current_app.config.get('MFA_REQUIRED_FOR_SSO', False)
        
        return False


def create_mfa_manager() -> Optional[MFAManager]:
    """Factory function to create MFA manager"""
    if not MFA_AVAILABLE:
        logger.warning("MFA libraries not available")
        return None
    
    return MFAManager()


# Global instance (will be None if MFA not available)
mfa_manager = create_mfa_manager() if MFA_AVAILABLE else None