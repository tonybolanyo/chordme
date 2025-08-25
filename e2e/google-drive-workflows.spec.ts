import { test, expect } from '@playwright/test';

// Mock Google Drive API responses
const mockDriveFiles = [
  {
    id: 'file1',
    name: 'Amazing Grace.pro',
    mimeType: 'text/plain',
    size: '250',
    modifiedTime: '2023-01-01T00:00:00Z',
    webViewLink: 'https://drive.google.com/file/d/file1/view'
  },
  {
    id: 'file2', 
    name: 'How Great Thou Art.pro',
    mimeType: 'text/plain',
    size: '300',
    modifiedTime: '2023-01-02T00:00:00Z',
    webViewLink: 'https://drive.google.com/file/d/file2/view'
  }
];

const mockChordProContent = `{title: Amazing Grace}
{artist: John Newton}
{key: G}

[G]Amazing [C]grace how [G]sweet the sound
That [D]saved a [G]wretch like me
[G]I once was [C]lost but [G]now am found
Was [D]blind but [G]now I see`;

test.describe('Google Drive Import Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Mock Google OAuth and Drive APIs
    await page.route('**/oauth2.googleapis.com/token', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'openid email profile https://www.googleapis.com/auth/drive.file'
        })
      });
    });

    await page.route('**/www.googleapis.com/oauth2/v2/userinfo', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-123',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg'
        })
      });
    });

    await page.route('**/www.googleapis.com/drive/v3/files*', async route => {
      const url = route.request().url();
      
      if (url.includes('q=')) {
        // File listing request
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            files: mockDriveFiles,
            nextPageToken: null
          })
        });
      } else if (url.includes('/files/file1')) {
        // Specific file metadata request
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockDriveFiles[0])
        });
      }
    });

    await page.route('**/www.googleapis.com/drive/v3/files/file1*', async route => {
      if (route.request().url().includes('alt=media')) {
        // File content download
        await route.fulfill({
          status: 200,
          contentType: 'text/plain',
          body: mockChordProContent
        });
      }
    });

    // Mock backend API endpoints
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            token: 'mock-jwt-token',
            user: { id: 1, email: 'test@example.com' }
          }
        })
      });
    });

    await page.route('**/api/v1/google-drive/validate-and-save', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            success: true,
            validation: { valid: true, message: 'Valid ChordPro content' },
            file: {
              id: 'new-file-id',
              name: 'imported-song.pro',
              webViewLink: 'https://drive.google.com/file/d/new-file-id/view'
            }
          }
        })
      });
    });
  });

  test('should complete Google Drive import workflow with file picker', async ({ page }) => {
    // Step 1: Authenticate with Google
    await page.click('[data-testid="google-signin-button"]');
    
    // Mock the Google OAuth redirect flow
    await page.evaluate(() => {
      window.localStorage.setItem('googleTokens', JSON.stringify({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'openid email profile https://www.googleapis.com/auth/drive.file'
      }));
      window.localStorage.setItem('googleUserInfo', JSON.stringify({
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User'
      }));
    });

    // Refresh to pick up authentication
    await page.reload();

    // Step 2: Navigate to import section
    await page.click('[data-testid="import-button"]');
    await page.click('[data-testid="import-from-drive"]');

    // Step 3: Open Drive file picker
    await page.click('[data-testid="browse-drive-files"]');

    // Wait for file list to load
    await page.waitForSelector('[data-testid="drive-file-list"]');

    // Step 4: Verify files are displayed
    await expect(page.locator('[data-testid="drive-file-item"]')).toHaveCount(2);
    await expect(page.locator('text=Amazing Grace.pro')).toBeVisible();
    await expect(page.locator('text=How Great Thou Art.pro')).toBeVisible();

    // Step 5: Select a file
    await page.click('[data-testid="drive-file-item"]:has-text("Amazing Grace.pro")');
    await page.click('[data-testid="select-file-button"]');

    // Step 6: Wait for file content to load and preview
    await page.waitForSelector('[data-testid="import-preview"]');
    
    // Verify content preview
    await expect(page.locator('[data-testid="import-preview"]')).toContainText('Amazing grace how sweet the sound');
    await expect(page.locator('[data-testid="chord-display"]')).toContainText('[G]');
    await expect(page.locator('[data-testid="chord-display"]')).toContainText('[C]');

    // Step 7: Confirm import
    await page.click('[data-testid="confirm-import-button"]');

    // Step 8: Verify import success
    await page.waitForSelector('[data-testid="import-success-message"]');
    await expect(page.locator('[data-testid="import-success-message"]')).toContainText('Successfully imported');

    // Step 9: Verify content is rendered in editor
    await expect(page.locator('[data-testid="song-editor"]')).toContainText('Amazing Grace');
    await expect(page.locator('[data-testid="chord-preview"]')).toContainText('Amazing grace how sweet the sound');
  });

  test('should handle Drive import with invalid ChordPro file', async ({ page }) => {
    // Mock invalid ChordPro content
    await page.route('**/www.googleapis.com/drive/v3/files/file2*', async route => {
      if (route.request().url().includes('alt=media')) {
        await route.fulfill({
          status: 200,
          contentType: 'text/plain',
          body: 'This is not valid ChordPro content'
        });
      }
    });

    // Mock validation endpoint to return validation errors
    await page.route('**/api/v1/google-drive/validate-and-save', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            success: false,
            validation: { 
              valid: false, 
              message: 'Invalid ChordPro content',
              errors: ['No ChordPro directives found', 'Missing title directive']
            }
          }
        })
      });
    });

    // Authenticate first
    await page.evaluate(() => {
      window.localStorage.setItem('googleTokens', JSON.stringify({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'openid email profile https://www.googleapis.com/auth/drive.file'
      }));
    });

    await page.reload();

    // Navigate to import
    await page.click('[data-testid="import-button"]');
    await page.click('[data-testid="import-from-drive"]');
    await page.click('[data-testid="browse-drive-files"]');

    // Select invalid file
    await page.click('[data-testid="drive-file-item"]:has-text("How Great Thou Art.pro")');
    await page.click('[data-testid="select-file-button"]');

    // Wait for validation error
    await page.waitForSelector('[data-testid="validation-error"]');
    
    // Verify error display
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Invalid ChordPro content');
    await expect(page.locator('[data-testid="validation-errors-list"]')).toContainText('No ChordPro directives found');
    
    // Verify import button is disabled
    await expect(page.locator('[data-testid="confirm-import-button"]')).toBeDisabled();
  });

  test('should handle Drive API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/www.googleapis.com/drive/v3/files*', async route => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 403,
            message: 'The user does not have sufficient permissions for this file.'
          }
        })
      });
    });

    // Authenticate first
    await page.evaluate(() => {
      window.localStorage.setItem('googleTokens', JSON.stringify({
        access_token: 'mock-access-token',
        expires_at: Date.now() + 3600000
      }));
    });

    await page.reload();

    // Try to import
    await page.click('[data-testid="import-button"]');
    await page.click('[data-testid="import-from-drive"]');
    await page.click('[data-testid="browse-drive-files"]');

    // Wait for error message
    await page.waitForSelector('[data-testid="drive-error-message"]');
    
    // Verify error handling
    await expect(page.locator('[data-testid="drive-error-message"]')).toContainText('insufficient permissions');
  });

  test('should handle authentication expiration during import', async ({ page }) => {
    // Set up expired token
    await page.evaluate(() => {
      window.localStorage.setItem('googleTokens', JSON.stringify({
        access_token: 'expired-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        expires_at: Date.now() - 1000, // Already expired
        token_type: 'Bearer',
        scope: 'openid email profile https://www.googleapis.com/auth/drive.file'
      }));
    });

    // Mock token refresh failure
    await page.route('**/oauth2.googleapis.com/token', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Token has been expired or revoked.'
        })
      });
    });

    await page.reload();

    // Try to import
    await page.click('[data-testid="import-button"]');
    await page.click('[data-testid="import-from-drive"]');
    await page.click('[data-testid="browse-drive-files"]');

    // Should redirect to authentication
    await page.waitForSelector('[data-testid="auth-required-message"]');
    await expect(page.locator('[data-testid="auth-required-message"]')).toContainText('Please sign in');
  });
});

