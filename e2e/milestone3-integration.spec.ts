// Comprehensive E2E tests for Milestone 3 feature integration
import { test, expect, Page, BrowserContext } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:5000';

interface TestUser {
  email: string;
  password: string;
  name: string;
}

const testUsers: Record<string, TestUser> = {
  bandLeader: {
    email: 'bandleader@milestone3.test',
    password: 'Milestone3Test123!',
    name: 'Band Leader'
  },
  musician1: {
    email: 'musician1@milestone3.test',
    password: 'Milestone3Test123!',
    name: 'Musician One'
  },
  musician2: {
    email: 'musician2@milestone3.test',
    password: 'Milestone3Test123!',
    name: 'Musician Two'
  }
};

async function registerAndLoginUser(page: Page, user: TestUser): Promise<void> {
  // Register user
  await page.goto(`${BASE_URL}/#register`);
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.fill('[data-testid="confirm-password-input"]', user.password);
  await page.click('[data-testid="register-button"]');
  
  // Wait for registration to complete (success or user already exists)
  await page.waitForTimeout(2000);
  
  // Login
  await page.goto(`${BASE_URL}/#login`);
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for login to complete
  await page.waitForSelector('[data-testid="user-menu"], [data-testid="dashboard"]', { timeout: 10000 });
}

async function createSongWithAdvancedFeatures(page: Page, title: string): Promise<string> {
  await page.click('[data-testid="create-song-button"]');
  
  const songContent = `{title: ${title}}
{artist: Milestone 3 Integration Test}
{key: G}
{tempo: 120}

{comment: Verse with complex chords}
[Gmaj7]Amazing [D9/F#]grace, how [Em7]sweet the [Am7]sound
[C6]That saved a [G/B]wretch like [Am7]me [D7sus4][D]

{comment: Chorus with timing data}
[G]I once was [D/F#]lost, but [Em]now I'm [C]found
[G/B]Was blind but [Am7]now I [D7]see [G]

{chord_timing: G@0.0, D/F#@2.5, Em@5.0, C@7.5}
{section_timing: verse@0.0, chorus@16.0}`;

  await page.fill('[data-testid="song-title-input"]', title);
  await page.fill('[data-testid="song-content-input"]', songContent);
  await page.click('[data-testid="save-song-button"]');
  
  // Wait for song to be created and get ID from URL
  await page.waitForURL(/.*\/songs\/\d+/, { timeout: 10000 });
  const url = page.url();
  const songId = url.match(/\/songs\/(\d+)/)?.[1];
  return songId || '';
}

