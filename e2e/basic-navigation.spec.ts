import { test, expect } from '@playwright/test';

test.describe('ChordMe Application', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    
    // Should show the login page since authentication is required
    await expect(page).toHaveTitle(/ChordMe/);
    await expect(page.locator('h1')).toContainText('ChordMe');
  });

  test('should navigate to demo page without authentication', async ({ page }) => {
    await page.goto('/');
    
    // Click on demo link
    await page.click('a[href="#demo"]');
    
    // Should navigate to demo page
    await expect(page.locator('h1')).toContainText('ChordPro Demo');
  });

  test('should show login form', async ({ page }) => {
    await page.goto('/#login');
    
    // Should show login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/#login');
    
    // Click on register link
    await page.click('a[href="#register"]');
    
    // Should show register form
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});