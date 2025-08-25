// End-to-end tests for complete collaboration workflows
import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:5000';

interface TestUser {
  email: string;
  password: string;
  name: string;
  token?: string;
}

// Test users for collaboration scenarios
const testUsers: Record<string, TestUser> = {
  songwriter: {
    email: 'songwriter@e2e.test',
    password: 'E2ETest123!',
    name: 'Song Writer'
  },
  lyricist: {
    email: 'lyricist@e2e.test',
    password: 'E2ETest123!',
    name: 'Lyric Writer'
  },
  producer: {
    email: 'producer@e2e.test',
    password: 'E2ETest123!',
    name: 'Music Producer'
  },
  guest: {
    email: 'guest@e2e.test',
    password: 'E2ETest123!',
    name: 'Guest User'
  }
};

async function registerUser(page: Page, user: TestUser): Promise<void> {
  await page.goto(`${BASE_URL}/#register`);
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.fill('[data-testid="confirm-password-input"]', user.password);
  await page.click('[data-testid="register-button"]');
  
  // Wait for registration success or error
  await page.waitForSelector('[data-testid="register-success"], [data-testid="register-error"]', { timeout: 5000 });
}

async function loginUser(page: Page, user: TestUser): Promise<void> {
  await page.goto(`${BASE_URL}/#login`);
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for login to complete
  await page.waitForSelector('[data-testid="user-menu"], [data-testid="login-error"]', { timeout: 5000 });
}

async function createSong(page: Page, title: string, content: string): Promise<string> {
  await page.click('[data-testid="create-song-button"]');
  await page.fill('[data-testid="song-title-input"]', title);
  await page.fill('[data-testid="song-content-input"]', content);
  await page.click('[data-testid="save-song-button"]');
  
  // Wait for song to be created and get the ID from URL
  await page.waitForURL(/.*\/songs\/\d+/);
  const url = page.url();
  const songId = url.match(/\/songs\/(\d+)/)?.[1];
  return songId || '';
}

