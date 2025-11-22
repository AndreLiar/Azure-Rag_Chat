import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('should display auth form on first visit', async ({ page }) => {
    // Should show the auth form when not logged in
    await expect(page.locator('h1:has-text("FineDocChat")')).toBeVisible();
    await expect(page.locator('text="Sign in to your account"')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });

  test('should register new organization successfully', async ({ page }) => {
    const testEmail = `test-org-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    const organizationName = `Test Organization ${Date.now()}`;

    // Click on toggle to switch to registration
    await page.click('text="Don\'t have an organization? Create one"');

    // Fill registration form
    await page.fill('input[placeholder="Enter organization name"]', organizationName);
    await page.fill('input[placeholder="Enter your email"]', testEmail);
    await page.fill('input[placeholder="Enter your password"]', testPassword);

    // Submit registration
    await page.click('button:has-text("Create Organization")');

    // Wait for successful registration and redirect to main app
    await expect(page.locator('h1:has-text("FineDocChat")')).toBeVisible({ timeout: 10000 });
    
    // Should see the main application interface
    await expect(page.locator('text="Upload documents and chat with your data using AI"')).toBeVisible();
    await expect(page.locator('button:has-text("New Chat")')).toBeVisible();
    
    // Should see user email in header
    await expect(page.locator(`text="${testEmail}"`)).toBeVisible();
  });

  test('should login with existing credentials', async ({ page }) => {
    // First, register a user
    const testEmail = `test-login-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    const organizationName = `Login Test Org ${Date.now()}`;

    // Register
    await page.click('text="Don\'t have an organization? Create one"');
    await page.fill('input[placeholder="Enter organization name"]', organizationName);
    await page.fill('input[placeholder="Enter your email"]', testEmail);
    await page.fill('input[placeholder="Enter your password"]', testPassword);
    await page.click('button:has-text("Create Organization")');

    // Wait for registration to complete
    await expect(page.locator('h1:has-text("FineDocChat")')).toBeVisible({ timeout: 10000 });

    // Logout (click logout button)
    await page.click('button:has-text("Sign Out")');

    // Should be back to auth form
    await expect(page.locator('text="Sign in to your account"')).toBeVisible();

    // Now login with same credentials
    await page.fill('input[placeholder="Enter your email"]', testEmail);
    await page.fill('input[placeholder="Enter your password"]', testPassword);
    await page.click('button:has-text("Sign In")');

    // Should be logged in successfully
    await expect(page.locator('h1:has-text("FineDocChat")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text="${testEmail}"`)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[placeholder="Enter your email"]', 'invalid@example.com');
    await page.fill('input[placeholder="Enter your password"]', 'wrongpassword');
    await page.click('button:has-text("Sign In")');

    // Should show error message
    await expect(page.locator('text="Invalid email or password"')).toBeVisible({ timeout: 5000 });
    
    // Should still be on auth page, not redirected
    await expect(page.locator('text="Sign in to your account"')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit sign up form without required fields
    await page.click('text="Don\'t have an organization? Create one"');
    
    // Try to submit empty form
    await page.click('button:has-text("Create Organization")');

    // Should show validation error for organization name
    await expect(page.locator('text="Organization name is required"')).toBeVisible({ timeout: 3000 });
    
    // Should still be on registration form
    await expect(page.locator('text="Create your organization"')).toBeVisible();
    
    // Switch back to login and try empty login form
    await page.click('text="Already have an account? Sign in"');
    await page.click('button:has-text("Sign In")');

    // Should still be on auth page (HTML5 validation should prevent submission)
    await expect(page.locator('text="Sign in to your account"')).toBeVisible();
  });

  test('should toggle between login and registration modes', async ({ page }) => {
    // Should start in login mode
    await expect(page.locator('text="Sign in to your account"')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    
    // Switch to registration
    await page.click('text="Don\'t have an organization? Create one"');
    await expect(page.locator('text="Create your organization"')).toBeVisible();
    await expect(page.locator('button:has-text("Create Organization")')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter organization name"]')).toBeVisible();
    
    // Switch back to login
    await page.click('text="Already have an account? Sign in"');
    await expect(page.locator('text="Sign in to your account"')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });
});