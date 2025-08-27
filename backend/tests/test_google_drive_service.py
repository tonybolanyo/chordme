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

    @patch('chordme.google_drive_service.current_app')
    @patch('chordme.google_drive_service.build')
    def test_drive_api_list_files_success(self, mock_build, mock_app, app):
        """Test successful Google Drive file listing."""
        with app.app_context():
            # Configure mock_app properly
            mock_config = MagicMock()
            mock_config.GOOGLE_DRIVE_ENABLED = True
            mock_app.config = mock_config
            
            service = GoogleDriveService()
            service._enabled = None  # Reset cache to pick up mock config
            
            # Mock Google Drive service
            mock_drive_service = MagicMock()
            mock_files_list = {
                'files': [
                    {
                        'id': 'file1',
                        'name': 'song1.pro',
                        'mimeType': 'text/plain',
                        'size': '150',
                        'modifiedTime': '2023-01-01T00:00:00Z'
                    },
                    {
                        'id': 'file2',
                        'name': 'song2.pro',
                        'mimeType': 'text/plain',
                        'size': '200',
                        'modifiedTime': '2023-01-02T00:00:00Z'
                    }
                ],
                'nextPageToken': None
            }
            mock_drive_service.files().list().execute.return_value = mock_files_list
            mock_build.return_value = mock_drive_service
            
            result = service._list_drive_files("test_token", query="name contains '.pro'")
            
            assert len(result) == 2
            assert result[0]['id'] == 'file1'
            assert result[1]['name'] == 'song2.pro'
            
            # Verify API call was made with correct parameters
            assert mock_drive_service.files().list.call_count >= 1

    @patch('chordme.google_drive_service.current_app')
    @patch('chordme.google_drive_service.build')
    def test_create_drive_service_success(self, mock_build, mock_app, app):
        """Test successful creation of Google Drive service."""
        with app.app_context():
            mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
            service = GoogleDriveService()
            
            mock_drive_service = MagicMock()
            mock_build.return_value = mock_drive_service
            
            result = service._create_drive_service("valid_token")
            
            assert result == mock_drive_service
            mock_build.assert_called_once_with('drive', 'v3', credentials=service._create_drive_service("valid_token").return_value)

    @patch('chordme.google_drive_service.current_app')
    def test_create_drive_service_invalid_token(self, mock_app, app):
        """Test Drive service creation with invalid token."""
        with app.app_context():
            mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
            service = GoogleDriveService()
            
            with pytest.raises(ValueError, match="Invalid or expired access token"):
                service._create_drive_service("")

    @patch('chordme.google_drive_service.current_app')
    @patch('chordme.google_drive_service.build')
    def test_download_drive_file_success(self, mock_build, mock_app, app):
        """Test successful file download from Google Drive."""
        with app.app_context():
            mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
            service = GoogleDriveService()
            
            # Mock Google Drive service
            mock_drive_service = MagicMock()
            mock_file_metadata = {
                'id': 'file123',
                'name': 'test.pro',
                'mimeType': 'text/plain',
                'size': '100'
            }
            mock_drive_service.files().get().execute.return_value = mock_file_metadata
            mock_drive_service.files().get_media().execute.return_value = b"{title: Test Song}\nContent"
            mock_build.return_value = mock_drive_service
            
            metadata, content = service._download_drive_file("valid_token", "file123")
            
            assert metadata == mock_file_metadata
            assert content == "{title: Test Song}\nContent"

    @patch('chordme.google_drive_service.current_app')
    @patch('chordme.google_drive_service.build')
    def test_upload_to_drive_success(self, mock_build, mock_app, app):
        """Test successful file upload to Google Drive."""
        with app.app_context():
            mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
            service = GoogleDriveService()
            
            # Mock Google Drive service
            mock_drive_service = MagicMock()
            mock_upload_result = {
                'id': 'new_file_id',
                'name': 'test.pro',
                'mimeType': 'text/plain',
                'size': '100',
                'webViewLink': 'https://drive.google.com/file/d/new_file_id/view'
            }
            mock_drive_service.files().create().execute.return_value = mock_upload_result
            mock_build.return_value = mock_drive_service
            
            result = service._upload_to_drive("valid_token", "test.pro", "{title: Test Song}")
            
            assert result == mock_upload_result

    @patch('chordme.google_drive_service.current_app')
    @patch('chordme.google_drive_service.build')
    def test_create_drive_folder_success(self, mock_build, mock_app, app):
        """Test successful folder creation in Google Drive."""
        with app.app_context():
            mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
            service = GoogleDriveService()
            
            # Mock Google Drive service
            mock_drive_service = MagicMock()
            mock_folder_result = {
                'id': 'folder_id',
                'name': 'ChordMe Backup',
                'mimeType': 'application/vnd.google-apps.folder'
            }
            mock_drive_service.files().create().execute.return_value = mock_folder_result
            mock_build.return_value = mock_drive_service
            
            result = service._create_drive_folder("valid_token", "ChordMe Backup")
            
            assert result == mock_folder_result

    @patch('chordme.google_drive_service.current_app')
    @patch('chordme.google_drive_service.build')
    def test_update_drive_file_success(self, mock_build, mock_app, app):
        """Test successful file update in Google Drive."""
        with app.app_context():
            mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
            service = GoogleDriveService()
            
            # Mock Google Drive service
            mock_drive_service = MagicMock()
            mock_update_result = {
                'id': 'file123',
                'name': 'test.pro',
                'mimeType': 'text/plain',
                'size': '150'
            }
            mock_drive_service.files().update().execute.return_value = mock_update_result
            mock_build.return_value = mock_drive_service
            
            result = service._update_drive_file("valid_token", "file123", "{title: Updated Song}")
            
            assert result == mock_update_result

    @patch('chordme.google_drive_service.current_app')
    @patch('chordme.google_drive_service.build')
    def test_delete_drive_file_success(self, mock_build, mock_app, app):
        """Test successful file deletion from Google Drive."""
        with app.app_context():
            mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
            service = GoogleDriveService()
            
            # Mock Google Drive service
            mock_drive_service = MagicMock()
            mock_drive_service.files().delete().execute.return_value = None
            mock_build.return_value = mock_drive_service
            
            result = service._delete_drive_file("valid_token", "file123")
            
            assert result is True

    @patch('chordme.google_drive_service.current_app')
    @patch('chordme.google_drive_service.build')
    def test_get_file_permissions_success(self, mock_build, mock_app, app):
        """Test successful retrieval of file permissions."""
        with app.app_context():
            mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
            service = GoogleDriveService()
            
            # Mock Google Drive service
            mock_drive_service = MagicMock()
            mock_permissions = {
                'permissions': [
                    {
                        'id': 'permission1',
                        'type': 'user',
                        'role': 'owner',
                        'emailAddress': 'owner@example.com'
                    }
                ]
            }
            mock_drive_service.permissions().list().execute.return_value = mock_permissions
            mock_build.return_value = mock_drive_service
            
            result = service._get_file_permissions("valid_token", "file123")
            
            assert result == mock_permissions

    @patch('chordme.google_drive_service.current_app')
    @patch('chordme.google_drive_service.build')
    def test_create_or_find_folder_existing(self, mock_build, mock_app, app):
        """Test finding existing folder."""
        with app.app_context():
            mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
            service = GoogleDriveService()
            
            # Mock Google Drive service
            mock_drive_service = MagicMock()
            mock_search_result = {
                'files': [
                    {
                        'id': 'existing_folder_id',
                        'name': 'ChordMe Backup',
                        'mimeType': 'application/vnd.google-apps.folder'
                    }
                ]
            }
            mock_drive_service.files().list().execute.return_value = mock_search_result
            mock_build.return_value = mock_drive_service
            
            result = service._create_or_find_folder(mock_drive_service, "ChordMe Backup")
            
            assert result == 'existing_folder_id'

    @patch('chordme.google_drive_service.current_app')
    @patch('chordme.google_drive_service.build')
    def test_create_or_find_folder_new(self, mock_build, mock_app, app):
        """Test creating new folder when not found."""
        with app.app_context():
            mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
            service = GoogleDriveService()
            
            # Mock Google Drive service
            mock_drive_service = MagicMock()
            # First call returns empty (folder not found)
            mock_search_result = {'files': []}
            mock_drive_service.files().list().execute.return_value = mock_search_result
            
            # Second call returns created folder
            mock_create_result = {
                'id': 'new_folder_id',
                'name': 'ChordMe Backup',
                'mimeType': 'application/vnd.google-apps.folder'
            }
            mock_drive_service.files().create().execute.return_value = mock_create_result
            mock_build.return_value = mock_drive_service
            
            result = service._create_or_find_folder(mock_drive_service, "ChordMe Backup")
            
            assert result == 'new_folder_id'

    def test_sanitize_filename_edge_cases(self, app):
        """Test filename sanitization edge cases."""
        with app.app_context():
            service = GoogleDriveService()
            
            # Test empty filename
            result = service._sanitize_filename('')
            assert result == 'untitled'
            
            # Test filename with only invalid characters
            result = service._sanitize_filename('<>:"/\\|?*')
            assert result == 'untitled'
            
            # Test filename that becomes too short after sanitization
            result = service._sanitize_filename('a<>b')
            assert result == 'a_b'
            
            # Test filename with leading/trailing spaces
            result = service._sanitize_filename('  test.pro  ')
            assert result == 'test.pro'

    @patch('chordme.google_drive_service.current_app')
    @patch('chordme.google_drive_service.build')
    def test_backup_user_songs_with_data(self, mock_build, mock_app, app):
        """Test backup with actual song data."""
        with app.app_context():
            mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
            service = GoogleDriveService()
            
            # Mock Google Drive service
            mock_drive_service = MagicMock()
            
            # Mock folder creation/finding
            mock_drive_service.files().list().execute.return_value = {'files': []}
            mock_folder_result = {
                'id': 'backup_folder_id',
                'name': 'ChordMe Backup',
                'mimeType': 'application/vnd.google-apps.folder'
            }
            mock_drive_service.files().create().execute.return_value = mock_folder_result
            
            # Mock file uploads
            mock_file_results = [
                {
                    'id': 'file1_id',
                    'name': 'song1.pro',
                    'mimeType': 'text/plain',
                    'webViewLink': 'https://drive.google.com/file/d/file1_id/view'
                },
                {
                    'id': 'file2_id', 
                    'name': 'song2.pro',
                    'mimeType': 'text/plain',
                    'webViewLink': 'https://drive.google.com/file/d/file2_id/view'
                }
            ]
            
            mock_drive_service.files().create().execute.side_effect = [mock_folder_result] + mock_file_results
            mock_build.return_value = mock_drive_service
            
            user_songs = [
                {'title': 'Song 1', 'content': '{title: Song 1}\nContent 1'},
                {'title': 'Song 2', 'content': '{title: Song 2}\nContent 2'}
            ]
            
            result = service.backup_user_songs("valid_token", user_songs)
            
            assert result['success'] is True
            assert result['message'] == 'User songs backed up successfully'
            assert len(result['files']) == 2
            assert result['files'][0]['id'] == 'file1_id'
            assert result['files'][1]['id'] == 'file2_id'

    @patch('chordme.google_drive_service.current_app')
    @patch('chordme.google_drive_service.build')
    def test_error_handling_drive_api_failure(self, mock_build, mock_app, app):
        """Test error handling when Google Drive API fails."""
        with app.app_context():
            mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
            service = GoogleDriveService()
            
            # Mock Google Drive service to raise HttpError
            from googleapiclient.errors import HttpError
            mock_drive_service = MagicMock()
            mock_error_response = MagicMock()
            mock_error_response.status = 403
            mock_error_response.reason = 'Forbidden'
            mock_drive_service.files().get().execute.side_effect = HttpError(mock_error_response, b'Access denied')
            mock_build.return_value = mock_drive_service
            
            metadata, content = service._download_drive_file("valid_token", "file123")
            
            assert metadata is None
            assert content is None

    @patch('chordme.google_drive_service.current_app')
    @patch('chordme.google_drive_service.build')
    def test_batch_validate_with_mixed_results(self, mock_build, mock_app, app):
        """Test batch validation with mixed success/failure results."""
        with app.app_context():
            mock_app.config = {'GOOGLE_DRIVE_ENABLED': True}
            service = GoogleDriveService()
            
            # Mock ChordPro validation with mixed results
            with patch('chordme.chordpro_utils.validate_chordpro_content') as mock_validate:
                mock_validate.side_effect = [
                    {'valid': True, 'message': 'Valid content'},
                    {'valid': False, 'message': 'Invalid content', 'errors': ['Missing title']}
                ]
                
                # Mock Google Drive service
                mock_drive_service = MagicMock()
                mock_drive_service.files().get().execute.side_effect = [
                    {'id': 'file1', 'name': 'valid.pro', 'mimeType': 'text/plain'},
                    {'id': 'file2', 'name': 'invalid.pro', 'mimeType': 'text/plain'}
                ]
                mock_drive_service.files().get_media().execute.side_effect = [
                    b"{title: Valid Song}\nContent",
                    b"Invalid content without title"
                ]
                mock_build.return_value = mock_drive_service
                
                result = service.batch_validate_files("valid_token", ["file1", "file2"])
                
                assert result['success'] is True
                assert result['total'] == 2
                assert result['processed'] == 2
                assert result['results'][0]['success'] is True
                assert result['results'][1]['success'] is False