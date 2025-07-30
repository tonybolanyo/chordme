import { test, expect } from '@playwright/test';

test.describe('ChordMe Application - Basic Navigation', () => {
  test('should load the home page and redirect to login', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to login page since authentication is required
    await expect(page).toHaveTitle(/ChordMe/);
    await expect(page.locator('h1.header-title')).toContainText('ChordMe');
    await expect(page.locator('h1').nth(1)).toContainText('Login to ChordMe');
  });

  test('should navigate to demo page without authentication', async ({ page }) => {
    await page.goto('/');
    
    // Click on demo link
    await page.click('a[href="#demo"]');
    
    // Should navigate to demo page
    await expect(page.locator('h1').nth(1)).toContainText('ChordPro Syntax Highlighting Demo');
  });

  test('should show login form', async ({ page }) => {
    await page.goto('/#login');
    
    // Should show login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/#login');
    
    // Click on register link
    await page.click('a[href="#register"]');
    
    // Should show register form
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  });
});