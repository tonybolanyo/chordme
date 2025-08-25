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

// Helper function to create a test song
async function createTestSong(page: any, title?: string, content?: string) {
  const songTitle = title || `Test Song ${Date.now()}`;
  const songContent = content || `{title: ${songTitle}}
{artist: Test Artist}
{key: C}

[C]Hello [G]world
This is a [Am]test [F]song
[C]Testing [G]PDF [Am]export [F]feature`;

  // Click Create New Song button
  await page.click('button:has-text("Create New Song")');
  
  // Fill in song details
  await page.fill('input[name="title"]', songTitle);
  await page.fill('textarea[name="content"]', songContent);
  
  // Click Create Song button
  await page.click('button:has-text("Create Song")');
  
  // Wait for song creation to complete
  await page.waitForTimeout(1000);
  
  return { title: songTitle, content: songContent };
}

test.describe('PDF Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API route intercepts for PDF export functionality
    await page.route('**/api/v1/songs/*/export/pdf*', async (route) => {
      // Mock successful PDF export response
      const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000108 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n187\n%%EOF');
      
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="test-song.pdf"'
        },
        body: pdfContent
      });
    });
  });

  test('should display PDF export button for songs', async ({ page }) => {
    // Login and create a test song
    await registerAndLoginTestUser(page);
    await createTestSong(page);
    
    // Check if PDF export button is visible in song list
    const pdfButton = page.locator('button:has-text("PDF")').first();
    await expect(pdfButton).toBeVisible();
    await expect(pdfButton).toHaveAttribute('title', 'Export as PDF');
  });

  test('should open PDF export modal when clicking PDF button', async ({ page }) => {
    // Login and create a test song
    await registerAndLoginTestUser(page);
    await createTestSong(page);
    
    // Click PDF export button
    await page.click('button:has-text("PDF")');
    
    // Check if PDF export modal is opened
    await expect(page.locator('text=Export as PDF')).toBeVisible();
    await expect(page.locator('select[id="pdf-paper-size"]')).toBeVisible();
    await expect(page.locator('select[id="pdf-orientation"]')).toBeVisible();
    await expect(page.locator('input[id="pdf-title"]')).toBeVisible();
    await expect(page.locator('input[id="pdf-artist"]')).toBeVisible();
  });

  test('should show default values in PDF export modal', async ({ page }) => {
    // Login and create a test song
    await registerAndLoginTestUser(page);
    const testSong = await createTestSong(page, 'My Test Song');
    
    // Click PDF export button
    await page.click('button:has-text("PDF")');
    
    // Check default values
    await expect(page.locator('select[id="pdf-paper-size"]')).toHaveValue('a4');
    await expect(page.locator('select[id="pdf-orientation"]')).toHaveValue('portrait');
    await expect(page.locator('input[id="pdf-title"]')).toHaveValue(testSong.title);
    await expect(page.locator('input[id="pdf-artist"]')).toHaveValue('');
  });

  test('should allow changing export options', async ({ page }) => {
    // Login and create a test song
    await registerAndLoginTestUser(page);
    await createTestSong(page);
    
    // Click PDF export button
    await page.click('button:has-text("PDF")');
    
    // Change paper size
    await page.selectOption('select[id="pdf-paper-size"]', 'letter');
    await expect(page.locator('select[id="pdf-paper-size"]')).toHaveValue('letter');
    
    // Change orientation
    await page.selectOption('select[id="pdf-orientation"]', 'landscape');
    await expect(page.locator('select[id="pdf-orientation"]')).toHaveValue('landscape');
    
    // Change title
    await page.fill('input[id="pdf-title"]', 'Custom Title');
    await expect(page.locator('input[id="pdf-title"]')).toHaveValue('Custom Title');
    
    // Change artist
    await page.fill('input[id="pdf-artist"]', 'Custom Artist');
    await expect(page.locator('input[id="pdf-artist"]')).toHaveValue('Custom Artist');
  });

  test('should trigger PDF export when clicking Export PDF button', async ({ page }) => {
    // Login and create a test song
    await registerAndLoginTestUser(page);
    await createTestSong(page);
    
    // Set up download handling
    const downloadPromise = page.waitForEvent('download');
    
    // Click PDF export button
    await page.click('button:has-text("PDF")');
    
    // Set custom options
    await page.selectOption('select[id="pdf-paper-size"]', 'letter');
    await page.selectOption('select[id="pdf-orientation"]', 'landscape');
    await page.fill('input[id="pdf-artist"]', 'Test Artist');
    
    // Click Export PDF button
    await page.click('button:has-text("Export PDF")');
    
    // Wait for download to start
    const download = await downloadPromise;
    
    // Verify download properties
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    expect(await download.path()).toBeTruthy();
  });

  test('should close modal when clicking Cancel', async ({ page }) => {
    // Login and create a test song
    await registerAndLoginTestUser(page);
    await createTestSong(page);
    
    // Click PDF export button
    await page.click('button:has-text("PDF")');
    
    // Verify modal is open
    await expect(page.locator('text=Export as PDF')).toBeVisible();
    
    // Click Cancel button
    await page.click('button:has-text("Cancel")');
    
    // Verify modal is closed
    await expect(page.locator('text=Export as PDF')).not.toBeVisible();
  });

  test('should close modal when clicking X button', async ({ page }) => {
    // Login and create a test song
    await registerAndLoginTestUser(page);
    await createTestSong(page);
    
    // Click PDF export button
    await page.click('button:has-text("PDF")');
    
    // Verify modal is open
    await expect(page.locator('text=Export as PDF')).toBeVisible();
    
    // Click X button
    await page.click('.modal-close-btn');
    
    // Verify modal is closed
    await expect(page.locator('text=Export as PDF')).not.toBeVisible();
  });

  test('should show loading state during PDF export', async ({ page }) => {
    // Login and create a test song
    await registerAndLoginTestUser(page);
    await createTestSong(page);
    
    // Set up slow response for PDF export
    await page.route('**/api/v1/songs/*/export/pdf*', async (route) => {
      // Delay response by 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pdfContent = Buffer.from('%PDF-1.4\nTest PDF content');
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="test-song.pdf"'
        },
        body: pdfContent
      });
    });
    
    // Click PDF export button
    await page.click('button:has-text("PDF")');
    
    // Click Export PDF button
    await page.click('button:has-text("Export PDF")');
    
    // Check for loading state
    await expect(page.locator('button:has-text("Exporting...")')).toBeVisible();
    await expect(page.locator('button:has-text("Export PDF"):disabled')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel"):disabled')).toBeVisible();
    
    // Wait for export to complete
    await page.waitForTimeout(2500);
  });

  test('should handle PDF export from song viewer', async ({ page }) => {
    // Login and create a test song
    await registerAndLoginTestUser(page);
    await createTestSong(page);
    
    // View the song
    await page.click('button:has-text("View")');
    
    // Check if PDF export button is visible in viewer
    await expect(page.locator('button:has-text("Export PDF")')).toBeVisible();
    
    // Set up download handling
    const downloadPromise = page.waitForEvent('download');
    
    // Click PDF export button in viewer
    await page.click('button:has-text("Export PDF")');
    
    // Modal should open
    await expect(page.locator('text=Export as PDF')).toBeVisible();
    
    // Export PDF
    await page.click('button:has-text("Export PDF")');
    
    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('should handle PDF export errors gracefully', async ({ page }) => {
    // Login and create a test song
    await registerAndLoginTestUser(page);
    await createTestSong(page);
    
    // Set up error response for PDF export
    await page.route('**/api/v1/songs/*/export/pdf*', async (route) => {
      await route.fulfill({
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'error',
          error: 'PDF generation failed'
        })
      });
    });
    
    // Click PDF export button
    await page.click('button:has-text("PDF")');
    
    // Click Export PDF button
    await page.click('button:has-text("Export PDF")');
    
    // Check for error message
    await expect(page.locator('text=PDF generation failed')).toBeVisible();
    
    // Modal should remain open for retry
    await expect(page.locator('text=Export as PDF')).toBeVisible();
  });

  test('should validate PDF export with comprehensive ChordPro content', async ({ page }) => {
    // Login and create a comprehensive test song
    await registerAndLoginTestUser(page);
    
    const comprehensiveContent = `{title: Amazing Grace}
{artist: John Newton}
{key: G}
{tempo: 90}

{comment: A beautiful hymn}

{sov}
A[G]mazing [G7]grace how [C]sweet the [G]sound
That [Em]saved a [C]wretch like [G]me
I [G]once was [G7]lost but [C]now am [G]found
Was [Em]blind but [C]now I [G]see
{eov}

{soc}
'Twas [G]grace that [G7]taught my [C]heart to [G]fear
And [Em]grace my [C]fears re[G]lieved
How [G]precious [G7]did that [C]grace ap[G]pear
The [Em]hour I [C]first be[G]lieved
{eoc}

{sob}
Through [G]many [G7]dangers, [C]toils and [G]snares
I [Em]have al[C]ready [G]come
'Tis [G]grace hath [G7]brought me [C]safe thus [G]far
And [Em]grace will [C]lead me [G]home
{eob}`;
    
    await createTestSong(page, 'Amazing Grace', comprehensiveContent);
    
    // Set up download handling
    const downloadPromise = page.waitForEvent('download');
    
    // Click PDF export button
    await page.click('button:has-text("PDF")');
    
    // Export with all available paper sizes
    for (const paperSize of ['a4', 'letter', 'legal']) {
      // Set paper size
      await page.selectOption('select[id="pdf-paper-size"]', paperSize);
      
      // Export PDF
      await page.click('button:has-text("Export PDF")');
      
      // Wait for download (first iteration)
      if (paperSize === 'a4') {
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.pdf$/);
      }
      
      // Wait for modal to close and reopen for next iteration
      if (paperSize !== 'legal') {
        await page.waitForTimeout(1000);
        await page.click('button:has-text("PDF")');
      }
    }
  });
});

