import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests with axe-core', () => {
  test('should not have any automatically detectable accessibility issues on login page', async ({ page }) => {
    await page.goto('/#login');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any automatically detectable accessibility issues on register page', async ({ page }) => {
    await page.goto('/#register');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any automatically detectable accessibility issues on demo page', async ({ page }) => {
    await page.goto('/#demo');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper color contrast ratios', async ({ page }) => {
    await page.goto('/#login');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    // Filter for color contrast violations specifically
    const contrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );
    
    expect(contrastViolations).toEqual([]);
  });

  test('should have proper keyboard accessibility', async ({ page }) => {
    await page.goto('/#login');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['keyboard'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper ARIA implementation', async ({ page }) => {
    await page.goto('/#login');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    // Filter for ARIA-related violations
    const ariaViolations = accessibilityScanResults.violations.filter(
      violation => violation.id.includes('aria') || violation.id.includes('label')
    );
    
    expect(ariaViolations).toEqual([]);
  });
});