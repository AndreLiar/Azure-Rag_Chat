import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  orgName: string;
}

export async function createTestUser(page: Page, user: TestUser): Promise<void> {
  // Go to auth page and register
  await page.goto('/');
  
  // Click on Sign Up tab
  await page.click('button:has-text("Sign Up")');

  // Fill registration form
  await page.fill('input[placeholder="Organization Name"]', user.orgName);
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);

  // Submit registration
  await page.click('button:has-text("Create Organization")');

  // Wait for successful registration and redirect to main app
  await expect(page.locator('h1:has-text("FineDocChat")')).toBeVisible({ timeout: 10000 });
}

export async function loginUser(page: Page, user: Partial<TestUser>): Promise<void> {
  // Go to auth page and login
  await page.goto('/');
  
  // Click on Sign In tab (might already be active)
  const signInButton = page.locator('button:has-text("Sign In")');
  if (await signInButton.isVisible()) {
    await signInButton.click();
  }

  // Fill login form
  if (user.email) {
    await page.fill('input[type="email"]', user.email);
  }
  if (user.password) {
    await page.fill('input[type="password"]', user.password);
  }

  // Submit login
  await page.click('button:has-text("Sign In")');

  // Wait for successful login
  await expect(page.locator('h1:has-text("FineDocChat")')).toBeVisible({ timeout: 10000 });
}

export async function logoutUser(page: Page): Promise<void> {
  // Click logout button
  await page.click('button:has-text("Sign Out")');
  
  // Should be back to auth form
  await expect(page.locator('h2:has-text("Sign In")')).toBeVisible();
}

export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await expect(page.locator('h1:has-text("FineDocChat")')).toBeVisible({ timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

export async function waitForAuthForm(page: Page): Promise<void> {
  await expect(page.locator('h2:has-text("Sign In")')).toBeVisible({ timeout: 5000 });
}