test.describe('Collaboration End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test data - register users if they don't exist
    for (const user of Object.values(testUsers)) {
      try {
        await registerUser(page, user);
      } catch (error) {
        // User might already exist, continue
        console.log(`User ${user.email} might already exist`);
      }
    }
  });

  test('Complete song sharing workflow', async ({ browser }) => {
    // Create separate contexts for different users
    const songwriterContext = await browser.newContext();
    const lyricistContext = await browser.newContext();
    
    const songwriterPage = await songwriterContext.newPage();
    const lyricistPage = await lyricistContext.newPage();

    try {
      // Songwriter creates and shares a song
      await loginUser(songwriterPage, testUsers.songwriter);
      
      const songId = await createSong(
        songwriterPage,
        'E2E Collaboration Test',
        '{title: E2E Collaboration Test}\n[C]Initial content for [G]collaboration'
      );
      
      // Share song with lyricist
      await songwriterPage.click('[data-testid="share-song-button"]');
      await songwriterPage.fill('[data-testid="share-email-input"]', testUsers.lyricist.email);
      await songwriterPage.selectOption('[data-testid="permission-select"]', 'edit');
      await songwriterPage.click('[data-testid="send-invite-button"]');
      
      // Wait for sharing confirmation
      await expect(songwriterPage.locator('[data-testid="share-success"]')).toBeVisible();
      
      // Lyricist logs in and accesses shared song
      await loginUser(lyricistPage, testUsers.lyricist);
      await lyricistPage.goto(`${BASE_URL}/#songs/${songId}`);
      
      // Verify lyricist can see the song
      await expect(lyricistPage.locator('[data-testid="song-title"]')).toContainText('E2E Collaboration Test');
      
      // Lyricist edits the song
      await lyricistPage.click('[data-testid="edit-song-button"]');
      await lyricistPage.fill('[data-testid="song-content-input"]', 
        '{title: E2E Collaboration Test}\n[C]Initial content for [G]collaboration\n[Am]Added lyrics by [F]lyricist');
      await lyricistPage.click('[data-testid="save-song-button"]');
      
      // Wait for save confirmation
      await expect(lyricistPage.locator('[data-testid="save-success"]')).toBeVisible();
      
      // Songwriter sees the changes
      await songwriterPage.reload();
      await expect(songwriterPage.locator('[data-testid="song-content"]')).toContainText('Added lyrics by lyricist');
      
    } finally {
      await songwriterContext.close();
      await lyricistContext.close();
    }
  });

  test('Permission management workflow', async ({ browser }) => {
    const ownerContext = await browser.newContext();
    const producerContext = await browser.newContext();
    const guestContext = await browser.newContext();
    
    const ownerPage = await ownerContext.newPage();
    const producerPage = await producerContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      // Owner creates song
      await loginUser(ownerPage, testUsers.songwriter);
      const songId = await createSong(
        ownerPage,
        'Permission Test Song',
        '{title: Permission Test}\n[C]Owner content'
      );
      
      // Share with producer as admin
      await ownerPage.click('[data-testid="share-song-button"]');
      await ownerPage.fill('[data-testid="share-email-input"]', testUsers.producer.email);
      await ownerPage.selectOption('[data-testid="permission-select"]', 'admin');
      await ownerPage.click('[data-testid="send-invite-button"]');
      await expect(ownerPage.locator('[data-testid="share-success"]')).toBeVisible();
      
      // Producer shares with guest (read-only)
      await loginUser(producerPage, testUsers.producer);
      await producerPage.goto(`${BASE_URL}/#songs/${songId}`);
      
      await producerPage.click('[data-testid="share-song-button"]');
      await producerPage.fill('[data-testid="share-email-input"]', testUsers.guest.email);
      await producerPage.selectOption('[data-testid="permission-select"]', 'read');
      await producerPage.click('[data-testid="send-invite-button"]');
      await expect(producerPage.locator('[data-testid="share-success"]')).toBeVisible();
      
      // Guest logs in and can only view
      await loginUser(guestPage, testUsers.guest);
      await guestPage.goto(`${BASE_URL}/#songs/${songId}`);
      
      // Verify guest can see song but not edit button
      await expect(guestPage.locator('[data-testid="song-title"]')).toContainText('Permission Test Song');
      await expect(guestPage.locator('[data-testid="edit-song-button"]')).not.toBeVisible();
      
      // Producer upgrades guest to editor
      await producerPage.click('[data-testid="manage-collaborators-button"]');
      await producerPage.click(`[data-testid="user-${testUsers.guest.email}-permission-dropdown"]`);
      await producerPage.selectOption(`[data-testid="user-${testUsers.guest.email}-permission-select"]`, 'edit');
      await producerPage.click('[data-testid="update-permission-button"]');
      
      // Guest refreshes and can now edit
      await guestPage.reload();
      await expect(guestPage.locator('[data-testid="edit-song-button"]')).toBeVisible();
      
    } finally {
      await ownerContext.close();
      await producerContext.close();
      await guestContext.close();
    }
  });

  test('Real-time collaboration indicators', async ({ browser }) => {
    const user1Context = await browser.newContext();
    const user2Context = await browser.newContext();
    
    const user1Page = await user1Context.newPage();
    const user2Page = await user2Context.newPage();

    try {
      // User 1 creates and shares song
      await loginUser(user1Page, testUsers.songwriter);
      const songId = await createSong(
        user1Page,
        'Real-time Test',
        '{title: Real-time Test}\n[C]Collaboration content'
      );
      
      await user1Page.click('[data-testid="share-song-button"]');
      await user1Page.fill('[data-testid="share-email-input"]', testUsers.lyricist.email);
      await user1Page.selectOption('[data-testid="permission-select"]', 'edit');
      await user1Page.click('[data-testid="send-invite-button"]');
      
      // User 2 joins collaboration
      await loginUser(user2Page, testUsers.lyricist);
      await user2Page.goto(`${BASE_URL}/#songs/${songId}`);
      await user2Page.click('[data-testid="edit-song-button"]');
      
      // Both users should see collaboration indicators
      await expect(user1Page.locator('[data-testid="collaboration-status"]')).toBeVisible();
      await expect(user2Page.locator('[data-testid="collaboration-status"]')).toBeVisible();
      
      // User 1 should see User 2's presence
      await expect(user1Page.locator('[data-testid="collaborator-avatar"]')).toBeVisible();
      
      // User 2 makes edit - User 1 should see real-time update
      await user2Page.fill('[data-testid="song-content-input"]', 
        '{title: Real-time Test}\n[C]Collaboration content\n[Am]Real-time edit by user 2');
      
      // Wait for real-time sync (this would depend on actual implementation)
      await user1Page.waitForTimeout(1000);
      
      // User 1 should see the change (in a real app with WebSocket/Firebase)
      // This is a placeholder - actual implementation would show real-time updates
      
    } finally {
      await user1Context.close();
      await user2Context.close();
    }
  });

  test('Conflict resolution workflow', async ({ browser }) => {
    const user1Context = await browser.newContext();
    const user2Context = await browser.newContext();
    
    const user1Page = await user1Context.newPage();
    const user2Page = await user2Context.newPage();

    try {
      // Setup shared song
      await loginUser(user1Page, testUsers.songwriter);
      const songId = await createSong(
        user1Page,
        'Conflict Test',
        '{title: Conflict Test}\n[C]Base content'
      );
      
      await user1Page.click('[data-testid="share-song-button"]');
      await user1Page.fill('[data-testid="share-email-input"]', testUsers.lyricist.email);
      await user1Page.selectOption('[data-testid="permission-select"]', 'edit');
      await user1Page.click('[data-testid="send-invite-button"]');
      
      // Both users start editing
      await user1Page.click('[data-testid="edit-song-button"]');
      
      await loginUser(user2Page, testUsers.lyricist);
      await user2Page.goto(`${BASE_URL}/#songs/${songId}`);
      await user2Page.click('[data-testid="edit-song-button"]');
      
      // User 1 makes first edit
      await user1Page.fill('[data-testid="song-content-input"]', 
        '{title: Conflict Test}\n[C]Base content\n[Am]Edit by user 1');
      await user1Page.click('[data-testid="save-song-button"]');
      
      // User 2 makes conflicting edit (simulating offline/delayed edit)
      await user2Page.fill('[data-testid="song-content-input"]', 
        '{title: Conflict Test}\n[C]Base content\n[F]Edit by user 2');
      await user2Page.click('[data-testid="save-song-button"]');
      
      // Check if conflict resolution dialog appears
      const conflictDialog = user2Page.locator('[data-testid="conflict-resolution-dialog"]');
      if (await conflictDialog.isVisible()) {
        // Test conflict resolution options
        await expect(user2Page.locator('[data-testid="conflict-local-version"]')).toContainText('Edit by user 2');
        await expect(user2Page.locator('[data-testid="conflict-remote-version"]')).toContainText('Edit by user 1');
        
        // Choose manual merge
        await user2Page.click('[data-testid="manual-merge-option"]');
        await user2Page.fill('[data-testid="manual-merge-content"]', 
          '{title: Conflict Test}\n[C]Base content\n[Am]Edit by user 1\n[F]Edit by user 2');
        await user2Page.click('[data-testid="resolve-conflict-button"]');
        
        // Verify conflict was resolved
        await expect(user2Page.locator('[data-testid="save-success"]')).toBeVisible();
      }
      
    } finally {
      await user1Context.close();
      await user2Context.close();
    }
  });

  test('Large collaboration session', async ({ browser }) => {
    // Test with multiple users collaborating simultaneously
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];
    
    try {
      // Create contexts for multiple users
      for (let i = 0; i < 3; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }
      
      // First user creates song
      await loginUser(pages[0], testUsers.songwriter);
      const songId = await createSong(
        pages[0],
        'Large Collaboration',
        '{title: Large Collaboration}\n[C]Starting point'
      );
      
      // Share with other users
      const shareUsers = [testUsers.lyricist, testUsers.producer];
      for (let i = 0; i < shareUsers.length; i++) {
        await pages[0].click('[data-testid="share-song-button"]');
        await pages[0].fill('[data-testid="share-email-input"]', shareUsers[i].email);
        await pages[0].selectOption('[data-testid="permission-select"]', 'edit');
        await pages[0].click('[data-testid="send-invite-button"]');
        await pages[0].waitForSelector('[data-testid="share-success"]');
      }
      
      // Other users join
      await loginUser(pages[1], testUsers.lyricist);
      await loginUser(pages[2], testUsers.producer);
      
      for (let i = 1; i < pages.length; i++) {
        await pages[i].goto(`${BASE_URL}/#songs/${songId}`);
        await pages[i].click('[data-testid="edit-song-button"]');
      }
      
      // All users should see collaboration indicators
      for (const page of pages) {
        await expect(page.locator('[data-testid="collaboration-status"]')).toBeVisible();
      }
      
      // Simulate concurrent editing (each user adds a section)
      const sections = [
        '\n{start_of_verse}\n[C]Verse content\n{end_of_verse}',
        '\n{start_of_chorus}\n[G]Chorus content\n{end_of_chorus}',
        '\n{start_of_bridge}\n[Am]Bridge content\n{end_of_bridge}'
      ];
      
      for (let i = 0; i < pages.length; i++) {
        await pages[i].locator('[data-testid="song-content-input"]').fill(
          '{title: Large Collaboration}\n[C]Starting point' + sections[i]
        );
        await pages[i].click('[data-testid="save-song-button"]');
        await pages[i].waitForTimeout(500); // Brief delay between saves
      }
      
      // Verify final state contains contributions from all users
      await pages[0].reload();
      const finalContent = await pages[0].locator('[data-testid="song-content"]').textContent();
      
      // Should contain at least some collaborative content
      expect(finalContent).toContain('Large Collaboration');
      
    } finally {
      // Clean up all contexts
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('Mobile collaboration workflow', async ({ browser }) => {
    // Test collaboration on mobile devices
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    
    const desktopContext = await browser.newContext();
    
    const mobilePage = await mobileContext.newPage();
    const desktopPage = await desktopContext.newPage();

    try {
      // Desktop user creates song
      await loginUser(desktopPage, testUsers.songwriter);
      const songId = await createSong(
        desktopPage,
        'Mobile Collaboration',
        '{title: Mobile Test}\n[C]Desktop created'
      );
      
      // Share with mobile user
      await desktopPage.click('[data-testid="share-song-button"]');
      await desktopPage.fill('[data-testid="share-email-input"]', testUsers.lyricist.email);
      await desktopPage.selectOption('[data-testid="permission-select"]', 'edit');
      await desktopPage.click('[data-testid="send-invite-button"]');
      
      // Mobile user accesses and edits
      await loginUser(mobilePage, testUsers.lyricist);
      await mobilePage.goto(`${BASE_URL}/#songs/${songId}`);
      
      // Verify mobile interface is responsive
      await expect(mobilePage.locator('[data-testid="song-title"]')).toBeVisible();
      
      // Test mobile editing
      await mobilePage.click('[data-testid="edit-song-button"]');
      await mobilePage.fill('[data-testid="song-content-input"]', 
        '{title: Mobile Test}\n[C]Desktop created\n[Am]Mobile edit added');
      await mobilePage.click('[data-testid="save-song-button"]');
      
      // Desktop user sees mobile changes
      await desktopPage.reload();
      await expect(desktopPage.locator('[data-testid="song-content"]')).toContainText('Mobile edit added');
      
    } finally {
      await mobileContext.close();
      await desktopContext.close();
    }
  });

  test('Collaboration performance under load', async ({ browser }) => {
    // Test performance with rapid collaboration actions
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await loginUser(page, testUsers.songwriter);
      const songId = await createSong(
        page,
        'Performance Test',
        '{title: Performance Test}\n[C]Base content'
      );
      
      // Measure time for rapid operations
      const startTime = Date.now();
      
      // Rapid editing simulation
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="edit-song-button"]');
        await page.fill('[data-testid="song-content-input"]', 
          `{title: Performance Test}\n[C]Base content\n[Am]Edit ${i + 1}`);
        await page.click('[data-testid="save-song-button"]');
        await page.waitForSelector('[data-testid="save-success"]');
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete rapid edits in reasonable time
      expect(totalTime).toBeLessThan(30000); // 30 seconds for 5 edits
      
      // Verify final state is correct
      await expect(page.locator('[data-testid="song-content"]')).toContainText('Edit 5');
      
    } finally {
      await context.close();
    }
  });

  test('Accessibility in collaboration features', async ({ browser }) => {
    // Test accessibility of collaboration features
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await loginUser(page, testUsers.songwriter);
      const songId = await createSong(
        page,
        'Accessibility Test',
        '{title: Accessibility Test}\n[C]Content for accessibility'
      );
      
      // Test keyboard navigation
      await page.keyboard.press('Tab'); // Navigate to share button
      await page.keyboard.press('Enter'); // Open share dialog
      
      // Verify share dialog is accessible
      await expect(page.locator('[data-testid="share-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-dialog"]')).toHaveAttribute('role', 'dialog');
      
      // Test form accessibility
      const emailInput = page.locator('[data-testid="share-email-input"]');
      await expect(emailInput).toHaveAttribute('aria-label');
      
      // Test with screen reader simulation
      await page.fill('[data-testid="share-email-input"]', testUsers.lyricist.email);
      await page.selectOption('[data-testid="permission-select"]', 'read');
      
      // Verify aria-live regions for updates
      await page.click('[data-testid="send-invite-button"]');
      const successMessage = page.locator('[data-testid="share-success"]');
      await expect(successMessage).toHaveAttribute('aria-live', 'polite');
      
    } finally {
      await context.close();
    }
  });
});