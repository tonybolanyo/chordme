import { test, expect } from '@playwright/test';

test.describe('ChordMe Authentication Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
  });

  test.describe('User Registration', () => {
    test('should successfully register a new user with valid data', async ({ page }) => {
      // Navigate to register page
      await page.click('a[href="#register"]');
      await expect(page.locator('h1').nth(1)).toContainText('Join ChordMe');

      // Fill in registration form with valid data
      const email = `test-${Date.now()}@example.com`;
      const password = 'SecurePass123!';
      
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      
      // Submit the form
      await page.click('button:has-text("Create Account")');
      
      // Should redirect to home page or show success message
      // Note: Adjust based on actual application behavior
      await expect(page).toHaveURL(/#(home|login)/);
    });

    test('should show validation errors for invalid email', async ({ page }) => {
      await page.click('a[href="#register"]');
      
      // Try to register with invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
      
      await page.click('button:has-text("Create Account")');
      
      // Should show validation error (adjust selector based on actual implementation)
      await expect(page.locator('.error, .alert, [role="alert"]')).toBeVisible();
    });

    test('should show validation errors for weak password', async ({ page }) => {
      await page.click('a[href="#register"]');
      
      // Try to register with weak password
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'weak');
      await page.fill('input[name="confirmPassword"]', 'weak');
      
      await page.click('button:has-text("Create Account")');
      
      // Should show validation error
      await expect(page.locator('.error, .alert, [role="alert"]')).toBeVisible();
    });

    test('should show error when passwords do not match', async ({ page }) => {
      await page.click('a[href="#register"]');
      
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentPass123!');
      
      await page.click('button:has-text("Create Account")');
      
      // Should show validation error
      await expect(page.locator('.error, .alert, [role="alert"]')).toBeVisible();
    });

    test('should show password requirements', async ({ page }) => {
      await page.click('a[href="#register"]');
      
      // Should display password requirements
      await expect(page.locator('text=Password must contain:')).toBeVisible();
      await expect(page.locator('text=At least 8 characters')).toBeVisible();
      await expect(page.locator('text=One uppercase letter')).toBeVisible();
      await expect(page.locator('text=One lowercase letter')).toBeVisible();
      await expect(page.locator('text=One number')).toBeVisible();
      await expect(page.locator('text=One special character')).toBeVisible();
    });
  });

  test.describe('User Login', () => {
    test.beforeEach(async ({ page }) => {
      // Ensure we're on the login page
      await page.goto('/#login');
    });

    test('should display login form correctly', async ({ page }) => {
      await expect(page.locator('h1').nth(1)).toContainText('Login to ChordMe');
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
      await expect(page.locator('text=Don\'t have an account?')).toBeVisible();
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      // Try to submit empty form
      await page.click('button:has-text("Sign In")');
      
      // Should show validation errors (adjust based on implementation)
      await expect(page.locator('.error, .alert, [role="alert"]')).toBeVisible();
    });

    test('should show error for invalid email format', async ({ page }) => {
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', 'somepassword');
      
      await page.click('button:has-text("Sign In")');
      
      // Should show validation error
      await expect(page.locator('.error, .alert, [role="alert"]')).toBeVisible();
    });

    test('should attempt login with valid format but non-existent user', async ({ page }) => {
      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'SomePassword123!');
      
      await page.click('button:has-text("Sign In")');
      
      // Should show authentication error
      await expect(page.locator('.error, .alert, [role="alert"]')).toBeVisible();
    });
  });

  test.describe('Navigation between Auth Pages', () => {
    test('should navigate from login to register', async ({ page }) => {
      await page.goto('/#login');
      await page.click('a[href="#register"]');
      
      await expect(page).toHaveURL(/#register/);
      await expect(page.locator('h1').nth(1)).toContainText('Join ChordMe');
    });

    test('should navigate from register to login', async ({ page }) => {
      await page.goto('/#register');
      await page.click('a[href="#login"]');
      
      await expect(page).toHaveURL(/#login/);
      await expect(page.locator('h1').nth(1)).toContainText('Login to ChordMe');
    });

    test('should navigate to demo from auth pages', async ({ page }) => {
      await page.goto('/#login');
      await page.click('a[href="#demo"]');
      
      await expect(page).toHaveURL(/#demo/);
      await expect(page.locator('h1').nth(1)).toContainText('ChordPro Syntax Highlighting Demo');

      // Should be able to navigate back to login
      await page.click('a[href="#login"]');
      await expect(page).toHaveURL(/#login/);
    });
  });

  test.describe('Authentication State Management', () => {
    test('should redirect unauthenticated user to login when accessing home', async ({ page }) => {
      await page.goto('/#home');
      
      // Should redirect to login page
      await expect(page).toHaveURL(/#login/);
      await expect(page.locator('h1').nth(1)).toContainText('Login to ChordMe');
    });

    test('should allow access to demo page without authentication', async ({ page }) => {
      await page.goto('/#demo');
      
      // Should stay on demo page
      await expect(page).toHaveURL(/#demo/);
      await expect(page.locator('h1').nth(1)).toContainText('ChordPro Syntax Highlighting Demo');
    });
  });
});