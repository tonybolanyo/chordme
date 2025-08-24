"""
Tests for Google Drive service functionality.
"""

import pytest
from unittest.mock import patch, MagicMock
from chordme.google_drive_service import GoogleDriveService


class TestGoogleDriveService:
    """Test Google Drive service functionality."""
    
    def test_service_disabled_by_default(self, app):
        """Test that Google Drive service is disabled by default."""
        with app.app_context():
            service = GoogleDriveService()
            assert not service.is_enabled()
    
    def test_service_enabled_with_config(self, app):
        """Test that Google Drive service can be enabled via config."""
        with app.app_context():
            # Mock current_app.config directly
            from unittest.mock import patch
            with patch('chordme.google_drive_service.current_app') as mock_app:
                mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
                service = GoogleDriveService()
                assert service.is_enabled()
    
    def test_validate_chordpro_and_save_service_disabled(self, app):
        """Test validate_chordpro_and_save when service is disabled."""
        with app.app_context():
            service = GoogleDriveService()
            
            with pytest.raises(ValueError, match="Google Drive service is not enabled"):
                service.validate_chordpro_and_save(
                    access_token="test_token",
                    file_name="test.pro",
                    content="{title: Test Song}"
                )
    
    def test_batch_validate_files_service_disabled(self, app):
        """Test batch_validate_files when service is disabled."""
        with app.app_context():
            service = GoogleDriveService()
            
            with pytest.raises(ValueError, match="Google Drive service is not enabled"):
                service.batch_validate_files(
                    access_token="test_token",
                    file_ids=["file1", "file2"]
                )
    
    def test_backup_user_songs_service_disabled(self, app):
        """Test backup_user_songs when service is disabled."""
        with app.app_context():
            service = GoogleDriveService()
            
            with pytest.raises(ValueError, match="Google Drive service is not enabled"):
                service.backup_user_songs(
                    access_token="test_token",
                    user_songs=[]
                )
    
    @patch('chordme.google_drive_service.current_app')
    @patch('chordme.google_drive_service.build')
    @patch('chordme.chordpro_utils.validate_chordpro_content')
    def test_validate_chordpro_and_save_success(self, mock_validate, mock_build, mock_app, app):
        """Test successful ChordPro validation and save."""
        with app.app_context():
            # Mock current_app.config
            mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
            service = GoogleDriveService()
            
            # Mock validation result
            mock_validate.return_value = {
                'valid': True,
                'message': 'Valid ChordPro content'
            }
            
            # Mock Google Drive service
            mock_drive_service = MagicMock()
            mock_file_result = {
                'id': 'test_file_id',
                'name': 'test.pro',
                'mimeType': 'text/plain',
                'size': '100',
                'webViewLink': 'https://drive.google.com/file/d/test_file_id/view'
            }
            mock_drive_service.files().create().execute.return_value = mock_file_result
            mock_build.return_value = mock_drive_service
            
            result = service.validate_chordpro_and_save(
                access_token="test_token",
                file_name="test.pro",
                content="{title: Test Song}\nThis is a test song."
            )
            
            assert result['success'] is True
            assert result['validation']['valid'] is True
            assert result['file']['id'] == 'test_file_id'
            assert result['message'] == 'ChordPro content validated and saved successfully'
    
    @patch('chordme.google_drive_service.current_app')
    @patch('chordme.google_drive_service.build')
    @patch('chordme.chordpro_utils.validate_chordpro_content')
    def test_validate_chordpro_and_save_validation_failure(self, mock_validate, mock_build, mock_app, app):
        """Test ChordPro validation failure."""
        with app.app_context():
            # Mock current_app.config
            mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
            service = GoogleDriveService()
            
            # Mock validation failure
            mock_validate.return_value = {
                'valid': False,
                'message': 'Invalid ChordPro content',
                'errors': ['Missing title directive']
            }
            
            result = service.validate_chordpro_and_save(
                access_token="test_token",
                file_name="test.pro",
                content="Invalid content"
            )
            
            assert result['success'] is False
            assert result['validation']['valid'] is False
            assert result['message'] == 'ChordPro validation failed'
            
            # Should not call Google Drive API
            mock_build.assert_not_called()
    
    @patch('chordme.google_drive_service.current_app')
    @patch('chordme.google_drive_service.build')
    @patch('chordme.chordpro_utils.validate_chordpro_content')
    def test_batch_validate_files_success(self, mock_validate, mock_build, mock_app, app):
        """Test successful batch validation."""
        with app.app_context():
            # Mock current_app.config
            mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
            service = GoogleDriveService()
            
            # Mock validation result
            mock_validate.return_value = {
                'valid': True,
                'message': 'Valid ChordPro content'
            }
            
            # Mock Google Drive service
            mock_drive_service = MagicMock()
            mock_drive_service.files().get().execute.return_value = {
                'id': 'file1',
                'name': 'test1.pro',
                'mimeType': 'text/plain',
                'size': '100'
            }
            mock_drive_service.files().get_media().execute.return_value = b"{title: Test Song}\nContent"
            mock_build.return_value = mock_drive_service
            
            result = service.batch_validate_files(
                access_token="test_token",
                file_ids=["file1"]
            )
            
            assert result['success'] is True
            assert result['total'] == 1
            assert result['processed'] == 1
            assert len(result['results']) == 1
            assert result['results'][0]['success'] is True
            assert result['results'][0]['file_id'] == 'file1'
    
    def test_sanitize_filename(self, app):
        """Test filename sanitization."""
        with app.app_context():
            service = GoogleDriveService()
            
            # Test invalid characters
            result = service._sanitize_filename('test<>:"/\\|?*.pro')
            assert result == 'test_________.pro'
            
            # Test long filename
            long_name = 'a' * 100 + '.pro'
            result = service._sanitize_filename(long_name)
            assert len(result) <= 100
            assert result.endswith('.pro')
    
    @patch('chordme.google_drive_service.current_app')
    @patch('chordme.google_drive_service.build')
    def test_backup_user_songs_empty_list(self, mock_build, mock_app, app):
        """Test backup with empty song list."""
        with app.app_context():
            # Mock current_app.config
            mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
            service = GoogleDriveService()
            
            result = service.backup_user_songs(
                access_token="test_token",
                user_songs=[]
            )
            
            assert result['success'] is True
            assert result['message'] == 'No songs to backup'
            assert result['files'] == []
            
            # Should not call Google Drive API
            mock_build.assert_not_called()