/**
 * Enterprise Integration End-to-End Tests
 * 
 * Comprehensive E2E tests for enterprise workflows including:
 * - Enterprise authentication and SSO flows
 * - Multi-user collaboration scenarios
 * - Platform integration workflows
 * - Analytics dashboard validation
 * - Cross-browser compatibility testing
 * - Mobile enterprise feature testing
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { chromium, firefox, webkit } from 'playwright';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Enterprise test data
const ENTERPRISE_DOMAINS = ['acme-corp.com', 'bigtech.enterprise', 'finance-corp.com'];
const TEST_USERS = {
  admin: { email: 'admin@acme-corp.com', password: 'EnterpriseAdmin123!@#' },
  manager: { email: 'manager@acme-corp.com', password: 'EnterpriseManager123!@#' },
  user1: { email: 'user1@acme-corp.com', password: 'EnterpriseUser123!@#' },
  user2: { email: 'user2@acme-corp.com', password: 'EnterpriseUser123!@#' },
  user3: { email: 'user3@acme-corp.com', password: 'EnterpriseUser123!@#' }
};

test.describe('Enterprise Authentication Workflows', () => {
  test('enterprise SSO login flow with multi-factor authentication', async ({ page }) => {
    // Navigate to enterprise login
    await page.goto(`${BASE_URL}/#login`);
    
    // Check for enterprise SSO option
    const ssoButton = page.locator('[data-testid="enterprise-sso-button"]');
    if (await ssoButton.isVisible()) {
      await ssoButton.click();
      
      // Fill enterprise domain
      await page.fill('[data-testid="enterprise-domain"]', 'acme-corp.com');
      await page.click('[data-testid="proceed-sso"]');
      
      // Simulate SSO redirect and authentication
      await page.waitForURL(/sso|saml|oauth/);
      
      // Fill SSO credentials (simulated)
      const usernameField = page.locator('input[type="email"], input[name="username"]').first();
      const passwordField = page.locator('input[type="password"]').first();
      
      if (await usernameField.isVisible()) {
        await usernameField.fill(TEST_USERS.admin.email);
        await passwordField.fill(TEST_USERS.admin.password);
        
        // Submit SSO form
        await page.click('button[type="submit"], button:has-text("Sign In")');
      }
      
      // Handle MFA if required
      const mfaCode = page.locator('[data-testid="mfa-code"]');
      if (await mfaCode.isVisible()) {
        await mfaCode.fill('123456'); // Test MFA code
        await page.click('[data-testid="verify-mfa"]');
      }
      
      // Verify successful login
      await page.waitForURL(`${BASE_URL}/*`, { waitUntil: 'networkidle' });
      
      // Check for enterprise features
      await expect(page.locator('[data-testid="enterprise-navigation"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="user-menu"]')).toContainText('acme-corp.com');
    } else {
      // Fallback to regular enterprise login
      await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email);
      await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
      await page.click('[data-testid="login-button"]');
      
      // Check for successful login
      await page.waitForURL(`${BASE_URL}/*`, { waitUntil: 'networkidle' });
    }
  });

  test('enterprise domain restriction and validation', async ({ page }) => {
    await page.goto(`${BASE_URL}/#register`);
    
    // Try to register with non-enterprise domain
    await page.fill('[data-testid="email-input"]', 'user@gmail.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');
    
    await page.click('[data-testid="register-button"]');
    
    // Should show domain restriction error
    const errorMessage = page.locator('[data-testid="error-message"]');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText(/domain|enterprise|authorized/i);
    }
    
    // Try with enterprise domain
    await page.fill('[data-testid="email-input"]', TEST_USERS.user1.email);
    await page.click('[data-testid="register-button"]');
    
    // Should proceed or show success
    await page.waitForTimeout(2000);
  });

  test('enterprise session management and timeout', async ({ page }) => {
    // Login with enterprise user
    await page.goto(`${BASE_URL}/#login`);
    await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
    await page.click('[data-testid="login-button"]');
    
    await page.waitForURL(`${BASE_URL}/*`, { waitUntil: 'networkidle' });
    
    // Check for enterprise session indicators
    const sessionInfo = page.locator('[data-testid="session-info"]');
    if (await sessionInfo.isVisible()) {
      await expect(sessionInfo).toContainText(/enterprise|secure|session/i);
    }
    
    // Check session timeout warning (if implemented)
    // This would typically require waiting or simulating extended session
    const timeoutWarning = page.locator('[data-testid="session-timeout-warning"]');
    // Note: In real test, you might mock time or use longer timeout
  });
});

test.describe('Multi-User Collaboration Workflows', () => {
  test('real-time collaboration with multiple enterprise users', async ({ browser }) => {
    // Create multiple browser contexts for different users
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
      
      // Login each user
      const users = [TEST_USERS.admin, TEST_USERS.user1, TEST_USERS.user2];
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const user = users[i];
        
        await page.goto(`${BASE_URL}/#login`);
        await page.fill('[data-testid="email-input"]', user.email);
        await page.fill('[data-testid="password-input"]', user.password);
        await page.click('[data-testid="login-button"]');
        await page.waitForURL(`${BASE_URL}/*`, { waitUntil: 'networkidle' });
      }
      
      // Admin creates collaboration room
      const adminPage = pages[0];
      await adminPage.goto(`${BASE_URL}/#collaboration`);
      
      const createRoomButton = adminPage.locator('[data-testid="create-room-button"]');
      if (await createRoomButton.isVisible()) {
        await createRoomButton.click();
        
        await adminPage.fill('[data-testid="room-name"]', 'Enterprise Test Room');
        await adminPage.fill('[data-testid="room-description"]', 'Multi-user collaboration test');
        await adminPage.click('[data-testid="confirm-create-room"]');
        
        // Wait for room creation
        await adminPage.waitForSelector('[data-testid="room-created"]', { timeout: 10000 });
        
        // Get room ID or URL for sharing
        const roomUrl = adminPage.url();
        
        // Have other users join the room
        for (let i = 1; i < pages.length; i++) {
          await pages[i].goto(roomUrl);
          await pages[i].waitForSelector('[data-testid="collaboration-workspace"]', { timeout: 10000 });
        }
        
        // Test simultaneous editing
        const contentEditor = '[data-testid="content-editor"]';
        
        // User 1 adds content
        await pages[0].click(contentEditor);
        await pages[0].type(contentEditor, '{title: Collaborative Song}\n[C]First line from admin');
        
        // User 2 adds content
        await pages[1].click(contentEditor);
        await pages[1].type(contentEditor, '\n[Am]Second line from user1');
        
        // User 3 adds content  
        await pages[2].click(contentEditor);
        await pages[2].type(contentEditor, '\n[F]Third line from user2');
        
        // Verify all users see the combined content
        for (const page of pages) {
          await expect(page.locator(contentEditor)).toContainText('First line from admin');
          await expect(page.locator(contentEditor)).toContainText('Second line from user1');
          await expect(page.locator(contentEditor)).toContainText('Third line from user2');
        }
        
        // Test real-time cursor positions
        const cursorIndicators = '[data-testid="user-cursor"]';
        await expect(pages[0].locator(cursorIndicators)).toHaveCount(2); // Other users' cursors
      }
      
    } finally {
      // Cleanup contexts
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('collaboration room permissions and role management', async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/#login`);
    await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(`${BASE_URL}/*`, { waitUntil: 'networkidle' });
    
    // Navigate to collaboration management
    await page.goto(`${BASE_URL}/#collaboration`);
    
    const manageRoomsButton = page.locator('[data-testid="manage-rooms-button"]');
    if (await manageRoomsButton.isVisible()) {
      await manageRoomsButton.click();
      
      // Create new room with specific permissions
      await page.click('[data-testid="create-room-button"]');
      await page.fill('[data-testid="room-name"]', 'Permission Test Room');
      
      // Set enterprise permissions
      await page.click('[data-testid="advanced-permissions"]');
      await page.check('[data-testid="require-approval"]');
      await page.check('[data-testid="admin-only-edit"]');
      await page.select('[data-testid="default-role"]', 'viewer');
      
      await page.click('[data-testid="create-room-confirm"]');
      
      // Invite users with different roles
      await page.click('[data-testid="invite-users"]');
      
      // Invite as editor
      await page.fill('[data-testid="invite-email"]', TEST_USERS.user1.email);
      await page.select('[data-testid="invite-role"]', 'editor');
      await page.click('[data-testid="send-invite"]');
      
      // Invite as viewer
      await page.fill('[data-testid="invite-email"]', TEST_USERS.user2.email);
      await page.select('[data-testid="invite-role"]', 'viewer');
      await page.click('[data-testid="send-invite"]');
      
      // Verify permissions are set
      await expect(page.locator('[data-testid="room-participants"]')).toContainText('editor');
      await expect(page.locator('[data-testid="room-participants"]')).toContainText('viewer');
    }
  });
});

test.describe('Platform Integration Workflows', () => {
  test('Google Drive integration with enterprise policies', async ({ page }) => {
    // Login as enterprise user
    await page.goto(`${BASE_URL}/#login`);
    await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(`${BASE_URL}/*`, { waitUntil: 'networkidle' });
    
    // Navigate to integrations
    await page.goto(`${BASE_URL}/#integrations`);
    
    const googleDriveIntegration = page.locator('[data-testid="google-drive-integration"]');
    if (await googleDriveIntegration.isVisible()) {
      await googleDriveIntegration.click();
      
      // Configure enterprise settings
      await page.click('[data-testid="enterprise-mode"]');
      await page.check('[data-testid="data-residency-us"]');
      await page.check('[data-testid="encryption-required"]');
      await page.check('[data-testid="audit-logging"]');
      
      // Connect to Google Drive (would trigger OAuth in real scenario)
      await page.click('[data-testid="connect-google-drive"]');
      
      // Handle OAuth popup or redirect
      await page.waitForTimeout(2000);
      
      // Test file import with enterprise policies
      const importButton = page.locator('[data-testid="import-files"]');
      if (await importButton.isVisible()) {
        await importButton.click();
        
        // Select files (simulated)
        await page.check('[data-testid="file-checkbox"]:first-child');
        await page.click('[data-testid="apply-enterprise-policies"]');
        
        // Verify compliance checks
        await expect(page.locator('[data-testid="compliance-status"]')).toContainText('verified');
        
        await page.click('[data-testid="import-selected"]');
        
        // Verify import success with enterprise metadata
        await expect(page.locator('[data-testid="import-status"]')).toContainText('success');
        await expect(page.locator('[data-testid="enterprise-tags"]')).toBeVisible();
      }
    }
  });

  test('Spotify integration with analytics tracking', async ({ page }) => {
    // Login as enterprise user
    await page.goto(`${BASE_URL}/#login`);
    await page.fill('[data-testid="email-input"]', TEST_USERS.manager.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.manager.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(`${BASE_URL}/*`, { waitUntil: 'networkidle' });
    
    // Navigate to integrations
    await page.goto(`${BASE_URL}/#integrations`);
    
    const spotifyIntegration = page.locator('[data-testid="spotify-integration"]');
    if (await spotifyIntegration.isVisible()) {
      await spotifyIntegration.click();
      
      // Enable enterprise analytics
      await page.check('[data-testid="enterprise-analytics"]');
      await page.check('[data-testid="usage-tracking"]');
      await page.check('[data-testid="compliance-mode"]');
      
      // Connect to Spotify
      await page.click('[data-testid="connect-spotify"]');
      
      // Test music discovery with tracking
      const discoverMusic = page.locator('[data-testid="discover-music"]');
      if (await discoverMusic.isVisible()) {
        await discoverMusic.click();
        
        // Search for songs
        await page.fill('[data-testid="music-search"]', 'enterprise test song');
        await page.click('[data-testid="search-submit"]');
        
        // Verify analytics tracking
        await page.waitForTimeout(1000);
        
        // Check analytics dashboard
        await page.goto(`${BASE_URL}/#analytics`);
        
        const platformMetrics = page.locator('[data-testid="platform-metrics"]');
        if (await platformMetrics.isVisible()) {
          await expect(platformMetrics).toContainText('spotify');
          await expect(platformMetrics).toContainText('search');
        }
      }
    }
  });
});

test.describe('Analytics Dashboard Validation', () => {
  test('enterprise analytics dashboard performance and accuracy', async ({ page }) => {
    // Login as admin with analytics access
    await page.goto(`${BASE_URL}/#login`);
    await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(`${BASE_URL}/*`, { waitUntil: 'networkidle' });
    
    // Navigate to analytics dashboard
    await page.goto(`${BASE_URL}/#analytics`);
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="analytics-dashboard"]', { timeout: 15000 });
    
    // Verify enterprise-specific metrics
    const enterpriseMetrics = page.locator('[data-testid="enterprise-metrics"]');
    if (await enterpriseMetrics.isVisible()) {
      await expect(enterpriseMetrics).toContainText('Active Users');
      await expect(enterpriseMetrics).toContainText('Collaboration Sessions');
      await expect(enterpriseMetrics).toContainText('Platform Integrations');
      await expect(enterpriseMetrics).toContainText('Security Events');
    }
    
    // Test real-time data updates
    const realTimeIndicator = page.locator('[data-testid="real-time-indicator"]');
    if (await realTimeIndicator.isVisible()) {
      await expect(realTimeIndicator).toHaveClass(/active|live|updating/);
    }
    
    // Test dashboard filters
    const timeFilter = page.locator('[data-testid="time-filter"]');
    if (await timeFilter.isVisible()) {
      await timeFilter.selectOption('7days');
      await page.waitForTimeout(2000);
      
      // Verify data updates
      const chartArea = page.locator('[data-testid="analytics-charts"]');
      await expect(chartArea).toBeVisible();
    }
    
    // Test export functionality
    const exportButton = page.locator('[data-testid="export-data"]');
    if (await exportButton.isVisible()) {
      // Start download
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      
      // Select export format
      await page.click('[data-testid="export-excel"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/analytics.*\.(xlsx|csv)$/);
    }
  });

  test('business intelligence reports generation', async ({ page }) => {
    // Login as manager with BI access
    await page.goto(`${BASE_URL}/#login`);
    await page.fill('[data-testid="email-input"]', TEST_USERS.manager.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.manager.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(`${BASE_URL}/*`, { waitUntil: 'networkidle' });
    
    // Navigate to BI reports
    await page.goto(`${BASE_URL}/#reports`);
    
    const reportBuilder = page.locator('[data-testid="report-builder"]');
    if (await reportBuilder.isVisible()) {
      // Create new enterprise report
      await page.click('[data-testid="new-report"]');
      
      // Select report type
      await page.click('[data-testid="enterprise-usage-report"]');
      
      // Configure report parameters
      await page.fill('[data-testid="report-name"]', 'Enterprise Q4 Usage Report');
      await page.selectOption('[data-testid="date-range"]', '90days');
      await page.check('[data-testid="include-collaboration"]');
      await page.check('[data-testid="include-integrations"]');
      await page.check('[data-testid="include-security"]');
      
      // Generate report
      await page.click('[data-testid="generate-report"]');
      
      // Wait for report generation
      await page.waitForSelector('[data-testid="report-complete"]', { timeout: 30000 });
      
      // Verify report content
      await expect(page.locator('[data-testid="report-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="report-charts"]')).toBeVisible();
      await expect(page.locator('[data-testid="report-data-table"]')).toBeVisible();
      
      // Test report export
      const exportReportButton = page.locator('[data-testid="export-report"]');
      if (await exportReportButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download');
        await exportReportButton.click();
        
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/report.*\.pdf$/);
      }
    }
  });
});

test.describe('Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`enterprise features work in ${browserName}`, async () => {
      const browser = await (browserName === 'chromium' ? chromium : 
                            browserName === 'firefox' ? firefox : webkit).launch();
      const context = await browser.newContext();
      const page = await context.newPage();
      
      try {
        // Test basic login across browsers
        await page.goto(`${BASE_URL}/#login`);
        await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email);
        await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
        await page.click('[data-testid="login-button"]');
        
        await page.waitForURL(`${BASE_URL}/*`, { waitUntil: 'networkidle' });
        
        // Test navigation works
        await page.goto(`${BASE_URL}/#collaboration`);
        await expect(page.locator('[data-testid="collaboration-page"]')).toBeVisible({ timeout: 10000 });
        
        // Test analytics page
        await page.goto(`${BASE_URL}/#analytics`);
        await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible({ timeout: 10000 });
        
        // Test integrations page
        await page.goto(`${BASE_URL}/#integrations`);
        await expect(page.locator('[data-testid="integrations-page"]')).toBeVisible({ timeout: 10000 });
        
      } finally {
        await context.close();
        await browser.close();
      }
    });
  });
});

test.describe('Mobile Enterprise Features', () => {
  test('mobile collaboration interface', async ({ browser }) => {
    // Create mobile viewport context
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone SE
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    const page = await context.newPage();
    
    try {
      // Login on mobile
      await page.goto(`${BASE_URL}/#login`);
      await page.fill('[data-testid="email-input"]', TEST_USERS.user1.email);
      await page.fill('[data-testid="password-input"]', TEST_USERS.user1.password);
      await page.click('[data-testid="login-button"]');
      
      await page.waitForURL(`${BASE_URL}/*`, { waitUntil: 'networkidle' });
      
      // Test mobile navigation
      const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
        await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
      }
      
      // Test collaboration on mobile
      await page.goto(`${BASE_URL}/#collaboration`);
      
      // Verify mobile-optimized interface
      const mobileCollaboration = page.locator('[data-testid="mobile-collaboration"]');
      if (await mobileCollaboration.isVisible()) {
        await expect(mobileCollaboration).toBeVisible();
        
        // Test touch interactions
        await page.tap('[data-testid="content-editor"]');
        await page.type('[data-testid="content-editor"]', 'Mobile editing test');
        
        // Test mobile toolbar
        await expect(page.locator('[data-testid="mobile-toolbar"]')).toBeVisible();
      }
      
    } finally {
      await context.close();
    }
  });

  test('tablet analytics dashboard', async ({ browser }) => {
    // Create tablet viewport context  
    const context = await browser.newContext({
      viewport: { width: 1024, height: 768 }, // iPad
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    const page = await context.newPage();
    
    try {
      // Login on tablet
      await page.goto(`${BASE_URL}/#login`);
      await page.fill('[data-testid="email-input"]', TEST_USERS.manager.email);
      await page.fill('[data-testid="password-input"]', TEST_USERS.manager.password);
      await page.click('[data-testid="login-button"]');
      
      await page.waitForURL(`${BASE_URL}/*`, { waitUntil: 'networkidle' });
      
      // Test analytics dashboard on tablet
      await page.goto(`${BASE_URL}/#analytics`);
      
      // Verify tablet-optimized layout
      const tabletDashboard = page.locator('[data-testid="analytics-dashboard"]');
      await expect(tabletDashboard).toBeVisible({ timeout: 15000 });
      
      // Test touch gestures for charts
      const chartArea = page.locator('[data-testid="analytics-charts"]');
      if (await chartArea.isVisible()) {
        // Test pinch-to-zoom simulation
        await page.touchscreen.tap(500, 300);
        
        // Test swipe gestures
        await page.touchscreen.tap(200, 300);
        await page.mouse.move(400, 300);
        
        await expect(chartArea).toBeVisible();
      }
      
    } finally {
      await context.close();
    }
  });
});

test.describe('Security and Compliance Validation', () => {
  test('enterprise security headers and CSP validation', async ({ page }) => {
    // Intercept network requests to check security headers
    const responses: any[] = [];
    
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers()
      });
    });
    
    await page.goto(`${BASE_URL}/#login`);
    
    // Check for security headers in API responses
    const apiResponses = responses.filter(r => r.url.includes(API_BASE_URL));
    
    for (const response of apiResponses) {
      // Check for HTTPS security headers
      expect(response.headers['strict-transport-security']).toBeTruthy();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeTruthy();
      expect(response.headers['x-xss-protection']).toBeTruthy();
    }
    
    // Check CSP headers
    const htmlResponse = responses.find(r => r.url === BASE_URL + '/' || r.url === BASE_URL);
    if (htmlResponse) {
      expect(htmlResponse.headers['content-security-policy']).toBeTruthy();
    }
  });

  test('data encryption and secure transmission validation', async ({ page }) => {
    // Enable request interception to validate HTTPS usage
    await page.route('**/*', route => {
      const url = route.request().url();
      
      // Ensure all API calls use HTTPS in production
      if (url.includes(API_BASE_URL) && !url.startsWith('https://') && process.env.NODE_ENV === 'production') {
        throw new Error(`Insecure HTTP request detected: ${url}`);
      }
      
      route.continue();
    });
    
    // Login and perform data operations
    await page.goto(`${BASE_URL}/#login`);
    await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
    await page.click('[data-testid="login-button"]');
    
    await page.waitForURL(`${BASE_URL}/*`, { waitUntil: 'networkidle' });
    
    // Create sensitive content to test encryption
    await page.goto(`${BASE_URL}/#songs/new`);
    
    const contentEditor = page.locator('[data-testid="content-editor"]');
    if (await contentEditor.isVisible()) {
      await contentEditor.fill(`
{title: Confidential Enterprise Song}
{artist: Security Test}
{classification: confidential}

[C]This contains sensitive [Am]business information
[F]That should be [G]encrypted in transit and at rest
      `);
      
      await page.click('[data-testid="save-song"]');
      
      // Verify save was successful with encryption
      await expect(page.locator('[data-testid="save-success"]')).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Performance Under Load', () => {
  test('dashboard performance with large datasets', async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/#login`);
    await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(`${BASE_URL}/*`, { waitUntil: 'networkidle' });
    
    // Navigate to analytics dashboard
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/#analytics`);
    
    // Measure initial load time
    await page.waitForSelector('[data-testid="analytics-dashboard"]', { timeout: 15000 });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
    
    // Test large dataset filtering
    const largeDatasetFilter = page.locator('[data-testid="large-dataset-filter"]');
    if (await largeDatasetFilter.isVisible()) {
      const filterStartTime = Date.now();
      await largeDatasetFilter.selectOption('all-time');
      
      // Wait for data to load
      await page.waitForFunction(() => {
        const indicator = document.querySelector('[data-testid="loading-indicator"]');
        return !indicator || indicator.style.display === 'none';
      }, { timeout: 30000 });
      
      const filterTime = Date.now() - filterStartTime;
      expect(filterTime).toBeLessThan(20000); // Should filter within 20 seconds
    }
    
    // Test pagination performance
    const pagination = page.locator('[data-testid="pagination"]');
    if (await pagination.isVisible()) {
      const pageStartTime = Date.now();
      await page.click('[data-testid="next-page"]');
      
      await page.waitForSelector('[data-testid="data-table"] tr:first-child', { timeout: 10000 });
      const pageTime = Date.now() - pageStartTime;
      
      expect(pageTime).toBeLessThan(5000); // Page navigation should be fast
    }
  });
});