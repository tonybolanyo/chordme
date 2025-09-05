import { test, expect } from '@playwright/test';

test.describe('ChordPro Validation E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#demo');
    // Wait for the demo page to load
    await expect(page.locator('h1').nth(1)).toContainText('ChordPro');
  });

  test.describe('Real-time Error Detection', () => {
    test('should detect invalid chord notations', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      await expect(editor).toBeVisible();

      // Clear the editor and add invalid chords
      await editor.fill('');
      await editor.fill('[X] [Y] [123] Some lyrics here');

      // Wait a moment for validation to process
      await page.waitForTimeout(500);

      // Check for error highlighting or indicators
      // This will depend on how the validation UI is implemented
      const validationErrors = page.locator('[data-testid="validation-error"]');
      const errorCount = await validationErrors.count();
      expect(errorCount).toBeGreaterThan(0);
    });

    test('should detect invalid directive formats', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      await editor.fill('');
      await editor.fill('{titel: Wrong Spelling}\n{unknown_directive}\n{incomplete');

      await page.waitForTimeout(500);

      // Check for validation warnings/errors
      const validationWarnings = page.locator('[data-testid="validation-warning"]');
      const warningCount = await validationWarnings.count();
      expect(warningCount).toBeGreaterThan(0);
    });

    test('should detect bracket mismatches', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      await editor.fill('');
      await editor.fill('[C [G] {title: test\nMismatched brackets here]');

      await page.waitForTimeout(500);

      // Check for bracket mismatch warnings
      const bracketErrors = page.locator('[data-testid*="bracket-error"]');
      const errorCount = await bracketErrors.count();
      expect(errorCount).toBeGreaterThan(0);
    });

    test('should detect security issues', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      await editor.fill('');
      await editor.fill(`
        {title: Safe Title}
        <script>alert('xss')</script>
        [C]Normal chord
        <iframe src="malicious.com"></iframe>
      `);

      await page.waitForTimeout(500);

      // Check for security error indicators
      const securityErrors = page.locator('[data-testid*="security-error"]');
      const errorCount = await securityErrors.count();
      expect(errorCount).toBeGreaterThan(0);
    });
  });

  test.describe('Validation Status Bar', () => {
    test('should show error and warning counts', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      await editor.fill('');
      await editor.fill('[X] invalid chord {unknown: directive}');

      await page.waitForTimeout(500);

      // Check for status bar with counts
      const statusBar = page.locator('[data-testid="validation-status-bar"]');
      await expect(statusBar).toBeVisible();

      const errorCount = page.locator('[data-testid="error-count"]');
      const warningCount = page.locator('[data-testid="warning-count"]');
      
      expect(await errorCount.textContent()).toContain('1');
      expect(await warningCount.textContent()).toContain('1');
    });

    test('should show no issues for valid content', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      await editor.fill('');
      await editor.fill(`
        {title: Valid Song}
        {artist: Valid Artist}
        
        [C]This is a [G]valid song
        [Am]With proper [F]chord notation
      `);

      await page.waitForTimeout(500);

      const statusBar = page.locator('[data-testid="validation-status-bar"]');
      await expect(statusBar).toContainText('No validation issues');
    });

    test('should allow expanding error details', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      await editor.fill('');
      await editor.fill('[X] [Y] invalid chords');

      await page.waitForTimeout(500);

      // Click to expand error details
      const expandButton = page.locator('[data-testid="expand-errors"]');
      await expandButton.click();

      // Check that error list is visible
      const errorList = page.locator('[data-testid="error-list"]');
      await expect(errorList).toBeVisible();

      const errorItems = errorList.locator('[data-testid="error-item"]');
      const itemCount = await errorItems.count();
      expect(itemCount).toBe(2); // Should have 2 invalid chords
    });
  });

  test.describe('Interactive Error Navigation', () => {
    test('should navigate to error position when clicked', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      await editor.fill('');
      await editor.fill('Valid content [X] invalid chord more content');

      await page.waitForTimeout(500);

      // Click on a validation error indicator
      const errorIndicator = page.locator('[data-testid="validation-error"]').first();
      await errorIndicator.click();

      // Check that cursor is positioned at the error location
      const cursorPosition = await editor.evaluate(el => (el as HTMLTextAreaElement).selectionStart);
      expect(cursorPosition).toBeGreaterThan(0);
      expect(cursorPosition).toBeLessThan(30); // Should be around the [X] position
    });

    test('should show hover tooltips for errors', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      await editor.fill('');
      await editor.fill('[X] invalid chord');

      await page.waitForTimeout(500);

      // Hover over error indicator
      const errorIndicator = page.locator('[data-testid="validation-error"]').first();
      await errorIndicator.hover();

      // Check for tooltip with error description
      const tooltip = page.locator('[data-testid="error-tooltip"]');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText('Invalid chord notation');
    });
  });

  test.describe('Validation Settings', () => {
    test('should allow changing validation strictness', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      await editor.fill('');
      await editor.fill('{custom_directive: value}');

      // Open validation settings
      const settingsButton = page.locator('[data-testid="validation-settings"]');
      await settingsButton.click();

      // Toggle strict mode
      const strictModeToggle = page.locator('[data-testid="strict-mode-toggle"]');
      await strictModeToggle.click();

      await page.waitForTimeout(500);

      // Check that validation behavior changed
      const warningCount = page.locator('[data-testid="warning-count"]');
      expect(await warningCount.textContent()).toContain('1');
    });

    test('should allow disabling specific validation types', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      await editor.fill('');
      await editor.fill('[C [G] mismatched brackets');

      // Open validation settings
      const settingsButton = page.locator('[data-testid="validation-settings"]');
      await settingsButton.click();

      // Disable bracket checking
      const bracketToggle = page.locator('[data-testid="bracket-check-toggle"]');
      await bracketToggle.click();

      await page.waitForTimeout(500);

      // Check that bracket errors are no longer shown
      const bracketErrors = page.locator('[data-testid*="bracket-error"]');
      const errorCount = await bracketErrors.count();
      expect(errorCount).toBe(0);
    });
  });

  test.describe('Language-Specific Validation', () => {
    test('should validate Spanish chord notations correctly', async ({ page }) => {
      // Change language to Spanish
      const languageSelector = page.locator('[data-testid="language-selector"]');
      await languageSelector.selectOption('es');

      await page.waitForTimeout(500);

      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      await editor.fill('');
      await editor.fill('[Do] [Re] [Mi] Spanish chord notation');

      await page.waitForTimeout(500);

      // Should have no errors for Spanish notation
      const statusBar = page.locator('[data-testid="validation-status-bar"]');
      await expect(statusBar).toContainText('Sin problemas'); // Spanish for "No issues"
    });

    test('should show translated error messages in Spanish', async ({ page }) => {
      // Change language to Spanish
      const languageSelector = page.locator('[data-testid="language-selector"]');
      await languageSelector.selectOption('es');

      await page.waitForTimeout(500);

      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      await editor.fill('');
      await editor.fill('[X] invalid chord');

      await page.waitForTimeout(500);

      // Check for Spanish error messages
      const errorIndicator = page.locator('[data-testid="validation-error"]').first();
      await errorIndicator.hover();

      const tooltip = page.locator('[data-testid="error-tooltip"]');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText('Notación de acorde inválida'); // Spanish error message
    });
  });

  test.describe('Performance with Complex Documents', () => {
    test('should handle large documents without blocking UI', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      // Generate large content
      const largeContent = `
        {title: Large Test Song}
        ${Array.from({ length: 100 }, (_, i) => `
        [C]Line ${i + 1} with [G]multiple [Am]chords [F]here
        `).join('')}
      `;

      await editor.fill(largeContent);

      // Validation should complete quickly without blocking
      await page.waitForTimeout(1000);

      // UI should remain responsive
      const statusBar = page.locator('[data-testid="validation-status-bar"]');
      await expect(statusBar).toBeVisible();
      
      // Should be able to continue typing without delay
      await editor.focus();
      await editor.type('\n[C]Additional content');
      
      // Typing should not be blocked
      await page.waitForTimeout(500);
      const content = await editor.inputValue();
      expect(content).toContain('Additional content');
    });

    test('should debounce validation during rapid typing', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      await editor.fill('');
      
      // Type rapidly to test debouncing
      await editor.type('[C] rapid typing test');
      await editor.type(' more text');
      await editor.type(' even more');

      // Wait for debounce to complete
      await page.waitForTimeout(500);

      // Validation should have completed
      const statusBar = page.locator('[data-testid="validation-status-bar"]');
      await expect(statusBar).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should provide proper ARIA labels for validation elements', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      await editor.fill('[X] invalid chord');
      await page.waitForTimeout(500);

      // Check ARIA labels
      const errorIndicator = page.locator('[data-testid="validation-error"]').first();
      await expect(errorIndicator).toHaveAttribute('aria-label');
      
      const statusBar = page.locator('[data-testid="validation-status-bar"]');
      await expect(statusBar).toHaveAttribute('role', 'status');
    });

    test('should support keyboard navigation', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      await editor.fill('[X] invalid [Y] chord');
      await page.waitForTimeout(500);

      // Use keyboard to navigate to validation settings
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      const settingsButton = page.locator('[data-testid="validation-settings"]');
      await expect(settingsButton).toBeFocused();
    });
  });
});