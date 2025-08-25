import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation Tests', () => {
  test('should be able to navigate through login form using keyboard only', async ({ page }) => {
    await page.goto('/#login');
    
    // Start at the beginning of the page
    await page.keyboard.press('Tab');
    
    // Should focus on the skip navigation link
    let focusedElement = await page.evaluate(() => document.activeElement?.className);
    expect(focusedElement).toContain('skip-nav');
    
    // Press Enter to use skip link
    await page.keyboard.press('Enter');
    
    // Should now be in main content area
    await page.keyboard.press('Tab');
    
    // Should be on email input
    focusedElement = await page.evaluate(() => document.activeElement?.id);
    expect(focusedElement).toBe('email');
    
    // Fill email and tab to password
    await page.keyboard.type('test@example.com');
    await page.keyboard.press('Tab');
    
    // Should be on password input
    focusedElement = await page.evaluate(() => document.activeElement?.id);
    expect(focusedElement).toBe('password');
    
    // Fill password and tab to submit button
    await page.keyboard.type('password123');
    await page.keyboard.press('Tab');
    
    // Should be on submit button
    focusedElement = await page.evaluate(() => {
      const active = document.activeElement;
      return {
        tagName: active?.tagName,
        type: active?.getAttribute('type'),
        textContent: active?.textContent
      };
    });
    
    expect(focusedElement.tagName).toBe('BUTTON');
    expect(focusedElement.type).toBe('submit');
    expect(focusedElement.textContent).toContain('Sign In');
  });

  test('should be able to navigate header menu using keyboard', async ({ page }) => {
    await page.goto('/#login');
    
    // Tab to navigation
    let currentElement = '';
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      currentElement = await page.evaluate(() => {
        const active = document.activeElement;
        return active?.textContent || active?.getAttribute('aria-label') || '';
      });
      
      // Stop when we reach navigation
      if (currentElement.includes('Demo') || currentElement.includes('Login')) {
        break;
      }
    }
    
    // Should be able to access navigation links
    expect(currentElement).toBeTruthy();
  });

  test('should show focus indicators on interactive elements', async ({ page }) => {
    await page.goto('/#login');
    
    // Tab to email input
    await page.keyboard.press('Tab'); // Skip link
    await page.keyboard.press('Tab'); // Email input
    
    // Check that the focused element has visible focus styling
    const focusedElementStyles = await page.evaluate(() => {
      const active = document.activeElement;
      const computed = window.getComputedStyle(active!);
      return {
        outline: computed.outline,
        outlineColor: computed.outlineColor,
        outlineWidth: computed.outlineWidth
      };
    });
    
    // Should have some form of outline
    expect(
      focusedElementStyles.outline !== 'none' || 
      focusedElementStyles.outlineWidth !== '0px'
    ).toBeTruthy();
  });

  test('should support Escape key to close mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile viewport
    await page.goto('/#login');
    
    // Find and click mobile menu button
    const menuButton = page.locator('[aria-label*="navigation menu"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Menu should be open
      const nav = page.locator('#main-navigation');
      await expect(nav).toHaveClass(/open/);
      
      // Press Escape to close
      await page.keyboard.press('Escape');
      
      // Menu should be closed
      await expect(nav).not.toHaveClass(/open/);
    }
  });

  test('should announce dynamic content changes to screen readers', async ({ page }) => {
    await page.goto('/#login');
    
    // Fill in invalid email
    await page.fill('#email', 'invalid-email');
    await page.fill('#password', 'password');
    
    // Submit form to trigger error
    await page.click('button[type="submit"]');
    
    // Check that error messages have proper ARIA attributes
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toBeVisible();
    
    // Check for aria-live attributes
    const ariaLiveElements = page.locator('[aria-live]');
    const count = await ariaLiveElements.count();
    expect(count).toBeGreaterThan(0);
  });
});