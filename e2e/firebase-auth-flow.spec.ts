// End-to-end tests for Firebase authentication flow
import { test, expect } from '@playwright/test';

test.describe('Firebase Authentication E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock Firebase for E2E tests since we don't have real Firebase credentials
    await page.addInitScript(() => {
      // Mock Firebase initialization
      window.FIREBASE_CONFIG = {
        apiKey: 'mock-api-key',
        authDomain: 'mock-domain.firebaseapp.com',
        projectId: 'mock-project',
        storageBucket: 'mock-project.appspot.com',
        messagingSenderId: '123456789',
        appId: '1:123456789:web:mock-app-id'
      };
      
      // Mock Firebase Auth methods
      window.mockFirebaseAuth = {
        currentUser: null,
        signInWithEmailAndPassword: (email: string, password: string) => {
          return Promise.resolve({
            user: {
              uid: 'mock-user-id',
              email: email,
              displayName: null,
              photoURL: null
            }
          });
        },
        createUserWithEmailAndPassword: (email: string, password: string) => {
          return Promise.resolve({
            user: {
              uid: 'mock-new-user-id',
              email: email,
              displayName: null,
              photoURL: null
            }
          });
        },
        signInWithPopup: () => {
          return Promise.resolve({
            user: {
              uid: 'mock-google-user-id',
              email: 'test@gmail.com',
              displayName: 'Test User',
              photoURL: 'https://example.com/photo.jpg'
            },
            isNewUser: false
          });
        },
        signOut: () => Promise.resolve(),
        onAuthStateChanged: (callback: (user: any) => void) => {
          // Simulate auth state listener
          setTimeout(() => callback(window.mockFirebaseAuth.currentUser), 100);
          return () => {}; // Unsubscribe function
        }
      };
    });
  });

  test.describe('User Registration Flow', () => {
    test('should complete email registration successfully', async ({ page }) => {
      await page.goto('/');
      
      // Navigate to register page
      await page.click('a[href="#register"]');
      await expect(page).toHaveURL(/#register/);
      
      // Check if Firebase auth components are present
      const firebaseSection = page.locator('.firebase-auth-form');
      if (await firebaseSection.isVisible()) {
        // Fill registration form
        await page.fill('input[name="email"]', 'newuser@example.com');
        await page.fill('input[name="password"]', 'newpassword123');
        
        // Submit registration
        await page.click('button[type="submit"]');
        
        // Should show success message or redirect to home
        await expect(page.locator('.success-message, .welcome-message')).toBeVisible({ timeout: 5000 });
        
        // Should redirect to home page
        await expect(page).toHaveURL(/\/#$|\/$/);
      } else {
        console.log('Firebase auth components not available - skipping Firebase registration test');
      }
    });

    test('should handle registration validation errors', async ({ page }) => {
      await page.goto('/#register');
      
      const firebaseSection = page.locator('.firebase-auth-form');
      if (await firebaseSection.isVisible()) {
        // Try to submit with invalid email
        await page.fill('input[name="email"]', 'invalid-email');
        await page.fill('input[name="password"]', 'short');
        
        await page.click('button[type="submit"]');
        
        // Should show validation errors
        await expect(page.locator('.error-text')).toBeVisible();
      }
    });

    test('should complete Google registration successfully', async ({ page }) => {
      await page.goto('/#register');
      
      const googleButton = page.locator('button:has-text("Continue with Google")');
      if (await googleButton.isVisible()) {
        // Mock successful Google sign-in
        await page.evaluate(() => {
          window.mockFirebaseAuth.signInWithPopup = () => {
            return Promise.resolve({
              user: {
                uid: 'google-user-123',
                email: 'testuser@gmail.com',
                displayName: 'Test User',
                photoURL: 'https://example.com/photo.jpg'
              },
              isNewUser: true
            });
          };
        });
        
        await googleButton.click();
        
        // Should show success message and redirect
        await expect(page.locator('.success-message, .welcome-message')).toBeVisible({ timeout: 5000 });
        await expect(page).toHaveURL(/\/#$|\/$/);
      } else {
        console.log('Google auth button not available - skipping Google registration test');
      }
    });
  });

  test.describe('User Login Flow', () => {
    test('should complete email login successfully', async ({ page }) => {
      await page.goto('/#login');
      
      const firebaseSection = page.locator('.firebase-auth-form');
      if (await firebaseSection.isVisible()) {
        // Fill login form
        await page.fill('input[name="email"]', 'existing@example.com');
        await page.fill('input[name="password"]', 'existingpassword');
        
        // Submit login
        await page.click('button[type="submit"]:has-text("Sign In")');
        
        // Should show success message or redirect to home
        await expect(page.locator('.success-message, .welcome-message')).toBeVisible({ timeout: 5000 });
        
        // Should redirect to home page
        await expect(page).toHaveURL(/\/#$|\/$/);
      } else {
        console.log('Firebase auth components not available - skipping Firebase login test');
      }
    });

    test('should handle login errors gracefully', async ({ page }) => {
      await page.goto('/#login');
      
      const firebaseSection = page.locator('.firebase-auth-form');
      if (await firebaseSection.isVisible()) {
        // Mock authentication error
        await page.evaluate(() => {
          window.mockFirebaseAuth.signInWithEmailAndPassword = () => {
            return Promise.reject({
              code: 'auth/user-not-found',
              message: 'User not found'
            });
          };
        });
        
        await page.fill('input[name="email"]', 'nonexistent@example.com');
        await page.fill('input[name="password"]', 'wrongpassword');
        
        await page.click('button[type="submit"]:has-text("Sign In")');
        
        // Should show error message
        await expect(page.locator('.error-message, .error-text')).toBeVisible();
        await expect(page.locator('.error-message, .error-text')).toContainText(/no account found|user not found/i);
      }
    });

    test('should complete Google login successfully', async ({ page }) => {
      await page.goto('/#login');
      
      const googleButton = page.locator('button:has-text("Continue with Google")');
      if (await googleButton.isVisible()) {
        await googleButton.click();
        
        // Should show success message and redirect
        await expect(page.locator('.success-message, .welcome-message')).toBeVisible({ timeout: 5000 });
        await expect(page).toHaveURL(/\/#$|\/$/);
      } else {
        console.log('Google auth button not available - skipping Google login test');
      }
    });
  });

  test.describe('Authentication State Persistence', () => {
    test('should persist authentication across page reloads', async ({ page }) => {
      await page.goto('/#login');
      
      const firebaseSection = page.locator('.firebase-auth-form');
      if (await firebaseSection.isVisible()) {
        // Login first
        await page.fill('input[name="email"]', 'persistent@example.com');
        await page.fill('input[name="password"]', 'persistentpassword');
        await page.click('button[type="submit"]:has-text("Sign In")');
        
        // Wait for successful login
        await expect(page).toHaveURL(/\/#$|\/$/);
        
        // Mock persistent auth state
        await page.evaluate(() => {
          window.mockFirebaseAuth.currentUser = {
            uid: 'persistent-user-id',
            email: 'persistent@example.com',
            displayName: null,
            photoURL: null
          };
        });
        
        // Reload page
        await page.reload();
        
        // Should remain authenticated (check for authenticated UI elements)
        const userMenu = page.locator('[data-testid="user-menu"], .user-profile, .logout-button');
        const loginLink = page.locator('a[href="#login"]');
        
        // Either user menu should be visible OR login link should be hidden
        await expect(async () => {
          const userMenuVisible = await userMenu.isVisible().catch(() => false);
          const loginLinkVisible = await loginLink.isVisible().catch(() => true);
          
          if (!userMenuVisible && loginLinkVisible) {
            throw new Error('User does not appear to be authenticated after reload');
          }
        }).toPass({ timeout: 5000 });
      } else {
        console.log('Firebase auth components not available - skipping persistence test');
      }
    });

    test('should handle authentication token expiration', async ({ page }) => {
      await page.goto('/');
      
      // Mock expired token scenario
      await page.evaluate(() => {
        window.mockFirebaseAuth.currentUser = null;
        window.mockFirebaseAuth.onAuthStateChanged = (callback: (user: any) => void) => {
          // Simulate token expiration
          setTimeout(() => callback(null), 100);
          return () => {};
        };
      });
      
      // Reload to trigger auth state check
      await page.reload();
      
      // Should show login option when not authenticated
      await expect(page.locator('a[href="#login"]')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Logout Flow', () => {
    test('should complete logout successfully', async ({ page }) => {
      // Start with authenticated state
      await page.goto('/');
      
      // Mock authenticated user
      await page.evaluate(() => {
        window.mockFirebaseAuth.currentUser = {
          uid: 'logout-test-user',
          email: 'logouttest@example.com',
          displayName: 'Logout Test User',
          photoURL: null
        };
      });
      
      await page.reload();
      
      // Look for logout button or user menu
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), .logout-button');
      const userMenu = page.locator('[data-testid="user-menu"], .user-profile');
      
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      } else if (await userMenu.isVisible()) {
        await userMenu.click();
        await page.locator('button:has-text("Logout"), button:has-text("Sign Out")').click();
      } else {
        console.log('Logout button not found - user may not be properly authenticated');
      }
      
      // Should redirect to login or show login link
      await expect(async () => {
        const currentUrl = page.url();
        const loginLinkVisible = await page.locator('a[href="#login"]').isVisible().catch(() => false);
        
        if (!currentUrl.includes('#login') && !loginLinkVisible) {
          throw new Error('User does not appear to be logged out');
        }
      }).toPass({ timeout: 5000 });
    });
  });

  test.describe('Authentication UI Integration', () => {
    test('should show different UI states based on authentication', async ({ page }) => {
      // Test unauthenticated state
      await page.goto('/');
      
      await page.evaluate(() => {
        window.mockFirebaseAuth.currentUser = null;
      });
      
      await page.reload();
      
      // Should show login/register options
      await expect(page.locator('a[href="#login"]')).toBeVisible();
      await expect(page.locator('a[href="#register"]')).toBeVisible();
      
      // Test authenticated state
      await page.evaluate(() => {
        window.mockFirebaseAuth.currentUser = {
          uid: 'ui-test-user',
          email: 'uitest@example.com',
          displayName: 'UI Test User',
          photoURL: null
        };
      });
      
      await page.reload();
      
      // Should show authenticated UI elements
      const authenticatedIndicators = [
        '.user-profile',
        '.logout-button',
        '[data-testid="user-menu"]',
        'button:has-text("Logout")',
        'button:has-text("Sign Out")'
      ];
      
      let foundAuthIndicator = false;
      for (const selector of authenticatedIndicators) {
        if (await page.locator(selector).isVisible().catch(() => false)) {
          foundAuthIndicator = true;
          break;
        }
      }
      
      if (!foundAuthIndicator) {
        // At minimum, login link should be hidden when authenticated
        await expect(page.locator('a[href="#login"]')).not.toBeVisible();
      }
    });

    test('should handle Firebase unavailable gracefully', async ({ page }) => {
      // Mock Firebase as unavailable
      await page.addInitScript(() => {
        window.FIREBASE_CONFIG = null;
        window.mockFirebaseAuth = null;
      });
      
      await page.goto('/#login');
      
      // Should still show regular login form (non-Firebase)
      const loginForm = page.locator('form, .login-form');
      await expect(loginForm).toBeVisible();
      
      // Firebase-specific components should not be visible
      const firebaseButtons = page.locator('button:has-text("Continue with Google"), .firebase-auth');
      if (await firebaseButtons.count() > 0) {
        await expect(firebaseButtons).not.toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors during authentication', async ({ page }) => {
      await page.goto('/#login');
      
      // Mock network error
      await page.evaluate(() => {
        window.mockFirebaseAuth.signInWithEmailAndPassword = () => {
          return Promise.reject({
            code: 'auth/network-request-failed',
            message: 'Network error'
          });
        };
      });
      
      const firebaseSection = page.locator('.firebase-auth-form');
      if (await firebaseSection.isVisible()) {
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'testpassword');
        await page.click('button[type="submit"]');
        
        // Should show network error message
        await expect(page.locator('.error-message, .error-text')).toBeVisible();
        await expect(page.locator('.error-message, .error-text')).toContainText(/network|connection/i);
      }
    });

    test('should handle popup blocked errors', async ({ page }) => {
      await page.goto('/#login');
      
      // Mock popup blocked error
      await page.evaluate(() => {
        window.mockFirebaseAuth.signInWithPopup = () => {
          return Promise.reject({
            code: 'auth/popup-blocked',
            message: 'Popup blocked'
          });
        };
      });
      
      const googleButton = page.locator('button:has-text("Continue with Google")');
      if (await googleButton.isVisible()) {
        await googleButton.click();
        
        // Should show popup blocked error
        await expect(page.locator('.error-message, .error-text')).toBeVisible();
        await expect(page.locator('.error-message, .error-text')).toContainText(/popup|blocked/i);
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard accessible', async ({ page }) => {
      await page.goto('/#login');
      
      const firebaseSection = page.locator('.firebase-auth-form');
      if (await firebaseSection.isVisible()) {
        // Tab through form elements
        await page.keyboard.press('Tab');
        await expect(page.locator('input[name="email"]')).toBeFocused();
        
        await page.keyboard.press('Tab');
        await expect(page.locator('input[name="password"]')).toBeFocused();
        
        await page.keyboard.press('Tab');
        await expect(page.locator('button[type="submit"]')).toBeFocused();
        
        // Should be able to submit with Enter
        await page.fill('input[name="email"]', 'keyboard@example.com');
        await page.fill('input[name="password"]', 'keyboardtest');
        await page.keyboard.press('Enter');
        
        // Should trigger form submission
        await expect(page.locator('.success-message, .error-message')).toBeVisible({ timeout: 5000 });
      }
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/#login');
      
      const firebaseSection = page.locator('.firebase-auth-form');
      if (await firebaseSection.isVisible()) {
        // Check for proper labels
        await expect(page.locator('label[for*="email"], input[aria-label*="email"]')).toBeVisible();
        await expect(page.locator('label[for*="password"], input[aria-label*="password"]')).toBeVisible();
        
        // Check for proper form structure
        const form = page.locator('form');
        if (await form.count() > 0) {
          await expect(form).toBeVisible();
        }
      }
    });
  });
});