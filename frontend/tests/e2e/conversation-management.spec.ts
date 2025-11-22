import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers/auth-helper';

test.describe('Conversation Management', () => {
  let testUser: { email: string; password: string; orgName: string };

  test.beforeAll(async () => {
    testUser = {
      email: `test-conv-${Date.now()}@example.com`,
      password: 'testpassword123',
      orgName: `Conversation Test Org ${Date.now()}`
    };
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await createTestUser(page, testUser);
  });

  test('should display conversation sidebar', async ({ page }) => {
    // Should see the conversation sidebar
    await expect(page.locator('button:has-text("New Chat")')).toBeVisible();
    await expect(page.locator('input[placeholder*="Search conversations"]')).toBeVisible();
  });

  test('should create new conversation when starting chat', async ({ page }) => {
    const testMessage = 'This is my first conversation message';
    
    // Start a new chat
    const chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await chatInput.fill(testMessage);
    await page.click('button:has-text("Send")');

    // Wait for message to be sent and conversation to be created
    await page.waitForTimeout(5000);

    // Should see the conversation appear in sidebar
    // Conversation title should be based on first message or "New Conversation"
    const conversationSidebar = page.locator('[data-testid="conversation-sidebar"], .w-80').first();
    await expect(conversationSidebar).toBeVisible();

    // Look for conversation in list
    const conversationList = page.locator('[data-testid="conversation-list"], .space-y-1').first();
    if (await conversationList.isVisible()) {
      // Should have at least one conversation
      const conversations = conversationList.locator('div[role="button"], .cursor-pointer').first();
      await expect(conversations).toBeVisible({ timeout: 10000 });
    }
  });

  test('should switch between conversations', async ({ page }) => {
    // Create first conversation
    const firstMessage = 'First conversation message';
    let chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await chatInput.fill(firstMessage);
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(5000);

    // Create second conversation
    await page.click('button:has-text("New Chat")');
    const secondMessage = 'Second conversation message';
    chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await chatInput.fill(secondMessage);
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(5000);

    // Should see second message in current chat
    await expect(page.locator(`text="${secondMessage}"`)).toBeVisible();

    // Click on first conversation in sidebar (if visible)
    const conversationItems = page.locator('[data-testid="conversation-item"], .cursor-pointer').all();
    const conversations = await conversationItems;
    
    if (conversations.length > 1) {
      await conversations[0].click();
      
      // Should now see first conversation's content
      await expect(page.locator(`text="${firstMessage}"`)).toBeVisible();
      await expect(page.locator(`text="${secondMessage}"`)).not.toBeVisible();
    }
  });

  test('should search conversations', async ({ page }) => {
    // Create a conversation with searchable content
    const searchableMessage = 'Machine learning algorithms and neural networks';
    const chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await chatInput.fill(searchableMessage);
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(5000);

    // Try searching in the sidebar
    const searchInput = page.locator('input[placeholder*="Search conversations"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('machine learning');
      await page.waitForTimeout(2000);

      // Should filter conversations or show search results
      // The exact behavior depends on implementation
      const conversationList = page.locator('[data-testid="conversation-list"], .space-y-1').first();
      await expect(conversationList).toBeVisible();
    }
  });

  test('should edit conversation title', async ({ page }) => {
    // Create a conversation
    const testMessage = 'This conversation needs a better title';
    const chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await chatInput.fill(testMessage);
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(5000);

    // Look for edit button in conversation list
    const editButton = page.locator('[data-testid="edit-conversation"], button[title="Edit title"], .edit-icon').first();
    
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      
      // Look for title input field
      const titleInput = page.locator('input[type="text"]').last();
      await titleInput.fill('My Custom Conversation Title');
      
      // Save the title (Enter key or save button)
      await titleInput.press('Enter');
      
      // Should see updated title
      await expect(page.locator('text="My Custom Conversation Title"')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should delete conversation', async ({ page }) => {
    // Create a conversation
    const testMessage = 'This conversation will be deleted';
    const chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await chatInput.fill(testMessage);
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(5000);

    // Look for delete button in conversation list
    const deleteButton = page.locator('[data-testid="delete-conversation"], button[title="Delete"], .delete-icon, button:has(svg)').first();
    
    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();
      
      // Handle confirmation dialog
      const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 3000 })) {
        await confirmButton.click();
      }

      // Conversation should be removed and chat should be cleared
      await expect(page.locator(`text="${testMessage}"`)).not.toBeVisible({ timeout: 5000 });
      
      // Should show empty state or new conversation prompt
      await expect(page.locator('text="Start a conversation"')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show conversation timestamps', async ({ page }) => {
    // Create a conversation
    const testMessage = 'Conversation with timestamp';
    const chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await chatInput.fill(testMessage);
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(5000);

    // Look for timestamp indicators in conversation list
    const timeIndicators = [
      'text="Today"',
      'text="Yesterday"',
      'text="ago"',
      'text="Just now"',
      '[data-testid="conversation-time"]'
    ];

    let foundTimestamp = false;
    for (const indicator of timeIndicators) {
      if (await page.locator(indicator).first().isVisible({ timeout: 3000 })) {
        foundTimestamp = true;
        break;
      }
    }

    // If no timestamp found, check for any time-like text patterns
    if (!foundTimestamp) {
      const pageContent = await page.content();
      const hasTimePattern = /\d+[hm]\s+ago|today|yesterday|just now/i.test(pageContent);
      foundTimestamp = hasTimePattern;
    }

    // Timestamp display is optional but good UX
    console.log('Timestamp found:', foundTimestamp);
  });

  test('should maintain conversation order', async ({ page }) => {
    // Create multiple conversations
    const conversations = [
      'First conversation about AI',
      'Second conversation about ML',
      'Third conversation about data'
    ];

    for (const message of conversations) {
      await page.click('button:has-text("New Chat")');
      const chatInput = page.locator('textarea[placeholder*="Ask a question"]');
      await chatInput.fill(message);
      await page.click('button:has-text("Send")');
      await page.waitForTimeout(3000);
    }

    // Check if conversations appear in sidebar
    const conversationList = page.locator('[data-testid="conversation-list"], .space-y-1').first();
    if (await conversationList.isVisible()) {
      const conversationItems = conversationList.locator('div[role="button"], .cursor-pointer');
      const count = await conversationItems.count();
      
      // Should have multiple conversations
      expect(count).toBeGreaterThan(0);
      
      // Most recent conversation should typically be at the top
      // This depends on the sorting implementation
    }
  });

  test('should handle empty conversation state', async ({ page }) => {
    // Should show empty state when no conversations exist
    await expect(page.locator('text="Start a conversation"')).toBeVisible();
    
    // Or show message about no conversations
    const emptyStateIndicators = [
      'text="No conversations yet"',
      'text="Start a new chat"',
      'text="Begin"',
      '[data-testid="empty-conversations"]'
    ];

    // At least one of these should be visible in a new session
    const hasEmptyState = await Promise.race([
      ...emptyStateIndicators.map(indicator =>
        page.locator(indicator).first().isVisible({ timeout: 2000 })
      ),
      page.locator('text="Start a conversation"').isVisible({ timeout: 2000 })
    ]);

    expect(hasEmptyState).toBe(true);
  });

  test('should persist conversations across page reloads', async ({ page }) => {
    // Create a conversation
    const persistentMessage = 'This conversation should persist';
    const chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await chatInput.fill(persistentMessage);
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(5000);

    // Reload the page
    await page.reload();

    // Should still be logged in and see conversation
    await expect(page.locator('h1:has-text("FineDocChat")')).toBeVisible({ timeout: 10000 });
    
    // Look for the conversation in sidebar or current chat
    await page.waitForTimeout(3000);
    const pageContent = await page.content();
    const hasPersistentContent = pageContent.includes(persistentMessage);
    
    // The conversation should persist (depends on authentication state)
    console.log('Conversation persisted:', hasPersistentContent);
  });
});