test.describe('Google Drive Export Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Set up authenticated state
    await page.evaluate(() => {
      window.localStorage.setItem('googleTokens', JSON.stringify({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'openid email profile https://www.googleapis.com/auth/drive.file'
      }));
      window.localStorage.setItem('googleUserInfo', JSON.stringify({
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User'
      }));
    });

    // Mock export API
    await page.route('**/api/v1/google-drive/validate-and-save', async route => {
      const requestBody = await route.request().postDataJSON();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            success: true,
            validation: { valid: true, message: 'Valid ChordPro content' },
            file: {
              id: `exported-${Date.now()}`,
              name: requestBody.file_name,
              size: requestBody.content.length.toString(),
              webViewLink: `https://drive.google.com/file/d/exported-${Date.now()}/view`,
              createdTime: new Date().toISOString()
            },
            message: 'ChordPro content validated and saved successfully'
          }
        })
      });
    });

    await page.reload();
  });

  test('should complete Google Drive export workflow', async ({ page }) => {
    // Step 1: Create or open a song in the editor
    await page.click('[data-testid="new-song-button"]');
    
    // Step 2: Add some content to the editor
    const songContent = `{title: Test Export Song}
{artist: Test Artist}
{key: C}

[C]This is a [G]test song for [Am]export to [F]Drive
[C]We want to [G]make sure it [Am]works just [F]fine`;

    await page.fill('[data-testid="song-editor"]', songContent);

    // Step 3: Open export dialog
    await page.click('[data-testid="export-button"]');
    await page.click('[data-testid="export-to-drive"]');

    // Step 4: Verify export dialog is open
    await page.waitForSelector('[data-testid="export-to-drive-dialog"]');
    await expect(page.locator('[data-testid="export-to-drive-dialog"]')).toBeVisible();

    // Step 5: Verify content preview in export dialog
    await expect(page.locator('[data-testid="export-preview"]')).toContainText('Test Export Song');
    await expect(page.locator('[data-testid="export-preview"]')).toContainText('This is a test song');

    // Step 6: Set filename
    await page.fill('[data-testid="export-filename-input"]', 'my-exported-song.pro');

    // Step 7: Start export
    await page.click('[data-testid="start-export-button"]');

    // Step 8: Wait for export to complete
    await page.waitForSelector('[data-testid="export-success-message"]');

    // Step 9: Verify export success
    await expect(page.locator('[data-testid="export-success-message"]')).toContainText('Successfully exported');
    await expect(page.locator('[data-testid="drive-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="drive-link"]')).toHaveAttribute('href', /drive\.google\.com/);

    // Step 10: Verify file metadata display
    await expect(page.locator('[data-testid="exported-file-name"]')).toContainText('my-exported-song.pro');
    await expect(page.locator('[data-testid="exported-file-size"]')).toContainText(songContent.length.toString());
  });

  test('should validate content before export', async ({ page }) => {
    // Mock validation failure
    await page.route('**/api/v1/google-drive/validate-and-save', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            success: false,
            validation: { 
              valid: false, 
              message: 'Invalid ChordPro content',
              errors: ['Missing title directive', 'Invalid chord syntax']
            },
            message: 'ChordPro validation failed'
          }
        })
      });
    });

    // Add invalid content
    await page.click('[data-testid="new-song-button"]');
    await page.fill('[data-testid="song-editor"]', 'Invalid content without proper ChordPro format');

    // Try to export
    await page.click('[data-testid="export-button"]');
    await page.click('[data-testid="export-to-drive"]');
    
    await page.fill('[data-testid="export-filename-input"]', 'invalid-song.pro');
    await page.click('[data-testid="start-export-button"]');

    // Wait for validation error
    await page.waitForSelector('[data-testid="export-validation-error"]');
    
    // Verify error display
    await expect(page.locator('[data-testid="export-validation-error"]')).toContainText('Invalid ChordPro content');
    await expect(page.locator('[data-testid="validation-errors-list"]')).toContainText('Missing title directive');
    
    // Verify export was not completed
    await expect(page.locator('[data-testid="export-success-message"]')).not.toBeVisible();
  });

  test('should handle Drive storage quota exceeded', async ({ page }) => {
    // Mock quota exceeded error
    await page.route('**/api/v1/google-drive/validate-and-save', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          error: 'Google Drive storage quota exceeded'
        })
      });
    });

    // Create content and try to export
    await page.click('[data-testid="new-song-button"]');
    await page.fill('[data-testid="song-editor"]', '{title: Test}\nSome content');

    await page.click('[data-testid="export-button"]');
    await page.click('[data-testid="export-to-drive"]');
    
    await page.fill('[data-testid="export-filename-input"]', 'test-song.pro');
    await page.click('[data-testid="start-export-button"]');

    // Wait for quota error
    await page.waitForSelector('[data-testid="export-error-message"]');
    
    // Verify error handling
    await expect(page.locator('[data-testid="export-error-message"]')).toContainText('storage quota exceeded');
  });

  test('should handle network errors during export', async ({ page }) => {
    // Mock network error
    await page.route('**/api/v1/google-drive/validate-and-save', async route => {
      await route.abort('failed');
    });

    // Create content and try to export
    await page.click('[data-testid="new-song-button"]');
    await page.fill('[data-testid="song-editor"]', '{title: Test}\nSome content');

    await page.click('[data-testid="export-button"]');
    await page.click('[data-testid="export-to-drive"]');
    
    await page.fill('[data-testid="export-filename-input"]', 'test-song.pro');
    await page.click('[data-testid="start-export-button"]');

    // Wait for network error
    await page.waitForSelector('[data-testid="export-error-message"]');
    
    // Verify error handling
    await expect(page.locator('[data-testid="export-error-message"]')).toContainText('network error');
  });

  test('should allow retry after export failure', async ({ page }) => {
    let callCount = 0;
    
    // Mock failure then success
    await page.route('**/api/v1/google-drive/validate-and-save', async route => {
      callCount++;
      
      if (callCount === 1) {
        // First call fails
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'error',
            error: 'Temporary server error'
          })
        });
      } else {
        // Second call succeeds
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              success: true,
              validation: { valid: true },
              file: {
                id: 'retry-success-id',
                name: 'retry-song.pro',
                webViewLink: 'https://drive.google.com/file/d/retry-success-id/view'
              }
            }
          })
        });
      }
    });

    // Create content
    await page.click('[data-testid="new-song-button"]');
    await page.fill('[data-testid="song-editor"]', '{title: Retry Test}\nSome content');

    // First export attempt
    await page.click('[data-testid="export-button"]');
    await page.click('[data-testid="export-to-drive"]');
    
    await page.fill('[data-testid="export-filename-input"]', 'retry-song.pro');
    await page.click('[data-testid="start-export-button"]');

    // Wait for error and retry button
    await page.waitForSelector('[data-testid="export-retry-button"]');
    
    // Click retry
    await page.click('[data-testid="export-retry-button"]');

    // Wait for success
    await page.waitForSelector('[data-testid="export-success-message"]');
    await expect(page.locator('[data-testid="export-success-message"]')).toContainText('Successfully exported');
  });
});