test.describe('PDF Export API Integration', () => {
  test('should make correct API request with parameters', async ({ page }) => {
    // Capture API requests
    const requests: any[] = [];
    await page.route('**/api/v1/songs/*/export/pdf*', async (route) => {
      requests.push({
        url: route.request().url(),
        method: route.request().method(),
        headers: route.request().headers()
      });
      
      // Fulfill with mock response
      const pdfContent = Buffer.from('%PDF-1.4\nTest PDF');
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="test.pdf"'
        },
        body: pdfContent
      });
    });
    
    // Login and create a test song
    await registerAndLoginTestUser(page);
    await createTestSong(page);
    
    // Click PDF export button
    await page.click('button:has-text("PDF")');
    
    // Set custom options
    await page.selectOption('select[id="pdf-paper-size"]', 'letter');
    await page.selectOption('select[id="pdf-orientation"]', 'landscape');
    await page.fill('input[id="pdf-title"]', 'Custom Title');
    await page.fill('input[id="pdf-artist"]', 'Custom Artist');
    
    // Export PDF
    await page.click('button:has-text("Export PDF")');
    
    // Wait for request
    await page.waitForTimeout(1000);
    
    // Verify API request
    expect(requests).toHaveLength(1);
    const request = requests[0];
    
    expect(request.method).toBe('GET');
    expect(request.url).toContain('paper_size=letter');
    expect(request.url).toContain('orientation=landscape');
    expect(request.url).toContain('title=Custom%20Title');
    expect(request.url).toContain('artist=Custom%20Artist');
    expect(request.headers.authorization).toMatch(/^Bearer /);
  });
});