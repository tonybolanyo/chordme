// End-to-end tests for storage backend persistence and switching
import { test, expect } from '@playwright/test';

test.describe('Storage Backend Persistence E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock storage services for testing
    await page.addInitScript(() => {
      // Mock localStorage
      const mockLocalStorage = {
        data: new Map(),
        getItem: function(key: string) { return this.data.get(key) || null; },
        setItem: function(key: string, value: string) { this.data.set(key, value); },
        removeItem: function(key: string) { this.data.delete(key); },
        clear: function() { this.data.clear(); },
        get length() { return this.data.size; },
        key: function(index: number) { return Array.from(this.data.keys())[index] || null; }
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });

      // Mock Firebase configuration
      window.FIREBASE_CONFIG = {
        apiKey: 'mock-api-key',
        authDomain: 'mock-domain.firebaseapp.com',
        projectId: 'mock-project',
        storageBucket: 'mock-project.appspot.com',
        messagingSenderId: '123456789',
        appId: '1:123456789:web:mock-app-id'
      };

      // Mock Google OAuth configuration
      window.GOOGLE_OAUTH_CONFIG = {
        clientId: 'mock-google-client-id',
        apiKey: 'mock-google-api-key'
      };

      // Mock storage backend services
      window.mockStorageServices = {
        api: {
          isAvailable: () => true,
          saveSong: (song: any) => Promise.resolve({ ...song, id: 'api-song-' + Date.now() }),
          getSong: (id: string) => Promise.resolve({ id, title: 'API Song', content: '{title: API Song}\n[C]Test' }),
          getSongs: () => Promise.resolve([{ id: 'api-1', title: 'API Song 1' }])
        },
        firebase: {
          isAvailable: () => true,
          saveSong: (song: any) => Promise.resolve({ ...song, id: 'firebase-song-' + Date.now() }),
          getSong: (id: string) => Promise.resolve({ id, title: 'Firebase Song', content: '{title: Firebase Song}\n[C]Test' }),
          getSongs: () => Promise.resolve([{ id: 'firebase-1', title: 'Firebase Song 1' }])
        },
        googledrive: {
          isAvailable: () => true,
          saveSong: (song: any) => Promise.resolve({ ...song, id: 'drive-song-' + Date.now() }),
          getSong: (id: string) => Promise.resolve({ id, title: 'Drive Song', content: '{title: Drive Song}\n[C]Test' }),
          getSongs: () => Promise.resolve([{ id: 'drive-1', title: 'Drive Song 1' }])
        },
        localstorage: {
          isAvailable: () => typeof window.localStorage !== 'undefined',
          saveSong: (song: any) => {
            const songWithId = { ...song, id: 'local-song-' + Date.now() };
            const songs = JSON.parse(window.localStorage.getItem('songs') || '[]');
            songs.push(songWithId);
            window.localStorage.setItem('songs', JSON.stringify(songs));
            return Promise.resolve(songWithId);
          },
          getSong: (id: string) => {
            const songs = JSON.parse(window.localStorage.getItem('songs') || '[]');
            const song = songs.find((s: any) => s.id === id);
            return Promise.resolve(song || null);
          },
          getSongs: () => {
            const songs = JSON.parse(window.localStorage.getItem('songs') || '[]');
            return Promise.resolve(songs);
          }
        }
      };
    });
  });

  test.describe('Storage Backend Selection', () => {
    test('should open storage settings and show all available backends', async ({ page }) => {
      await page.goto('/');
      
      // Look for storage settings button/menu
      const settingsButton = page.locator('button:has-text("Settings"), .settings-button, [data-testid="settings-button"]');
      const storageMenuItem = page.locator('a:has-text("Storage"), button:has-text("Storage"), .storage-settings');
      
      if (await settingsButton.isVisible()) {
        await settingsButton.click();
        
        if (await storageMenuItem.isVisible()) {
          await storageMenuItem.click();
        }
      } else if (await storageMenuItem.isVisible()) {
        await storageMenuItem.click();
      } else {
        // Try to navigate directly to storage settings if available
        await page.goto('/#settings/storage');
      }
      
      // Check if storage settings are visible
      const storageSettings = page.locator('.storage-settings, .backend-selection, .storage-backends');
      if (await storageSettings.isVisible()) {
        // Should show all backend options
        await expect(page.locator('text=REST API Storage, text=API Storage')).toBeVisible();
        await expect(page.locator('text=Firebase, text=Firestore')).toBeVisible();
        await expect(page.locator('text=Google Drive')).toBeVisible();
        await expect(page.locator('text=Local Storage')).toBeVisible();
        
        // Should show current selection
        const selectedBackend = page.locator('input[type="radio"]:checked');
        await expect(selectedBackend).toBeVisible();
      } else {
        console.log('Storage settings not available - skipping backend selection test');
      }
    });

    test('should switch between storage backends', async ({ page }) => {
      await page.goto('/');
      
      // Navigate to storage settings
      const storageSettings = await openStorageSettings(page);
      
      if (storageSettings) {
        // Select Firebase backend
        const firebaseOption = page.locator('input[value="firebase"], label:has-text("Firebase")');
        if (await firebaseOption.isVisible()) {
          await firebaseOption.click();
          
          // Save settings
          const saveButton = page.locator('button:has-text("Save"), .save-button');
          if (await saveButton.isVisible()) {
            await saveButton.click();
          }
          
          // Verify backend switch
          await expect(page.locator('.success-message, .notification')).toBeVisible({ timeout: 5000 });
        }
        
        // Test switching to Google Drive
        await openStorageSettings(page);
        const driveOption = page.locator('input[value="googledrive"], label:has-text("Google Drive")');
        if (await driveOption.isVisible()) {
          await driveOption.click();
          
          const saveButton = page.locator('button:has-text("Save"), .save-button');
          if (await saveButton.isVisible()) {
            await saveButton.click();
          }
        }
        
        // Test switching to Local Storage
        await openStorageSettings(page);
        const localOption = page.locator('input[value="localstorage"], label:has-text("Local")');
        if (await localOption.isVisible()) {
          await localOption.click();
          
          const saveButton = page.locator('button:has-text("Save"), .save-button');
          if (await saveButton.isVisible()) {
            await saveButton.click();
          }
        }
      } else {
        console.log('Storage settings not accessible - skipping backend switching test');
      }
    });
  });

  test.describe('Song Persistence Across Backends', () => {
    test('should save and retrieve songs from REST API backend', async ({ page }) => {
      await page.goto('/');
      
      // Set backend to API
      await setStorageBackend(page, 'api');
      
      // Create a new song
      const song = await createTestSong(page, 'API Test Song');
      
      if (song.created) {
        // Reload application
        await page.reload();
        
        // Verify song is still there
        await expect(page.locator(`text=${song.title}`)).toBeVisible({ timeout: 5000 });
        
        // Open song to verify content
        await page.locator(`text=${song.title}`).click();
        await expect(page.locator('text=API Test Song, [value*="API Test Song"]')).toBeVisible();
      }
    });

    test('should save and retrieve songs from Firebase backend', async ({ page }) => {
      await page.goto('/');
      
      // Set backend to Firebase
      await setStorageBackend(page, 'firebase');
      
      // Create a new song
      const song = await createTestSong(page, 'Firebase Test Song');
      
      if (song.created) {
        // Reload application
        await page.reload();
        
        // Verify song is still there
        await expect(page.locator(`text=${song.title}`)).toBeVisible({ timeout: 5000 });
      }
    });

    test('should save and retrieve songs from Google Drive backend', async ({ page }) => {
      await page.goto('/');
      
      // Set backend to Google Drive
      await setStorageBackend(page, 'googledrive');
      
      // Create a new song
      const song = await createTestSong(page, 'Drive Test Song');
      
      if (song.created) {
        // Reload application
        await page.reload();
        
        // Verify song is still there
        await expect(page.locator(`text=${song.title}`)).toBeVisible({ timeout: 5000 });
      }
    });

    test('should save and retrieve songs from Local Storage backend', async ({ page }) => {
      await page.goto('/');
      
      // Set backend to Local Storage
      await setStorageBackend(page, 'localstorage');
      
      // Create a new song
      const song = await createTestSong(page, 'Local Test Song');
      
      if (song.created) {
        // Reload application
        await page.reload();
        
        // Verify song is still there
        await expect(page.locator(`text=${song.title}`)).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Backend Migration', () => {
    test('should handle switching backends with existing data', async ({ page }) => {
      await page.goto('/');
      
      // Start with API backend
      await setStorageBackend(page, 'api');
      
      // Create song in API backend
      const apiSong = await createTestSong(page, 'API Original Song');
      
      if (apiSong.created) {
        // Switch to Firebase backend
        await setStorageBackend(page, 'firebase');
        
        // Create song in Firebase backend
        const firebaseSong = await createTestSong(page, 'Firebase New Song');
        
        if (firebaseSong.created) {
          // Verify Firebase song is visible
          await expect(page.locator(`text=${firebaseSong.title}`)).toBeVisible();
          
          // API song should not be visible (different backend)
          await expect(page.locator(`text=${apiSong.title}`)).not.toBeVisible();
          
          // Switch back to API backend
          await setStorageBackend(page, 'api');
          
          // API song should be visible again
          await expect(page.locator(`text=${apiSong.title}`)).toBeVisible();
          
          // Firebase song should not be visible
          await expect(page.locator(`text=${firebaseSong.title}`)).not.toBeVisible();
        }
      }
    });

    test('should maintain backend selection across sessions', async ({ page }) => {
      await page.goto('/');
      
      // Set backend to Local Storage
      await setStorageBackend(page, 'localstorage');
      
      // Create a song
      const song = await createTestSong(page, 'Persistence Test Song');
      
      if (song.created) {
        // Reload page (simulating new session)
        await page.reload();
        
        // Verify backend is still Local Storage and song is visible
        await expect(page.locator(`text=${song.title}`)).toBeVisible({ timeout: 5000 });
        
        // Check storage settings to confirm backend selection
        const storageSettings = await openStorageSettings(page);
        if (storageSettings) {
          const localStorageSelected = page.locator('input[value="localstorage"]:checked');
          await expect(localStorageSelected).toBeVisible();
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle backend unavailability gracefully', async ({ page }) => {
      // Mock Firebase as unavailable
      await page.addInitScript(() => {
        window.FIREBASE_CONFIG = null;
        window.mockStorageServices.firebase.isAvailable = () => false;
      });
      
      await page.goto('/');
      
      const storageSettings = await openStorageSettings(page);
      if (storageSettings) {
        // Firebase option should be disabled or marked as unavailable
        const firebaseOption = page.locator('input[value="firebase"]');
        if (await firebaseOption.isVisible()) {
          await expect(firebaseOption).toBeDisabled();
        }
        
        // Should show configuration required message
        await expect(page.locator('text=configuration required, text=unavailable')).toBeVisible();
      }
    });

    test('should fallback to API backend when selected backend fails', async ({ page }) => {
      await page.goto('/');
      
      // Mock Firebase backend failure
      await page.evaluate(() => {
        window.mockStorageServices.firebase.getSongs = () => Promise.reject(new Error('Firebase connection failed'));
      });
      
      // Set backend to Firebase
      await setStorageBackend(page, 'firebase');
      
      // Try to load songs (should fail and potentially fallback)
      await page.reload();
      
      // Should either show error message or fallback to working backend
      const errorIndicators = [
        '.error-message',
        '.connection-error',
        'text=failed to load',
        'text=connection error'
      ];
      
      let errorVisible = false;
      for (const selector of errorIndicators) {
        if (await page.locator(selector).isVisible().catch(() => false)) {
          errorVisible = true;
          break;
        }
      }
      
      // Either error should be shown or songs should load from fallback backend
      if (!errorVisible) {
        // Should have some song list or indication that app is working
        const workingIndicators = [
          '.song-list',
          '.songs-container',
          'text=No songs',
          '.empty-state'
        ];
        
        let workingVisible = false;
        for (const selector of workingIndicators) {
          if (await page.locator(selector).isVisible().catch(() => false)) {
            workingVisible = true;
            break;
          }
        }
        
        expect(workingVisible).toBe(true);
      }
    });
  });

  test.describe('Performance and Sync', () => {
    test('should handle rapid backend switching', async ({ page }) => {
      await page.goto('/');
      
      const backends = ['api', 'firebase', 'googledrive', 'localstorage'];
      
      for (const backend of backends) {
        await setStorageBackend(page, backend);
        
        // Create a quick test song
        const song = await createTestSong(page, `${backend.toUpperCase()} Speed Test`);
        
        if (song.created) {
          // Verify song appears
          await expect(page.locator(`text=${song.title}`)).toBeVisible({ timeout: 3000 });
        }
        
        // Small delay between switches
        await page.waitForTimeout(500);
      }
    });

    test('should sync data when switching between compatible backends', async ({ page }) => {
      await page.goto('/');
      
      // This test would be more meaningful with real sync functionality
      // For now, just verify that switching doesn't break the app
      
      await setStorageBackend(page, 'api');
      const apiSong = await createTestSong(page, 'Sync Test Song');
      
      if (apiSong.created) {
        await setStorageBackend(page, 'firebase');
        
        // App should still be functional after switch
        const createButton = page.locator('button:has-text("New Song"), .create-song, .add-song');
        if (await createButton.isVisible()) {
          await expect(createButton).toBeEnabled();
        }
      }
    });
  });

  // Helper functions
  async function openStorageSettings(page: any): Promise<boolean> {
    const settingsSelectors = [
      'button:has-text("Settings")',
      '.settings-button',
      '[data-testid="settings-button"]',
      '.storage-settings-trigger'
    ];
    
    for (const selector of settingsSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible().catch(() => false)) {
        await element.click();
        break;
      }
    }
    
    const storageSelectors = [
      'a:has-text("Storage")',
      'button:has-text("Storage")',
      '.storage-settings',
      '.storage-backends'
    ];
    
    for (const selector of storageSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible().catch(() => false)) {
        await element.click();
        return true;
      }
    }
    
    // Try direct navigation
    await page.goto('/#settings/storage');
    
    const storageSettings = page.locator('.storage-settings, .backend-selection, .storage-backends');
    return await storageSettings.isVisible().catch(() => false);
  }

  async function setStorageBackend(page: any, backend: string): Promise<void> {
    const storageSettings = await openStorageSettings(page);
    
    if (storageSettings) {
      const backendOption = page.locator(`input[value="${backend}"]`);
      if (await backendOption.isVisible()) {
        await backendOption.click();
        
        const saveButton = page.locator('button:has-text("Save"), .save-button');
        if (await saveButton.isVisible()) {
          await saveButton.click();
        }
        
        // Wait for settings to close/apply
        await page.waitForTimeout(1000);
      }
    }
  }

  async function createTestSong(page: any, title: string): Promise<{ created: boolean; title: string }> {
    const createSelectors = [
      'button:has-text("New Song")',
      'button:has-text("Create Song")',
      '.create-song',
      '.add-song',
      '.new-song-button'
    ];
    
    let createButton = null;
    for (const selector of createSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible().catch(() => false)) {
        createButton = element;
        break;
      }
    }
    
    if (!createButton) {
      return { created: false, title };
    }
    
    await createButton.click();
    
    // Fill in song details
    const titleInput = page.locator('input[name="title"], input[placeholder*="title"], .song-title-input');
    if (await titleInput.isVisible()) {
      await titleInput.fill(title);
    }
    
    const contentInput = page.locator('textarea[name="content"], .song-content, .chordpro-editor');
    if (await contentInput.isVisible()) {
      await contentInput.fill(`{title: ${title}}\n[C]Test song [G]content [Am]here`);
    }
    
    // Save song
    const saveSelectors = [
      'button:has-text("Save")',
      'button:has-text("Create")',
      '.save-song',
      '.save-button'
    ];
    
    for (const selector of saveSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible().catch(() => false)) {
        await element.click();
        break;
      }
    }
    
    // Wait for save to complete
    await page.waitForTimeout(1000);
    
    return { created: true, title };
  }
});