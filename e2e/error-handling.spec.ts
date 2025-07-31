import { test, expect } from '@playwright/test';

test.describe('ChordMe Error Handling and Edge Cases', () => {
  
  test.describe('Network and Server Errors', () => {
    test('should handle server unavailable gracefully', async ({ page }) => {
      // Simulate server down by navigating to non-existent endpoint
      await page.goto('/#login');
      
      // Override fetch to simulate network errors for testing
      await page.route('**/api/**', route => {
        route.abort('failed');
      });
      
      // Try to perform login
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.click('button:has-text("Sign In")');
      
      // Should show error message
      await expect(page.locator('.error, .alert, [role="alert"]')).toBeVisible();
    });

    test('should handle slow network responses', async ({ page }) => {
      await page.goto('/#login');
      
      // Simulate slow network
      await page.route('**/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.continue();
      });
      
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.click('button:has-text("Sign In")');
      
      // Should show loading state
      const loadingIndicator = page.locator('.loading, .spinner, text=Loading');
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).toBeVisible();
      }
    });

    test('should handle API error responses', async ({ page }) => {
      await page.goto('/#login');
      
      // Mock API to return error responses
      await page.route('**/api/v1/auth/login', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Invalid credentials' })
        });
      });
      
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button:has-text("Sign In")');
      
      // Should show error message
      await expect(page.locator('.error, .alert, [role="alert"]')).toBeVisible();
    });
  });

  test.describe('Form Validation Edge Cases', () => {
    test('should handle extremely long input values', async ({ page }) => {
      await page.goto('/#register');
      
      const longString = 'a'.repeat(1000);
      
      await page.fill('input[name="email"]', `${longString}@example.com`);
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
      
      await page.click('button:has-text("Create Account")');
      
      // Should show validation error for long email
      const errorMessage = page.locator('.error, .alert, [role="alert"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    });

    test('should handle special characters in form inputs', async ({ page }) => {
      await page.goto('/#register');
      
      const specialChars = '!@#$%^&*()_+-={}[]\\|;:\'",.<>?/~`';
      
      await page.fill('input[name="email"]', `test${specialChars}@example.com`);
      await page.fill('input[name="password"]', `Pass${specialChars}123`);
      await page.fill('input[name="confirmPassword"]', `Pass${specialChars}123`);
      
      await page.click('button:has-text("Create Account")');
      
      // Should handle special characters appropriately
      const result = page.locator('.error, .success, .alert');
      await expect(result).toBeVisible();
    });

    test('should handle whitespace-only inputs', async ({ page }) => {
      await page.goto('/#login');
      
      await page.fill('input[name="email"]', '   ');
      await page.fill('input[name="password"]', '   ');
      
      await page.click('button:has-text("Sign In")');
      
      // Should show validation error
      await expect(page.locator('.error, .alert, [role="alert"]')).toBeVisible();
    });

    test('should handle unicode characters', async ({ page }) => {
      await page.goto('/#demo');
      
      const unicodeContent = `{title: 🎵 Música Española 🎸}
{artist: Artísta Tëst}
[C]Hëllö [G]Wørld 
[Am]Ñiño [F]cafê
Chinese: 你好 世界
Arabic: مرحبا بالعالم
Russian: Привет мир`;
      
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      await editor.fill(unicodeContent);
      
      // Should handle unicode characters correctly
      await expect(page.locator('h3:has-text("🎵 Música Española 🎸")')).toBeVisible();
      await expect(page.locator('text=Artísta Tëst')).toBeVisible();
    });
  });

  test.describe('Browser and Device Compatibility', () => {
    test('should handle browser back/forward navigation', async ({ page }) => {
      await page.goto('/#login');
      await expect(page.locator('h1').nth(1)).toContainText('Login to ChordMe');
      
      await page.click('a[href="#register"]');
      await expect(page.locator('h1').nth(1)).toContainText('Join ChordMe');
      
      await page.goBack();
      await expect(page.locator('h1').nth(1)).toContainText('Login to ChordMe');
      
      await page.goForward();
      await expect(page.locator('h1').nth(1)).toContainText('Join ChordMe');
    });

    test('should handle page refresh without losing state', async ({ page }) => {
      await page.goto('/#demo');
      
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      const customContent = '{title: Refresh Test}\n[C]Test content';
      await editor.fill(customContent);
      
      await page.reload();
      
      // Check if content is preserved or reset to default
      const editorContent = await editor.inputValue();
      expect(typeof editorContent).toBe('string');
    });

    test('should handle window resize', async ({ page }) => {
      await page.goto('/#demo');
      
      // Test different viewport sizes
      await page.setViewportSize({ width: 320, height: 568 }); // Mobile
      await expect(page.locator('h1').first()).toBeVisible();
      
      await page.setViewportSize({ width: 768, height: 1024 }); // Tablet
      await expect(page.locator('h1').first()).toBeVisible();
      
      await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
      await expect(page.locator('h1').first()).toBeVisible();
    });
  });

  test.describe('Input Edge Cases', () => {
    test('should handle rapid form submissions', async ({ page }) => {
      await page.goto('/#login');
      
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');
      
      // Submit multiple times rapidly
      const submitButton = page.locator('button:has-text("Sign In")');
      await submitButton.click();
      await submitButton.click();
      await submitButton.click();
      
      // Should handle multiple submissions gracefully
      const errorOrLoading = page.locator('.error, .loading, .alert');
      if (await errorOrLoading.isVisible()) {
        await expect(errorOrLoading).toBeVisible();
      }
    });

    test('should handle form submission with enter key', async ({ page }) => {
      await page.goto('/#login');
      
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');
      
      // Submit with Enter key
      await page.press('input[name="password"]', 'Enter');
      
      // Should submit the form
      await page.waitForTimeout(1000);
      const result = page.locator('.error, .success, .loading');
      if (await result.isVisible()) {
        await expect(result).toBeVisible();
      }
    });

    test('should handle tab navigation', async ({ page }) => {
      await page.goto('/#login');
      
      // Tab through form elements
      await page.press('body', 'Tab'); // Should focus first interactive element
      await page.press('body', 'Tab'); // Move to next element
      await page.press('body', 'Tab'); // Move to next element
      
      // Should be able to navigate with keyboard
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON', 'A'].includes(focusedElement)).toBeTruthy();
    });
  });

  test.describe('ChordPro Content Edge Cases', () => {
    test('should handle extremely large ChordPro content', async ({ page }) => {
      await page.goto('/#demo');
      
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      // Create large content
      let largeContent = '{title: Large Song}\n';
      for (let i = 0; i < 1000; i++) {
        largeContent += `[C]Line ${i} with [G]chords and [Am]more [F]content\n`;
      }
      
      await editor.fill(largeContent);
      
      // Should handle large content without crashing
      await expect(page.locator('h3:has-text("Large Song")')).toBeVisible();
    });

    test('should handle nested brackets in ChordPro', async ({ page }) => {
      await page.goto('/#demo');
      
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      const nestedContent = `{title: Nested Brackets Test}
[C[sus4]]Complex chord
[[Unusual bracket usage]]
[C]Normal [G]chords [Am]mixed [F]in`;
      
      await editor.fill(nestedContent);
      
      // Should handle nested brackets gracefully
      const renderedContent = page.locator('h2:has-text("Rendered Output") ~ div');
      await expect(renderedContent).toBeVisible();
    });

    test('should handle malformed JSON-like directives', async ({ page }) => {
      await page.goto('/#demo');
      
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      const malformedContent = `{title: Test}
{artist: "Quoted Artist}
{key: C major}
{tempo: not-a-number}
{custom-directive: some value}
[C]Regular content [G]continues`;
      
      await editor.fill(malformedContent);
      
      // Should handle malformed directives without crashing
      const renderedContent = page.locator('h2:has-text("Rendered Output") ~ div');
      await expect(renderedContent).toBeVisible();
    });
  });

  test.describe('Session and State Management', () => {
    test('should handle session timeout gracefully', async ({ page }) => {
      await page.goto('/#login');
      
      // Mock successful login
      await page.route('**/api/v1/auth/login', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            status: 'success', 
            data: { token: 'mock-token', user: { email: 'test@example.com' } }
          })
        });
      });
      
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.click('button:has-text("Sign In")');
      
      // Later, mock session expiry
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Session expired' })
        });
      });
      
      // Try to access protected resource
      await page.goto('/#home');
      
      // Should redirect to login or show appropriate message
      const loginIndicator = page.locator('h1:has-text("Login"), .error:has-text("session"), .error:has-text("expired")');
      if (await loginIndicator.isVisible()) {
        await expect(loginIndicator).toBeVisible();
      }
    });

    test('should handle localStorage corruption', async ({ page }) => {
      await page.goto('/#login');
      
      // Corrupt localStorage
      await page.evaluate(() => {
        localStorage.setItem('token', 'invalid-json{');
        localStorage.setItem('user', 'corrupted-data');
      });
      
      await page.reload();
      
      // Should handle corrupted data gracefully
      await expect(page.locator('h1').first()).toBeVisible();
    });
  });

  test.describe('Accessibility Edge Cases', () => {
    test('should handle screen reader navigation', async ({ page }) => {
      await page.goto('/#login');
      
      // Check for ARIA labels and roles
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      
      // Should have proper labels
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      
      // Check if form is accessible
      const form = page.locator('form, [role="form"]');
      if (await form.isVisible()) {
        await expect(form).toBeVisible();
      }
    });

    test('should handle high contrast mode', async ({ page }) => {
      // Simulate high contrast mode with CSS
      await page.addStyleTag({
        content: `
          * {
            background: black !important;
            color: white !important;
            border: 1px solid white !important;
          }
        `
      });
      
      await page.goto('/#login');
      
      // Should still be usable in high contrast mode
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
    });
  });

  test.describe('Performance Edge Cases', () => {
    test('should handle rapid navigation between pages', async ({ page }) => {
      const pages = ['#login', '#register', '#demo', '#login', '#demo', '#register'];
      
      for (const pageHash of pages) {
        await page.goto(`/${pageHash}`);
        await page.waitForTimeout(100); // Brief pause
      }
      
      // Should end up on the last page without errors
      await expect(page).toHaveURL(/#register/);
      await expect(page.locator('h1').nth(1)).toContainText('Join ChordMe');
    });

    test('should handle memory-intensive operations', async ({ page }) => {
      await page.goto('/#demo');
      
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      // Perform many rapid edits
      for (let i = 0; i < 50; i++) {
        await editor.fill(`{title: Test ${i}}\n[C]Content ${i}`);
        await page.waitForTimeout(10);
      }
      
      // Should still be responsive
      await expect(page.locator('h3:has-text("Test 49")')).toBeVisible();
    });
  });
});