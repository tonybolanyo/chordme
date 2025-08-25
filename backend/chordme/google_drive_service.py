"""
Google Drive API service for server-side operations.

This service provides server-side Google Drive functionality that complements
the client-side Google OAuth integration. It's designed for scenarios requiring
server-side processing, validation, or enhanced security.
"""

import json
import logging
from typing import Dict, List, Optional, Any
from flask import current_app
from google.oauth2 import credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaInMemoryUpload

logger = logging.getLogger(__name__)


class GoogleDriveService:
    """
    Server-side Google Drive service for file operations and validation.
    
    This service is designed to work with user tokens obtained from the frontend
    Google OAuth flow, enabling server-side processing while maintaining security.
    """
    
    def __init__(self):
        # Don't initialize immediately - wait for app context
        self._enabled = None
    
    def _check_enabled(self):
        """Check if Google Drive is enabled, caching the result."""
        if self._enabled is None:
            self._enabled = getattr(current_app.config, 'GOOGLE_DRIVE_ENABLED', False)
            if not self._enabled:
                logger.info("Google Drive service is disabled")
        return self._enabled
    
    def is_enabled(self) -> bool:
        """Check if Google Drive integration is enabled."""
        return self._check_enabled()
    
    def _create_drive_service(self, access_token: str):
        """
        Create Google Drive service using an access token.
        
        Args:
            access_token: OAuth2 access token from frontend
            
        Returns:
            Google Drive service instance
            
        Raises:
            ValueError: If Google Drive is not enabled or token is invalid
        """
        if not self._check_enabled():
            raise ValueError("Google Drive service is not enabled")
        
        if not access_token:
            raise ValueError("Access token is required")
        
        # Create credentials from access token
        creds = credentials.Credentials(token=access_token)
        
        # Build the Google Drive service
        service = build('drive', 'v3', credentials=creds)
        return service
    
    def validate_chordpro_and_save(
        self, 
        access_token: str, 
        file_name: str, 
        content: str,
        parent_folder_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validate ChordPro content on server and save to Google Drive.
        
        This provides server-side validation before saving to Google Drive,
        ensuring content meets ChordPro standards.
        
        Args:
            access_token: OAuth2 access token
            file_name: Name for the file in Google Drive
            content: ChordPro content to validate and save
            parent_folder_id: Optional parent folder ID in Google Drive
            
        Returns:
            Dict containing validation results and file information
            
        Raises:
            ValueError: If validation fails or Google Drive operation fails
        """
        if not self._check_enabled():
            raise ValueError("Google Drive service is not enabled")
        
        # Import ChordPro validator (avoiding circular imports)
        from .chordpro_utils import validate_chordpro_content
        
        # Validate ChordPro content
        validation_result = validate_chordpro_content(content)
        
        if not validation_result.get('valid', False):
            return {
                'success': False,
                'validation': validation_result,
                'message': 'ChordPro validation failed'
            }
        
        try:
            # Create Google Drive service
            service = self._create_drive_service(access_token)
            
            # Prepare file metadata
            file_metadata = {'name': file_name}
            if parent_folder_id:
                file_metadata['parents'] = [parent_folder_id]
            
            # Create media upload
            media = MediaInMemoryUpload(
                content.encode('utf-8'),
                mimetype='text/plain',
                resumable=False
            )
            
            # Upload file to Google Drive
            file_result = service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id,name,mimeType,size,createdTime,modifiedTime,webViewLink'
            ).execute()
            
            logger.info(f"Successfully saved validated ChordPro file to Google Drive: {file_result.get('id')}")
            
            return {
                'success': True,
                'validation': validation_result,
                'file': file_result,
                'message': 'ChordPro content validated and saved successfully'
            }
            
        except HttpError as e:
            logger.error(f"Google Drive API error: {e}")
            return {
                'success': False,
                'validation': validation_result,
                'error': f"Google Drive error: {e.resp.reason}",
                'message': 'Failed to save to Google Drive'
            }
        except Exception as e:
            logger.error(f"Unexpected error in validate_chordpro_and_save: {e}")
            return {
                'success': False,
                'validation': validation_result,
                'error': str(e),
                'message': 'Unexpected error occurred'
            }
    
    def batch_validate_files(
        self, 
        access_token: str, 
        file_ids: List[str]
    ) -> Dict[str, Any]:
        """
        Validate multiple ChordPro files from Google Drive in batch.
        
        This is useful for validating multiple files at once without
        downloading them individually on the client side.
        
        Args:
            access_token: OAuth2 access token
            file_ids: List of Google Drive file IDs to validate
            
        Returns:
            Dict containing validation results for all files
        """
        if not self._check_enabled():
            raise ValueError("Google Drive service is not enabled")
        
        if not file_ids:
            return {'success': True, 'results': []}
        
        results = []
        
        try:
            # Import ChordPro validator
            from .chordpro_utils import validate_chordpro_content
            
            # Create Google Drive service
            service = self._create_drive_service(access_token)
            
            for file_id in file_ids:
                try:
                    # Get file metadata
                    file_metadata = service.files().get(
                        fileId=file_id,
                        fields='id,name,mimeType,size'
                    ).execute()
                    
                    # Download file content
                    content = service.files().get_media(fileId=file_id).execute()
                    content_str = content.decode('utf-8')
                    
                    # Validate content
                    validation_result = validate_chordpro_content(content_str)
                    
                    results.append({
                        'file_id': file_id,
                        'file_name': file_metadata.get('name'),
                        'file_size': file_metadata.get('size'),
                        'validation': validation_result,
                        'success': True
                    })
                    
                except HttpError as e:
                    logger.error(f"Error processing file {file_id}: {e}")
                    results.append({
                        'file_id': file_id,
                        'error': f"Google Drive error: {e.resp.reason}",
                        'success': False
                    })
                except Exception as e:
                    logger.error(f"Error validating file {file_id}: {e}")
                    results.append({
                        'file_id': file_id,
                        'error': str(e),
                        'success': False
                    })
            
            return {
                'success': True,
                'results': results,
                'total': len(file_ids),
                'processed': len(results)
            }
            
        except Exception as e:
            logger.error(f"Batch validation failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Batch validation failed'
            }
    
    def backup_user_songs(
        self, 
        access_token: str, 
        user_songs: List[Dict[str, Any]],
        backup_folder_name: str = "ChordMe Backup"
    ) -> Dict[str, Any]:
        """
        Backup user songs to Google Drive in a dedicated folder.
        
        This creates a backup of all user songs in ChordPro format,
        organized in a dedicated backup folder.
        
        Args:
            access_token: OAuth2 access token
            user_songs: List of song dictionaries with title and content
            backup_folder_name: Name of the backup folder
            
        Returns:
            Dict containing backup results
        """
        if not self._check_enabled():
            raise ValueError("Google Drive service is not enabled")
        
        if not user_songs:
            return {'success': True, 'message': 'No songs to backup', 'files': []}
        
        try:
            # Create Google Drive service
            service = self._create_drive_service(access_token)
            
            # Create or find backup folder
            folder_id = self._create_or_find_folder(service, backup_folder_name)
            
            backed_up_files = []
            
            for song in user_songs:
                try:
                    title = song.get('title', 'Untitled')
                    content = song.get('content', '')
                    
                    # Sanitize filename
                    safe_filename = self._sanitize_filename(f"{title}.pro")
                    
                    # Create file metadata
                    file_metadata = {
                        'name': safe_filename,
                        'parents': [folder_id]
                    }
                    
                    # Create media upload
                    media = MediaInMemoryUpload(
                        content.encode('utf-8'),
                        mimetype='text/plain',
                        resumable=False
                    )
                    
                    # Upload file
                    file_result = service.files().create(
                        body=file_metadata,
                        media_body=media,
                        fields='id,name,webViewLink'
                    ).execute()
                    
                    backed_up_files.append({
                        'song_id': song.get('id'),
                        'song_title': title,
                        'drive_file_id': file_result.get('id'),
                        'drive_file_name': file_result.get('name'),
                        'drive_link': file_result.get('webViewLink')
                    })
                    
                except Exception as e:
                    logger.error(f"Failed to backup song '{song.get('title', 'Unknown')}': {e}")
                    # Continue with other songs
            
            return {
                'success': True,
                'folder_id': folder_id,
                'folder_name': backup_folder_name,
                'files': backed_up_files,
                'total_songs': len(user_songs),
                'backed_up': len(backed_up_files)
            }
            
        except Exception as e:
            logger.error(f"Backup operation failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Backup operation failed'
            }
    
    def _create_or_find_folder(self, service, folder_name: str) -> str:
        """
        Create or find a folder in Google Drive.
        
        Args:
            service: Google Drive service instance
            folder_name: Name of the folder to create or find
            
        Returns:
            Folder ID
        """
        # Search for existing folder
        query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        results = service.files().list(q=query, fields='files(id, name)').execute()
        
        folders = results.get('files', [])
        
        if folders:
            # Use existing folder
            return folders[0]['id']
        else:
            # Create new folder
            folder_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder'
            }
            folder = service.files().create(body=folder_metadata, fields='id').execute()
            return folder.get('id')
    
    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename for Google Drive.
        
        Args:
            filename: Original filename
            
        Returns:
            Sanitized filename safe for Google Drive
        """
        import re
        # Remove or replace invalid characters
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Limit length
        if len(filename) > 100:
            name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
            filename = name[:95] + ('.' + ext if ext else '')
        return filename

    def _list_drive_files(self, access_token: str, query: str = None, max_results: int = 100) -> List[Dict[str, Any]]:
        """
        List files from Google Drive.
        
        Args:
            access_token: OAuth2 access token
            query: Optional search query
            max_results: Maximum number of results to return
            
        Returns:
            List of file metadata dictionaries
            
        Raises:
            ValueError: If API error occurs
        """
        try:
            service = self._create_drive_service(access_token)
            
            request_params = {
                'pageSize': min(max_results, 1000),
                'fields': 'files(id,name,mimeType,size,modifiedTime,createdTime,webViewLink)'
            }
            
            if query:
                request_params['q'] = query
            
            result = service.files().list(**request_params).execute()
            return result.get('files', [])
            
        except HttpError as e:
            if e.resp.status == 401:
                raise ValueError("Invalid or expired access token")
            else:
                raise ValueError(f"Google Drive API error: {e.resp.reason}")
        except Exception as e:
            raise ValueError(f"Failed to list files: {str(e)}")

    def _download_drive_file(self, access_token: str, file_id: str) -> tuple[Dict[str, Any], str]:
        """
        Download file from Google Drive.
        
        Args:
            access_token: OAuth2 access token
            file_id: Google Drive file ID
            
        Returns:
            Tuple of (file_metadata, file_content)
            
        Raises:
            ValueError: If file not found or API error occurs
        """
        try:
            service = self._create_drive_service(access_token)
            
            # Get file metadata
            metadata = service.files().get(
                fileId=file_id,
                fields='id,name,mimeType,size,modifiedTime,createdTime'
            ).execute()
            
            # Download file content
            content_bytes = service.files().get_media(fileId=file_id).execute()
            content = content_bytes.decode('utf-8')
            
            return metadata, content
            
        except HttpError as e:
            if e.resp.status == 404:
                raise ValueError("File not found")
            elif e.resp.status == 401:
                raise ValueError("Invalid or expired access token")
            else:
                raise ValueError(f"Google Drive API error: {e.resp.reason}")
        except Exception as e:
            raise ValueError(f"Failed to download file: {str(e)}")

    def _upload_to_drive(self, access_token: str, filename: str, content: str, parent_folder_id: str = None) -> Dict[str, Any]:
        """
        Upload file to Google Drive.
        
        Args:
            access_token: OAuth2 access token
            filename: Name for the uploaded file
            content: File content
            parent_folder_id: Optional parent folder ID
            
        Returns:
            File metadata dictionary
            
        Raises:
            ValueError: If upload fails or API error occurs
        """
        try:
            service = self._create_drive_service(access_token)
            
            # Prepare file metadata
            file_metadata = {'name': filename}
            if parent_folder_id:
                file_metadata['parents'] = [parent_folder_id]
            
            # Create media upload
            media = MediaInMemoryUpload(
                content.encode('utf-8'),
                mimetype='text/plain',
                resumable=False
            )
            
            # Upload file
            result = service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id,name,mimeType,size,createdTime,modifiedTime,webViewLink'
            ).execute()
            
            return result
            
        except HttpError as e:
            # Check for storage quota exceeded using status code and error code
            if e.resp.status == 403:
                try:
                    error_details = json.loads(e.content.decode('utf-8'))
                    errors = error_details.get('error', {}).get('errors', [])
                    for error in errors:
                        if error.get('reason') == 'storageQuotaExceeded':
                            raise ValueError("Google Drive storage quota exceeded")
                except Exception:
                    pass  # Fall through to generic error handling
            if e.resp.status == 401:
                raise ValueError("Invalid or expired access token")
            else:
                raise ValueError(f"Google Drive API error: {e.resp.reason}")
        except Exception as e:
            raise ValueError(f"Failed to upload file: {str(e)}")

    def _create_drive_folder(self, access_token: str, folder_name: str, parent_folder_id: str = None) -> Dict[str, Any]:
        """
        Create folder in Google Drive.
        
        Args:
            access_token: OAuth2 access token
            folder_name: Name for the new folder
            parent_folder_id: Optional parent folder ID
            
        Returns:
            Folder metadata dictionary
            
        Raises:
            ValueError: If creation fails or API error occurs
        """
        try:
            service = self._create_drive_service(access_token)
            
            # Prepare folder metadata
            folder_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder'
            }
            if parent_folder_id:
                folder_metadata['parents'] = [parent_folder_id]
            
            # Create folder
            result = service.files().create(
                body=folder_metadata,
                fields='id,name,mimeType,createdTime,modifiedTime'
            ).execute()
            
            return result
            
        except HttpError as e:
            if e.resp.status == 401:
                raise ValueError("Invalid or expired access token")
            else:
                raise ValueError(f"Google Drive API error: {e.resp.reason}")
        except Exception as e:
            raise ValueError(f"Failed to create folder: {str(e)}")

    def _update_drive_file(self, access_token: str, file_id: str, content: str) -> Dict[str, Any]:
        """
        Update existing file in Google Drive.
        
        Args:
            access_token: OAuth2 access token
            file_id: Google Drive file ID to update
            content: New file content
            
        Returns:
            Updated file metadata dictionary
            
        Raises:
            ValueError: If update fails or API error occurs
        """
        try:
            service = self._create_drive_service(access_token)
            
            # Create media upload
            media = MediaInMemoryUpload(
                content.encode('utf-8'),
                mimetype='text/plain',
                resumable=False
            )
            
            # Update file
            result = service.files().update(
                fileId=file_id,
                media_body=media,
                fields='id,name,mimeType,size,modifiedTime'
            ).execute()
            
            return result
            
        except HttpError as e:
            if e.resp.status == 404:
                raise ValueError("File not found")
            elif e.resp.status == 401:
                raise ValueError("Invalid or expired access token")
            else:
                raise ValueError(f"Google Drive API error: {e.resp.reason}")
        except Exception as e:
            raise ValueError(f"Failed to update file: {str(e)}")

    def _delete_drive_file(self, access_token: str, file_id: str) -> bool:
        """
        Delete file from Google Drive.
        
        Args:
            access_token: OAuth2 access token
            file_id: Google Drive file ID to delete
            
        Returns:
            True if deletion successful
            
        Raises:
            ValueError: If deletion fails or API error occurs
        """
        try:
            service = self._create_drive_service(access_token)
            
            # Delete file
            service.files().delete(fileId=file_id).execute()
            return True
            
        except HttpError as e:
            if e.resp.status == 404:
                raise ValueError("File not found")
            elif e.resp.status == 401:
                raise ValueError("Invalid or expired access token")
            else:
                raise ValueError(f"Google Drive API error: {e.resp.reason}")
        except Exception as e:
            raise ValueError(f"Failed to delete file: {str(e)}")

    def _get_file_permissions(self, access_token: str, file_id: str) -> Dict[str, Any]:
        """
        Get file permissions from Google Drive.
        
        Args:
            access_token: OAuth2 access token
            file_id: Google Drive file ID
            
        Returns:
            Permissions metadata dictionary
            
        Raises:
            ValueError: If API error occurs
        """
        try:
            service = self._create_drive_service(access_token)
            
            # Get permissions
            result = service.permissions().list(
                fileId=file_id,
                fields='permissions(id,type,role,emailAddress)'
            ).execute()
            
            return result
            
        except HttpError as e:
            if e.resp.status == 404:
                raise ValueError("File not found")
            elif e.resp.status == 401:
                raise ValueError("Invalid or expired access token")
            else:
                raise ValueError(f"Google Drive API error: {e.resp.reason}")
        except Exception as e:
            raise ValueError(f"Failed to get permissions: {str(e)}")


# Global service instance
google_drive_service = GoogleDriveService()