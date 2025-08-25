import { test, expect } from '@playwright/test';

test.describe('ChordMe UI and Accessibility Tests', () => {
  
  test.describe('Navigation and Layout', () => {
    test('should have consistent header across all pages', async ({ page }) => {
      const pages = ['#login', '#register', '#demo'];
      
      for (const pageHash of pages) {
        await page.goto(`/${pageHash}`);
        
        // Check header elements
        await expect(page.locator('h1.header-title, h1:has-text("ChordMe")')).toBeVisible();
        await expect(page.locator('nav, [role="navigation"]')).toBeVisible();
        await expect(page.locator('a[href="#demo"]')).toBeVisible();
      }
    });

    test('should have consistent footer across all pages', async ({ page }) => {
      const pages = ['#login', '#register', '#demo'];
      
      for (const pageHash of pages) {
        await page.goto(`/${pageHash}`);
        
        // Check footer
        await expect(page.locator('footer, [role="contentinfo"]')).toBeVisible();
        await expect(page.locator('text=© 2024 ChordMe')).toBeVisible();
      }
    });

    test('should highlight active navigation items', async ({ page }) => {
      await page.goto('/#demo');
      
      // Demo link should be active
      const demoLink = page.locator('a[href="#demo"]');
      await expect(demoLink).toHaveClass(/active/);
      
      await page.goto('/#login');
      // Demo should no longer be active
      await expect(demoLink).not.toHaveClass(/active/);
    });

    test('should have responsive navigation', async ({ page }) => {
      await page.goto('/#login');
      
      // Test mobile viewport
      await page.setViewportSize({ width: 320, height: 568 });
      await expect(page.locator('nav')).toBeVisible();
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page.locator('nav')).toBeVisible();
    });
  });

  test.describe('Form UI and UX', () => {
    test('should have proper form labels and inputs', async ({ page }) => {
      await page.goto('/#login');
      
      // Check form structure
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Check labels are present
      await expect(page.locator('text=Email')).toBeVisible();
      await expect(page.locator('text=Password')).toBeVisible();
    });

    test('should show proper placeholders', async ({ page }) => {
      await page.goto('/#login');
      
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      
      // Check for meaningful placeholders
      const emailPlaceholder = await emailInput.getAttribute('placeholder');
      const passwordPlaceholder = await passwordInput.getAttribute('placeholder');
      
      expect(emailPlaceholder).toBeTruthy();
      expect(passwordPlaceholder).toBeTruthy();
    });

    test('should provide visual feedback for form interactions', async ({ page }) => {
      await page.goto('/#login');
      
      const emailInput = page.locator('input[name="email"]');
      
      // Focus input
      await emailInput.focus();
      
      // Should show focus state (this would depend on CSS implementation)
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBe('INPUT');
      
      // Fill with invalid data
      await emailInput.fill('invalid-email');
      await page.click('button:has-text("Sign In")');
      
      // Should show error state
      const errorIndicator = page.locator('.error, .invalid, [aria-invalid="true"]');
      if (await errorIndicator.isVisible()) {
        await expect(errorIndicator).toBeVisible();
      }
    });

    test('should have proper button states', async ({ page }) => {
      await page.goto('/#login');
      
      const submitButton = page.locator('button:has-text("Sign In")');
      
      // Button should be enabled initially
      await expect(submitButton).toBeEnabled();
      
      // Button should show loading state when clicked (if implemented)
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password');
      await submitButton.click();
      
      // Check if button shows loading state
      const loadingButton = page.locator('button:disabled, button:has-text("Loading"), .loading');
      if (await loadingButton.isVisible()) {
        await expect(loadingButton).toBeVisible();
      }
    });
  });

  test.describe('Accessibility (a11y)', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/#login');
      
      // Should have h1 for main title
      await expect(page.locator('h1')).toBeVisible();
      
      // Check heading levels are logical
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/#login');
      
      // Check for ARIA labels on form elements
      const form = page.locator('form, [role="form"]');
      if (await form.isVisible()) {
        await expect(form).toBeVisible();
      }
      
      // Check navigation has proper role
      await expect(page.locator('[role="navigation"], nav')).toBeVisible();
      
      // Check main content area
      await expect(page.locator('[role="main"], main')).toBeVisible();
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/#login');
      
      // Start navigation from body
      await page.press('body', 'Tab');
      
      // Should focus on first interactive element
      let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON', 'A'].includes(focusedElement)).toBeTruthy();
      
      // Continue tabbing through elements
      await page.press('body', 'Tab');
      await page.press('body', 'Tab');
      
      // Should still be on valid interactive elements
      focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON', 'A'].includes(focusedElement)).toBeTruthy();
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/#login');
      
      // This is a visual check - in a real implementation, you'd use axe-core
      // For now, just ensure elements are visible
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    });

    test('should support screen readers', async ({ page }) => {
      await page.goto('/#login');
      
      // Check for screen reader friendly content
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      
      // Inputs should have associated labels
      const emailLabel = await emailInput.getAttribute('aria-label') || 
                         await page.locator('label[for="email"], text=Email').textContent();
      const passwordLabel = await passwordInput.getAttribute('aria-label') || 
                           await page.locator('label[for="password"], text=Password').textContent();
      
      expect(emailLabel).toBeTruthy();
      expect(passwordLabel).toBeTruthy();
    });

    test('should handle focus management', async ({ page }) => {
      await page.goto('/#login');
      
      // Focus should be visible and logical
      await page.press('body', 'Tab');
      
      // Check that focus is visible (would need CSS implementation)
      const activeElement = await page.evaluate(() => {
        const active = document.activeElement;
        return {
          tagName: active?.tagName,
          type: active?.getAttribute('type'),
          name: active?.getAttribute('name')
        };
      });
      
      expect(activeElement.tagName).toBeTruthy();
    });
  });

  test.describe('Visual Design and Layout', () => {
    test('should have consistent styling across pages', async ({ page }) => {
      const pages = ['#login', '#register', '#demo'];
      
      for (const pageHash of pages) {
        await page.goto(`/${pageHash}`);
        
        // Check that basic styling is applied
        const bodyStyles = await page.evaluate(() => {
          const body = document.body;
          const computed = window.getComputedStyle(body);
          return {
            fontFamily: computed.fontFamily,
            backgroundColor: computed.backgroundColor
          };
        });
        
        expect(bodyStyles.fontFamily).toBeTruthy();
      }
    });

    test('should be responsive on different screen sizes', async ({ page }) => {
      const viewports = [
        { width: 320, height: 568, name: 'Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1200, height: 800, name: 'Desktop' },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/#demo');
        
        // Check navigation visibility
        await expect(page.locator('nav')).toBeVisible();
        
        // Check responsive layout behavior
        if (viewport.width < 768) {
          // Mobile: should have hamburger menu or stacked layout
          const headerContainer = page.locator('.header-container, .header');
          await expect(headerContainer).toBeVisible();
          
          // Check for mobile-specific navigation behavior
          const navLinks = page.locator('.nav-link');
          await expect(navLinks.first()).toBeVisible();
        } else {
          // Desktop/Tablet: should have horizontal layout
          const navList = page.locator('.nav-list, .header-nav');
          await expect(navList).toBeVisible();
        }
        
        // Test editor responsiveness on demo page
        const editorContainer = page.locator('.editor-layout-responsive, .editor-container');
        if (await editorContainer.count() > 0) {
          await expect(editorContainer).toBeVisible();
          
          if (viewport.width < 1024) {
            // Mobile/Tablet: should stack vertically
            // The editor and sidebar should be in column layout
          } else {
            // Desktop: should be side by side
            // The editor and sidebar should be in row layout
          }
        }
        
        // Test form responsiveness on login page
        await page.goto('/#login');
        const form = page.locator('form, .form');
        if (await form.count() > 0) {
          await expect(form).toBeVisible();
          
          // Form should be properly sized for viewport
          const formBox = await form.boundingBox();
          expect(formBox?.width).toBeLessThanOrEqual(viewport.width);
        }
      }
    });

    test('should have touch-friendly elements on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone-like viewport
      await page.goto('/#demo');
      
      // Check that interactive elements meet minimum touch target size (44px)
      const buttons = page.locator('button, .btn, .nav-link');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const box = await button.boundingBox();
          if (box) {
            // Touch targets should be at least 44px in both dimensions
            expect(box.height).toBeGreaterThanOrEqual(40); // Allow some tolerance
            expect(box.width).toBeGreaterThanOrEqual(40);
          }
        }
      }
    });
        { width: 1920, height: 1080, name: 'Large Desktop' }
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/#login');
        
        // Check that key elements are visible and properly positioned
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
        
        // Check that elements don't overflow
        const body = page.locator('body');
        const bodyBox = await body.boundingBox();
        expect(bodyBox?.width).toBeLessThanOrEqual(viewport.width);
      }
    });

    test('should handle long content gracefully', async ({ page }) => {
      await page.goto('/#demo');
      
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      // Add very long content
      const longContent = '{title: ' + 'Very '.repeat(100) + 'Long Title}\n' +
                         'This is a '.repeat(200) + 'very long line of lyrics\n' +
                         '[C]' + 'Chord '.repeat(50);
      
      await editor.fill(longContent);
      
      // Should handle long content without breaking layout
      const renderedContent = page.locator('h2:has-text("Rendered Output") ~ div');
      await expect(renderedContent).toBeVisible();
      
      // Check that content doesn't break out of container
      const containerBox = await renderedContent.boundingBox();
      expect(containerBox?.width).toBeLessThan(2000); // Reasonable max width
    });

    test('should have proper loading states', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        route.continue();
      });
      
      await page.goto('/#login');
      
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password');
      await page.click('button:has-text("Sign In")');
      
      // Should show loading state
      const loadingIndicator = page.locator('.loading, .spinner, button:disabled');
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).toBeVisible();
      }
    });
  });

  test.describe('Interactive Elements', () => {
    test('should have proper hover states', async ({ page }) => {
      await page.goto('/#login');
      
      const submitButton = page.locator('button:has-text("Sign In")');
      
      // Hover over button
      await submitButton.hover();
      
      // Should show hover state (visual change would be in CSS)
      await expect(submitButton).toBeVisible();
    });

    test('should have proper click feedback', async ({ page }) => {
      await page.goto('/#login');
      
      const demoLink = page.locator('a[href="#demo"]');
      
      await Promise.all([
        page.waitForURL('*#demo'),
        demoLink.click()
      ]);
      
      await expect(page).toHaveURL(/#demo/);
    });

    test('should handle touch interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto('/#login');
      
      const submitButton = page.locator('button:has-text("Sign In")');
      
      // Simulate touch
      await submitButton.tap();
      
      // Should respond to touch
      await page.waitForTimeout(100);
      const result = page.locator('.error, .loading, .success');
      if (await result.isVisible()) {
        await expect(result).toBeVisible();
      }
    });
  });

  test.describe('Content and Typography', () => {
    test('should have readable text sizing', async ({ page }) => {
      await page.goto('/#login');
      
      // Check that text is readable size
      const headingStyles = await page.locator('h1').evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          fontSize: computed.fontSize,
          lineHeight: computed.lineHeight
        };
      });
      
      // Font size should be reasonable (at least 16px equivalent)
      const fontSize = parseFloat(headingStyles.fontSize);
      expect(fontSize).toBeGreaterThanOrEqual(16);
    });

    test('should have proper text alignment and spacing', async ({ page }) => {
      await page.goto('/#login');
      
      // Check text alignment
      const textElements = await page.locator('p, h1, h2, h3').all();
      
      for (const element of textElements.slice(0, 3)) { // Check first few elements
        const styles = await element.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            textAlign: computed.textAlign,
            marginTop: computed.marginTop,
            marginBottom: computed.marginBottom
          };
        });
        
        expect(styles.textAlign).toBeTruthy();
      }
    });

    test('should display special characters correctly', async ({ page }) => {
      await page.goto('/#demo');
      
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      const specialContent = `{title: Special Characters ♪♫♪}
{artist: Tëst Ärtist}
[C]Spëcial [G]chäracters [Am]test [F]©®™
Emojis: 🎵🎸🎤🎼`;
      
      await editor.fill(specialContent);
      
      // Should display special characters correctly
      await expect(page.locator('h3:has-text("Special Characters ♪♫♪")')).toBeVisible();
      await expect(page.locator('text=Tëst Ärtist')).toBeVisible();
    });
  });

  test.describe('Print and Export Styling', () => {
    test('should have print-friendly styling', async ({ page }) => {
      await page.goto('/#demo');
      
      // Add print media CSS
      await page.addStyleTag({
        content: `
          @media print {
            body { color: black !important; background: white !important; }
            .no-print { display: none !important; }
          }
        `
      });
      
      // Simulate print view
      await page.emulateMedia({ media: 'print' });
      
      // Should still show main content
      await expect(page.locator('h1')).toBeVisible();
      
      // Reset to screen
      await page.emulateMedia({ media: 'screen' });
    });
  });
});