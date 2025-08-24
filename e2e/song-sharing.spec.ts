import { test, expect } from '@playwright/test';

test.describe('Song Sharing Features', () => {
  const testUser = {
    email: 'test-owner@example.com',
    password: 'TestPassword123!'
  };

  const collaboratorUser = {
    email: 'collaborator@example.com',
    password: 'CollabPassword123!'
  };

  test.beforeEach(async ({ page }) => {
    // Start from the login page
    await page.goto('/#login');
  });

  test('should display share button for song owners', async ({ page }) => {
    // Login as the test user
    await page.fill('#loginEmail', testUser.email);
    await page.fill('#loginPassword', testUser.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to home page
    await page.waitForSelector('.home');

    // Create a new song first
    await page.click('button:has-text("Create New Song")');
    
    await page.fill('#title', 'Test Song for Sharing');
    await page.fill('#content', '{title: Test Song for Sharing}\n[C]This is a [G]test song [Am]for sharing');
    await page.click('button:has-text("Create Song")');

    // Wait for the song to be created and appear in the list
    await page.waitForSelector('text=Test Song for Sharing');

    // Check that share button is present for the owner
    const songCard = page.locator('.song-card:has-text("Test Song for Sharing")');
    await expect(songCard.locator('button:has-text("Share")')).toBeVisible();
    
    // Verify owner badge is displayed
    await expect(songCard.locator('text=Owner')).toBeVisible();
  });

  test('should open sharing modal when share button is clicked', async ({ page }) => {
    // Login and create a song (similar to previous test)
    await page.fill('#loginEmail', testUser.email);
    await page.fill('#loginPassword', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.home');

    // Assume there's already a song from previous test or create one
    await page.click('button:has-text("Create New Song")');
    await page.fill('#title', 'Shareable Song');
    await page.fill('#content', '{title: Shareable Song}\n[C]Content for sharing');
    await page.click('button:has-text("Create Song")');
    await page.waitForSelector('text=Shareable Song');

    // Click the share button
    const songCard = page.locator('.song-card:has-text("Shareable Song")');
    await songCard.locator('button:has-text("Share")').click();

    // Verify sharing modal opens
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('text=Share "Shareable Song"')).toBeVisible();
    await expect(page.locator('text=Invite Collaborator')).toBeVisible();
    await expect(page.locator('text=Current Collaborators')).toBeVisible();
  });

  test('should validate sharing form inputs', async ({ page }) => {
    // Login and get to sharing modal
    await page.fill('#loginEmail', testUser.email);
    await page.fill('#loginPassword', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.home');

    // Open sharing modal for any available song
    await page.click('.song-card button:has-text("Share")').first();
    await page.waitForSelector('.modal-overlay');

    // Test form validation - button should be disabled without email
    const shareButton = page.locator('button:has-text("Share Song")');
    await expect(shareButton).toBeDisabled();

    // Add email and verify button becomes enabled
    await page.fill('#user-email', collaboratorUser.email);
    await expect(shareButton).toBeEnabled();

    // Test permission level selector
    const permissionSelect = page.locator('#permission-level');
    await expect(permissionSelect).toBeVisible();
    await expect(permissionSelect.locator('option:has-text("Read")')).toBeVisible();
    await expect(permissionSelect.locator('option:has-text("Edit")')).toBeVisible();
    await expect(permissionSelect.locator('option:has-text("Admin")')).toBeVisible();
  });

  test('should handle sharing form submission', async ({ page }) => {
    // Login and get to sharing modal
    await page.fill('#loginEmail', testUser.email);
    await page.fill('#loginPassword', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.home');

    // Create a song for sharing
    await page.click('button:has-text("Create New Song")');
    await page.fill('#title', 'E2E Sharing Test');
    await page.fill('#content', '{title: E2E Sharing Test}\n[C]E2E test content');
    await page.click('button:has-text("Create Song")');
    await page.waitForSelector('text=E2E Sharing Test');

    // Open sharing modal
    const songCard = page.locator('.song-card:has-text("E2E Sharing Test")');
    await songCard.locator('button:has-text("Share")').click();
    await page.waitForSelector('.modal-overlay');

    // Fill in sharing form
    await page.fill('#user-email', collaboratorUser.email);
    await page.selectOption('#permission-level', 'edit');
    
    // Mock API response for successful sharing (if needed)
    await page.route('**/api/v1/songs/*/share', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          message: `Song shared successfully with ${collaboratorUser.email}`
        })
      });
    });

    // Submit the form
    await page.click('button:has-text("Share Song")');

    // Verify success message appears
    await expect(page.locator('text=Song shared successfully')).toBeVisible();
  });

  test('should close sharing modal', async ({ page }) => {
    // Login and open sharing modal
    await page.fill('#loginEmail', testUser.email);
    await page.fill('#loginPassword', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.home');
    
    await page.click('.song-card button:has-text("Share")').first();
    await page.waitForSelector('.modal-overlay');

    // Test closing via close button
    await page.click('button[aria-label="Close"]');
    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // Reopen modal
    await page.click('.song-card button:has-text("Share")').first();
    await page.waitForSelector('.modal-overlay');

    // Test closing via overlay click
    await page.click('.modal-overlay', { position: { x: 10, y: 10 } });
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });

  test('should show collaboration indicators', async ({ page }) => {
    // Login
    await page.fill('#loginEmail', testUser.email);
    await page.fill('#loginPassword', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.home');

    // Look for songs with collaboration indicators
    // This assumes there are songs with sharing data already
    const sharedSongs = page.locator('.song-card:has(.permission-badge)');
    
    if (await sharedSongs.count() > 0) {
      // Verify permission badges exist
      await expect(sharedSongs.first().locator('.permission-badge')).toBeVisible();
      
      // Check for possible badge types
      const badges = ['Owner', 'Admin', 'Editor', 'Reader'];
      let foundBadge = false;
      
      for (const badge of badges) {
        if (await page.locator(`text=${badge}`).isVisible()) {
          foundBadge = true;
          break;
        }
      }
      
      expect(foundBadge).toBe(true);
    }
  });

  test('should handle sharing errors gracefully', async ({ page }) => {
    // Login and open sharing modal
    await page.fill('#loginEmail', testUser.email);
    await page.fill('#loginPassword', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.home');
    
    await page.click('.song-card button:has-text("Share")').first();
    await page.waitForSelector('.modal-overlay');

    // Mock API error response
    await page.route('**/api/v1/songs/*/share', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          error: 'User not found'
        })
      });
    });

    // Fill in form with invalid user
    await page.fill('#user-email', 'nonexistent@example.com');
    await page.click('button:has-text("Share Song")');

    // Verify error message appears
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('text=User not found')).toBeVisible();
  });

  test('should maintain modal state during interactions', async ({ page }) => {
    // Login and open sharing modal
    await page.fill('#loginEmail', testUser.email);
    await page.fill('#loginPassword', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.home');
    
    await page.click('.song-card button:has-text("Share")').first();
    await page.waitForSelector('.modal-overlay');

    // Fill in some form data
    await page.fill('#user-email', 'test@example.com');
    await page.selectOption('#permission-level', 'admin');

    // Verify form retains values
    await expect(page.locator('#user-email')).toHaveValue('test@example.com');
    await expect(page.locator('#permission-level')).toHaveValue('admin');

    // Click on modal content (should not close modal)
    await page.click('.modal-content');
    await expect(page.locator('.modal-overlay')).toBeVisible();
    
    // Verify form still has values
    await expect(page.locator('#user-email')).toHaveValue('test@example.com');
    await expect(page.locator('#permission-level')).toHaveValue('admin');
  });

  test('should be accessible to keyboard navigation', async ({ page }) => {
    // Login and open sharing modal
    await page.fill('#loginEmail', testUser.email);
    await page.fill('#loginPassword', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.home');
    
    await page.click('.song-card button:has-text("Share")').first();
    await page.waitForSelector('.modal-overlay');

    // Test keyboard navigation
    await page.keyboard.press('Tab'); // Should focus first focusable element
    await page.keyboard.press('Tab'); // Navigate to next element
    
    // Test that we can navigate through form elements
    await expect(page.locator('#user-email:focus')).toBeVisible();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('#permission-level:focus')).toBeVisible();
    
    // Test escape key closes modal
    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });
});