test.describe('Milestone 3 Feature Integration E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Setup users if they don't exist
    for (const user of Object.values(testUsers)) {
      try {
        await registerAndLoginUser(page, user);
      } catch (error) {
        // User might already exist, continue
        console.log(`Setup for ${user.email} completed`);
      }
    }
  });

  test('Complete collaborative workflow with all features', async ({ browser }) => {
    const leaderContext = await browser.newContext();
    const musician1Context = await browser.newContext();
    const musician2Context = await browser.newContext();
    
    const leaderPage = await leaderContext.newPage();
    const musician1Page = await musician1Context.newPage();
    const musician2Page = await musician2Context.newPage();

    try {
      // 1. Band leader creates song with advanced features
      await registerAndLoginUser(leaderPage, testUsers.bandLeader);
      const songId = await createSongWithAdvancedFeatures(leaderPage, 'Collaborative Integration Test');
      
      expect(songId).toBeTruthy();
      
      // 2. Verify advanced chord diagrams are displayed
      await expect(leaderPage.locator('[data-testid="chord-diagram-panel"]')).toBeVisible({ timeout: 10000 });
      await expect(leaderPage.locator('[data-testid="chord-diagram"]')).toHaveCount(8, { timeout: 5000 }); // Should show diagrams for the chords
      
      // 3. Test transposition affects both content and chord diagrams
      await leaderPage.click('[data-testid="transpose-up-button"]');
      await leaderPage.waitForTimeout(1000); // Wait for transposition
      
      // Verify content was transposed
      const transposedContent = await leaderPage.textContent('[data-testid="song-content"]');
      expect(transposedContent).toContain('[G#maj7]'); // G transposed up becomes G#
      
      // Verify chord diagrams updated
      await expect(leaderPage.locator('[data-testid="chord-diagram"][data-chord="G#maj7"]')).toBeVisible();
      
      // 4. Test performance mode with audio sync features
      await leaderPage.click('[data-testid="performance-mode-button"]');
      await expect(leaderPage.locator('[data-testid="performance-mode-container"]')).toBeVisible();
      
      // Check performance mode features are active
      await expect(leaderPage.locator('[data-testid="auto-scroll-toggle"]')).toBeVisible();
      await expect(leaderPage.locator('[data-testid="font-size-controls"]')).toBeVisible();
      await expect(leaderPage.locator('[data-testid="fullscreen-button"]')).toBeVisible();
      
      // Test audio sync controls if available
      const audioSyncButton = leaderPage.locator('[data-testid="audio-sync-button"]');
      if (await audioSyncButton.isVisible()) {
        await audioSyncButton.click();
        await expect(leaderPage.locator('[data-testid="audio-sync-timeline"]')).toBeVisible();
      }
      
      // Exit performance mode
      await leaderPage.click('[data-testid="exit-performance-mode"]');
      
      // 5. Share song for collaboration
      await leaderPage.click('[data-testid="share-song-button"]');
      await leaderPage.fill('[data-testid="collaborator-email-input"]', testUsers.musician1.email);
      await leaderPage.selectOption('[data-testid="permission-select"]', 'edit');
      await leaderPage.click('[data-testid="add-collaborator-button"]');
      
      // Add second collaborator
      await leaderPage.fill('[data-testid="collaborator-email-input"]', testUsers.musician2.email);
      await leaderPage.selectOption('[data-testid="permission-select"]', 'edit');
      await leaderPage.click('[data-testid="add-collaborator-button"]');
      
      // 6. Musicians join collaboration
      await registerAndLoginUser(musician1Page, testUsers.musician1);
      await musician1Page.goto(`${BASE_URL}/#songs/${songId}`);
      
      await registerAndLoginUser(musician2Page, testUsers.musician2);
      await musician2Page.goto(`${BASE_URL}/#songs/${songId}`);
      
      // Verify collaboration indicators are visible
      await expect(leaderPage.locator('[data-testid="collaboration-status"]')).toBeVisible();
      await expect(musician1Page.locator('[data-testid="collaboration-status"]')).toBeVisible();
      await expect(musician2Page.locator('[data-testid="collaboration-status"]')).toBeVisible();
      
      // 7. Test real-time collaborative editing
      await musician1Page.click('[data-testid="edit-song-button"]');
      
      // Musician 1 adds content
      const currentContent = await musician1Page.inputValue('[data-testid="song-content-input"]');
      const newContent = currentContent + '\n\n{comment: Guitar solo}\n[G] [D] [Em] [C] x4';
      await musician1Page.fill('[data-testid="song-content-input"]', newContent);
      await musician1Page.click('[data-testid="save-song-button"]');
      
      // Wait for real-time sync and verify others see the change
      await leaderPage.waitForTimeout(2000);
      
      const leaderContent = await leaderPage.textContent('[data-testid="song-content"]');
      expect(leaderContent).toContain('Guitar solo');
      
      // 8. Test collaborative features work with advanced functionality
      // Musician 2 tests transposition
      await musician2Page.click('[data-testid="transpose-down-button"]');
      await musician2Page.waitForTimeout(1000);
      
      // All users should see the transposition
      await leaderPage.waitForTimeout(1000);
      const finalLeaderContent = await leaderPage.textContent('[data-testid="song-content"]');
      expect(finalLeaderContent).toContain('[F#maj7]'); // G# transposed down becomes F#
      
      // 9. Test setlist integration
      await leaderPage.click('[data-testid="add-to-setlist-button"]');
      
      if (await leaderPage.locator('[data-testid="create-new-setlist"]').isVisible()) {
        await leaderPage.click('[data-testid="create-new-setlist"]');
        await leaderPage.fill('[data-testid="setlist-name-input"]', 'Integration Test Setlist');
        await leaderPage.click('[data-testid="create-setlist-button"]');
      }
      
      // Verify song was added to setlist
      await expect(leaderPage.locator('[data-testid="setlist-confirmation"]')).toBeVisible();
      
    } finally {
      await leaderContext.close();
      await musician1Context.close();
      await musician2Context.close();
    }
  });

  test('Performance mode with multi-feature integration', async ({ page }) => {
    await registerAndLoginUser(page, testUsers.bandLeader);
    const songId = await createSongWithAdvancedFeatures(page, 'Performance Mode Integration Test');
    
    // Enter performance mode
    await page.click('[data-testid="performance-mode-button"]');
    await expect(page.locator('[data-testid="performance-mode-container"]')).toBeVisible();
    
    // Test font size controls
    await page.click('[data-testid="increase-font-size"]');
    await page.click('[data-testid="increase-font-size"]');
    
    // Verify large font is applied
    const songDisplay = page.locator('[data-testid="performance-song-display"]');
    await expect(songDisplay).toHaveCSS('font-size', /^(2|3)\d+px$/); // Should be larger font
    
    // Test auto-scroll
    await page.click('[data-testid="auto-scroll-toggle"]');
    await expect(page.locator('[data-testid="auto-scroll-indicator"]')).toBeVisible();
    
    // Test transposition in performance mode
    await page.click('[data-testid="transpose-up-button"]');
    await page.waitForTimeout(1000);
    
    // Verify transposition worked in performance mode
    const performanceContent = await page.textContent('[data-testid="performance-song-display"]');
    expect(performanceContent).toContain('[G#maj7]');
    
    // Test chord diagram visibility in performance mode
    const chordDiagrams = page.locator('[data-testid="performance-chord-diagrams"]');
    if (await chordDiagrams.isVisible()) {
      await expect(chordDiagrams.locator('[data-testid="chord-diagram"]')).toHaveCount(8);
    }
    
    // Test fullscreen toggle
    await page.click('[data-testid="fullscreen-button"]');
    await page.waitForTimeout(1000);
    
    // Test keyboard shortcuts in performance mode
    await page.keyboard.press('ArrowUp'); // Should transpose up
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowDown'); // Should transpose down
    await page.waitForTimeout(500);
    
    // Exit performance mode
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="performance-mode-container"]')).not.toBeVisible();
  });

  test('Mobile responsive collaboration workflow', async ({ browser }) => {
    // Create mobile context
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone dimensions
      isMobile: true,
      hasTouch: true
    });
    
    const desktopContext = await browser.newContext();
    
    const mobilePage = await mobileContext.newPage();
    const desktopPage = await desktopContext.newPage();

    try {
      // Desktop user creates song
      await registerAndLoginUser(desktopPage, testUsers.bandLeader);
      const songId = await createSongWithAdvancedFeatures(desktopPage, 'Mobile Collaboration Test');
      
      // Share with mobile user
      await desktopPage.click('[data-testid="share-song-button"]');
      await desktopPage.fill('[data-testid="collaborator-email-input"]', testUsers.musician1.email);
      await desktopPage.selectOption('[data-testid="permission-select"]', 'edit');
      await desktopPage.click('[data-testid="add-collaborator-button"]');
      
      // Mobile user accesses song
      await registerAndLoginUser(mobilePage, testUsers.musician1);
      await mobilePage.goto(`${BASE_URL}/#songs/${songId}`);
      
      // Verify mobile interface is responsive
      await expect(mobilePage.locator('[data-testid="song-title"]')).toBeVisible();
      await expect(mobilePage.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // Test mobile editing
      await mobilePage.click('[data-testid="edit-song-button"]');
      
      // Mobile touch editing
      await mobilePage.tap('[data-testid="song-content-input"]');
      const mobileContent = await mobilePage.inputValue('[data-testid="song-content-input"]');
      const newMobileContent = mobileContent + '\n\n{comment: Mobile edit}\n[Am]Added from [F]mobile [C]device [G]';
      await mobilePage.fill('[data-testid="song-content-input"]', newMobileContent);
      await mobilePage.click('[data-testid="save-song-button"]');
      
      // Desktop sees mobile changes
      await desktopPage.waitForTimeout(2000);
      const desktopContent = await desktopPage.textContent('[data-testid="song-content"]');
      expect(desktopContent).toContain('Mobile edit');
      
      // Test mobile performance mode
      await mobilePage.click('[data-testid="performance-mode-button"]');
      await expect(mobilePage.locator('[data-testid="performance-mode-container"]')).toBeVisible();
      
      // Mobile performance mode should have touch-friendly controls
      await expect(mobilePage.locator('[data-testid="mobile-performance-controls"]')).toBeVisible();
      
      // Test mobile transposition
      await mobilePage.tap('[data-testid="transpose-up-button"]');
      await mobilePage.waitForTimeout(1000);
      
      const mobilePerformanceContent = await mobilePage.textContent('[data-testid="performance-song-display"]');
      expect(mobilePerformanceContent).toContain('[G#maj7]');
      
    } finally {
      await mobileContext.close();
      await desktopContext.close();
    }
  });

  test('Cross-browser compatibility for advanced features', async ({ browser }) => {
    // This test focuses on features that might have browser compatibility issues
    await registerAndLoginUser(page, testUsers.bandLeader);
    const songId = await createSongWithAdvancedFeatures(page, 'Cross-Browser Test');
    
    // Test advanced chord diagram rendering
    await expect(page.locator('[data-testid="chord-diagram-panel"]')).toBeVisible();
    
    // Verify SVG chord diagrams render correctly
    const chordDiagrams = page.locator('[data-testid="chord-diagram"] svg');
    await expect(chordDiagrams.first()).toBeVisible();
    
    // Test CSS transforms for transposition animation
    await page.click('[data-testid="transpose-up-button"]');
    
    // Check for CSS transitions/animations
    const chordPanel = page.locator('[data-testid="chord-diagram-panel"]');
    await expect(chordPanel).toHaveCSS('transition-duration', /\d+s/);
    
    // Test fullscreen API compatibility
    await page.click('[data-testid="performance-mode-button"]');
    await page.click('[data-testid="fullscreen-button"]');
    
    // Test local storage for performance mode settings
    await page.click('[data-testid="increase-font-size"]');
    await page.reload();
    
    // Settings should persist
    await page.click('[data-testid="performance-mode-button"]');
    const fontSizeDisplay = page.locator('[data-testid="font-size-display"]');
    await expect(fontSizeDisplay).toContainText('Large');
    
    // Test Web Audio API features if available
    const audioSyncButton = page.locator('[data-testid="audio-sync-button"]');
    if (await audioSyncButton.isVisible()) {
      await audioSyncButton.click();
      
      // Should not throw errors even if Web Audio API is limited
      await expect(page.locator('[data-testid="audio-sync-error"]')).not.toBeVisible();
    }
  });

  test('Load testing simulation with multiple features', async ({ browser }) => {
    // Create multiple contexts to simulate load
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);
    
    const pages = await Promise.all(contexts.map(context => context.newPage()));

    try {
      // All users login and access the same song
      await Promise.all(pages.map((page, index) => 
        registerAndLoginUser(page, Object.values(testUsers)[index])
      ));
      
      // First user creates a song
      const songId = await createSongWithAdvancedFeatures(pages[0], 'Load Test Song');
      
      // Share with other users
      for (let i = 1; i < pages.length; i++) {
        await pages[0].click('[data-testid="share-song-button"]');
        await pages[0].fill('[data-testid="collaborator-email-input"]', Object.values(testUsers)[i].email);
        await pages[0].selectOption('[data-testid="permission-select"]', 'edit');
        await pages[0].click('[data-testid="add-collaborator-button"]');
      }
      
      // All users navigate to the same song simultaneously
      await Promise.all(pages.slice(1).map(page => 
        page.goto(`${BASE_URL}/#songs/${songId}`)
      ));
      
      // Simulate concurrent interactions
      const actions = pages.map(async (page, index) => {
        // Each user performs different actions
        switch (index) {
          case 0:
            // User 0: Frequent transpositions
            for (let i = 0; i < 3; i++) {
              await page.click('[data-testid="transpose-up-button"]');
              await page.waitForTimeout(500);
              await page.click('[data-testid="transpose-down-button"]');
              await page.waitForTimeout(500);
            }
            break;
          
          case 1:
            // User 1: Performance mode usage
            await page.click('[data-testid="performance-mode-button"]');
            await page.waitForTimeout(1000);
            await page.click('[data-testid="increase-font-size"]');
            await page.waitForTimeout(500);
            await page.click('[data-testid="auto-scroll-toggle"]');
            await page.waitForTimeout(1000);
            await page.keyboard.press('Escape');
            break;
          
          case 2:
            // User 2: Editing content
            await page.click('[data-testid="edit-song-button"]');
            const content = await page.inputValue('[data-testid="song-content-input"]');
            await page.fill('[data-testid="song-content-input"]', content + '\n{comment: Load test edit}');
            await page.click('[data-testid="save-song-button"]');
            break;
        }
      });
      
      // Wait for all actions to complete
      await Promise.all(actions);
      
      // Verify the application remained responsive
      await Promise.all(pages.map(page => 
        expect(page.locator('[data-testid="song-title"]')).toBeVisible()
      ));
      
      // Check that all features still work
      await pages[0].click('[data-testid="transpose-up-button"]');
      await pages[0].waitForTimeout(1000);
      
      const finalContent = await pages[0].textContent('[data-testid="song-content"]');
      expect(finalContent).toContain('[G#maj7]'); // Transposition should still work
      
    } finally {
      await Promise.all(contexts.map(context => context.close()));
    }
  });
});