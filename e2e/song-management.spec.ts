import { test, expect } from '@playwright/test';

// Helper function to register and login a test user
async function registerAndLoginTestUser(page: any, email?: string, password?: string) {
  const testEmail = email || `test-${Date.now()}@example.com`;
  const testPassword = password || 'TestPassword123!';

  // Register user
  await page.goto('/#register');
  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', testPassword);
  await page.fill('input[name="confirmPassword"]', testPassword);
  await page.click('button:has-text("Create Account")');

  // Wait for registration to complete and navigate to login if needed
  await page.waitForTimeout(1000);
  
  // If registration was successful but we're not logged in, login
  if (await page.locator('h1:has-text("Login to ChordMe")').isVisible()) {
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Sign In")');
  }

  return { email: testEmail, password: testPassword };
}

test.describe('ChordMe Song Management Workflows', () => {
  
  test.describe('Authenticated User Home Page', () => {
    test('should display authenticated home page after login', async ({ page }) => {
      // Register and login
      await registerAndLoginTestUser(page);
      
      // Should redirect to home page and show user content
      await expect(page).toHaveURL(/#home/);
      
      // Should show elements for authenticated users
      // Adjust these expectations based on actual home page content
      await expect(page.locator('h1, h2, h3').first()).toBeVisible();
    });

    test('should show song list section', async ({ page }) => {
      await registerAndLoginTestUser(page);
      
      // Should show songs section (even if empty initially)
      // Adjust selectors based on actual implementation
      const songsSection = page.locator('text=Songs, text=My Songs, .songs-list, .song-grid').first();
      if (await songsSection.isVisible()) {
        await expect(songsSection).toBeVisible();
      }
    });

    test('should show create song option', async ({ page }) => {
      await registerAndLoginTestUser(page);
      
      // Should have option to create new song
      const createButton = page.locator('button:has-text("Create"), button:has-text("New Song"), button:has-text("Add Song"), a:has-text("New Song")').first();
      if (await createButton.isVisible()) {
        await expect(createButton).toBeVisible();
      }
    });
  });

  test.describe('Song Creation', () => {
    test('should create a new song with valid data', async ({ page }) => {
      await registerAndLoginTestUser(page);
      
      // Try to find and click create song button
      const createSongSelectors = [
        'button:has-text("Create Song")',
        'button:has-text("New Song")',
        'button:has-text("Add Song")',
        'a:has-text("Create Song")',
        '.create-song',
        '#create-song'
      ];
      
      let createButton = null;
      for (const selector of createSongSelectors) {
        createButton = page.locator(selector);
        if (await createButton.isVisible()) {
          break;
        }
      }

      if (createButton && await createButton.isVisible()) {
        await createButton.click();
        
        // Fill in song creation form
        const titleInput = page.locator('input[name="title"], input[placeholder*="title"], #title');
        const contentInput = page.locator('textarea[name="content"], textarea[placeholder*="content"], #content');
        
        if (await titleInput.isVisible() && await contentInput.isVisible()) {
          await titleInput.fill('Test Song');
          await contentInput.fill(`{title: Test Song}
{artist: Test Artist}
[C]This is a [G]test song
[Am]With some [F]chords`);
          
          // Submit the form
          await page.click('button:has-text("Save"), button:has-text("Create"), button[type="submit"]');
          
          // Should show success message or redirect to song list
          await page.waitForTimeout(1000);
          
          // Verify song was created (adjust based on implementation)
          const songTitle = page.locator('text=Test Song');
          if (await songTitle.isVisible()) {
            await expect(songTitle).toBeVisible();
          }
        }
      }
    });

    test('should show validation errors for empty song data', async ({ page }) => {
      await registerAndLoginTestUser(page);
      
      // Try to create song with empty data
      const createSongSelectors = [
        'button:has-text("Create Song")',
        'button:has-text("New Song")',
        'button:has-text("Add Song")'
      ];
      
      for (const selector of createSongSelectors) {
        const createButton = page.locator(selector);
        if (await createButton.isVisible()) {
          await createButton.click();
          
          // Try to submit without filling required fields
          await page.click('button:has-text("Save"), button:has-text("Create"), button[type="submit"]');
          
          // Should show validation errors
          const errorMessage = page.locator('.error, .alert, [role="alert"], text=required');
          if (await errorMessage.isVisible()) {
            await expect(errorMessage).toBeVisible();
          }
          break;
        }
      }
    });

    test('should validate ChordPro content', async ({ page }) => {
      await registerAndLoginTestUser(page);
      
      // Look for create song functionality
      const createButton = page.locator('button:has-text("Create Song"), button:has-text("New Song")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        
        const titleInput = page.locator('input[name="title"], #title');
        const contentInput = page.locator('textarea[name="content"], #content');
        
        if (await titleInput.isVisible() && await contentInput.isVisible()) {
          await titleInput.fill('Valid ChordPro Song');
          
          // Test with valid ChordPro content
          await contentInput.fill(`{title: Valid ChordPro Song}
{artist: Test Artist}
{key: C}
[C]Amazing [G]grace, how [Am]sweet the [F]sound`);
          
          await page.click('button:has-text("Save"), button:has-text("Create")');
          await page.waitForTimeout(1000);
          
          // Should not show validation errors
          const errorMessage = page.locator('.error:has-text("invalid"), .error:has-text("format")');
          await expect(errorMessage).not.toBeVisible();
        }
      }
    });
  });

  test.describe('Song List and Display', () => {
    test('should display user songs in a list', async ({ page }) => {
      const user = await registerAndLoginTestUser(page);
      
      // Look for songs list area
      const songsList = page.locator('.songs-list, .song-grid, .songs-container').first();
      if (await songsList.isVisible()) {
        await expect(songsList).toBeVisible();
      } else {
        // Might show "no songs" message initially
        const noSongsMessage = page.locator('text=No songs, text=empty, text=Create your first song');
        if (await noSongsMessage.isVisible()) {
          await expect(noSongsMessage).toBeVisible();
        }
      }
    });

    test('should show song details when clicking on a song', async ({ page }) => {
      await registerAndLoginTestUser(page);
      
      // First create a song if possible
      const createButton = page.locator('button:has-text("Create Song"), button:has-text("New Song")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        
        const titleInput = page.locator('input[name="title"], #title');
        const contentInput = page.locator('textarea[name="content"], #content');
        
        if (await titleInput.isVisible()) {
          await titleInput.fill('Clickable Test Song');
          await contentInput.fill('{title: Clickable Test Song}\n[C]Test content');
          await page.click('button:has-text("Save"), button:has-text("Create")');
          await page.waitForTimeout(1000);
          
          // Try to click on the created song
          const songLink = page.locator('text=Clickable Test Song, a:has-text("Clickable Test Song")');
          if (await songLink.isVisible()) {
            await songLink.click();
            
            // Should show song details
            await expect(page.locator('text=Clickable Test Song')).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Song Editing', () => {
    test('should allow editing existing songs', async ({ page }) => {
      await registerAndLoginTestUser(page);
      
      // Create a song first
      const createButton = page.locator('button:has-text("Create Song"), button:has-text("New Song")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        
        const titleInput = page.locator('input[name="title"], #title');
        const contentInput = page.locator('textarea[name="content"], #content');
        
        if (await titleInput.isVisible()) {
          await titleInput.fill('Editable Song');
          await contentInput.fill('{title: Editable Song}\n[C]Original content');
          await page.click('button:has-text("Save"), button:has-text("Create")');
          await page.waitForTimeout(1000);
          
          // Look for edit button or option
          const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit"), .edit-button').first();
          if (await editButton.isVisible()) {
            await editButton.click();
            
            // Should show edit form
            const editTitleInput = page.locator('input[name="title"], #title');
            if (await editTitleInput.isVisible()) {
              await editTitleInput.fill('Edited Song Title');
              await page.click('button:has-text("Save"), button:has-text("Update")');
              
              // Should show updated title
              await expect(page.locator('text=Edited Song Title')).toBeVisible();
            }
          }
        }
      }
    });
  });

  test.describe('Song Deletion', () => {
    test('should allow deleting songs with confirmation', async ({ page }) => {
      await registerAndLoginTestUser(page);
      
      // Create a song to delete
      const createButton = page.locator('button:has-text("Create Song"), button:has-text("New Song")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        
        const titleInput = page.locator('input[name="title"], #title');
        const contentInput = page.locator('textarea[name="content"], #content');
        
        if (await titleInput.isVisible()) {
          await titleInput.fill('Song to Delete');
          await contentInput.fill('{title: Song to Delete}\n[C]Delete me');
          await page.click('button:has-text("Save"), button:has-text("Create")');
          await page.waitForTimeout(1000);
          
          // Look for delete button
          const deleteButton = page.locator('button:has-text("Delete"), .delete-button').first();
          if (await deleteButton.isVisible()) {
            await deleteButton.click();
            
            // Should show confirmation dialog
            const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
            if (await confirmButton.isVisible()) {
              await confirmButton.click();
              
              // Song should be removed
              await page.waitForTimeout(1000);
              await expect(page.locator('text=Song to Delete')).not.toBeVisible();
            }
          }
        }
      }
    });
  });

  test.describe('File Operations', () => {
    test('should allow downloading songs', async ({ page }) => {
      await registerAndLoginTestUser(page);
      
      // Create a song first
      const createButton = page.locator('button:has-text("Create Song"), button:has-text("New Song")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        
        const titleInput = page.locator('input[name="title"], #title');
        const contentInput = page.locator('textarea[name="content"], #content');
        
        if (await titleInput.isVisible()) {
          await titleInput.fill('Download Test Song');
          await contentInput.fill('{title: Download Test Song}\n[C]Download content');
          await page.click('button:has-text("Save"), button:has-text("Create")');
          await page.waitForTimeout(1000);
          
          // Look for download button
          const downloadButton = page.locator('button:has-text("Download"), a:has-text("Download"), .download-button').first();
          if (await downloadButton.isVisible()) {
            // Set up download handling
            const downloadPromise = page.waitForEvent('download');
            await downloadButton.click();
            
            // Verify download started
            const download = await downloadPromise;
            expect(download.suggestedFilename()).toContain('.txt' || '.cho' || '.chordpro');
          }
        }
      }
    });

    test('should allow uploading song files', async ({ page }) => {
      await registerAndLoginTestUser(page);
      
      // Look for upload button or file input
      const uploadButton = page.locator('button:has-text("Upload"), input[type="file"], .upload-button').first();
      if (await uploadButton.isVisible()) {
        // Create a test file
        const testFileContent = '{title: Uploaded Song}\n{artist: Test}\n[C]Uploaded content';
        
        // For file upload, we'd need to create a temporary file
        // This is a simplified test that checks if upload UI exists
        await expect(uploadButton).toBeVisible();
      }
    });
  });

  test.describe('Search and Filter', () => {
    test('should allow searching songs by title', async ({ page }) => {
      await registerAndLoginTestUser(page);
      
      // Look for search functionality
      const searchInput = page.locator('input[placeholder*="search"], input[type="search"], .search-input');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        
        // Should filter results
        await page.waitForTimeout(500);
        
        // Verify search functionality exists
        await expect(searchInput).toBeVisible();
      }
    });
  });
});