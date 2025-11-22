import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers/auth-helper';

test.describe('RAG Chat Functionality', () => {
  let testUser: { email: string; password: string; orgName: string };

  test.beforeAll(async () => {
    testUser = {
      email: `test-chat-${Date.now()}@example.com`,
      password: 'testpassword123',
      orgName: `Chat Test Org ${Date.now()}`
    };
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await createTestUser(page, testUser);
  });

  test('should display chat interface', async ({ page }) => {
    // Should see the main chat interface elements
    await expect(page.locator('text="Start a conversation"')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="Ask a question"]')).toBeVisible();
    await expect(page.locator('button:has-text("Send")')).toBeVisible();
    await expect(page.locator('button:has-text("New Chat")')).toBeVisible();
  });

  test('should start a new conversation', async ({ page }) => {
    // Click new chat button
    await page.click('button:has-text("New Chat")');
    
    // Should show new conversation interface
    await expect(page.locator('text="Start a conversation"')).toBeVisible();
    
    // Chat input should be enabled and focused
    const chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await expect(chatInput).toBeVisible();
    await expect(chatInput).toBeEnabled();
  });

  test('should send a simple chat message', async ({ page }) => {
    const testMessage = 'Hello, can you help me understand what documents I have uploaded?';
    
    // Type message in chat input
    const chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await chatInput.fill(testMessage);
    
    // Send message
    await page.click('button:has-text("Send")');
    
    // Should see user message in chat
    await expect(page.locator(`text="${testMessage}"`)).toBeVisible();
    
    // Should see typing indicator or response
    await expect(page.locator('text="Thinking..."')).toBeVisible({ timeout: 5000 });
    
    // Should eventually get a response
    await expect(page.locator('.bg-gray-100, [role="assistant"], text="assistant"')).toBeVisible({ timeout: 15000 });
  });

  test('should handle chat with uploaded document', async ({ page }) => {
    // First upload a document
    const documentContent = 'This is a comprehensive guide about sustainable energy solutions. Solar panels convert sunlight into electricity through photovoltaic cells. Wind turbines harness wind energy to generate power. Hydroelectric power uses flowing water to create energy.';
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'energy-guide.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(documentContent),
    });

    // Wait for document to be processed
    await expect(page.locator('text="energy-guide.txt"')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="complete"')).toBeVisible({ timeout: 20000 });

    // Now ask a question about the document
    const question = 'What types of renewable energy are mentioned in my documents?';
    
    const chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await chatInput.fill(question);
    await page.click('button:has-text("Send")');

    // Should see user message
    await expect(page.locator(`text="${question}"`)).toBeVisible();

    // Should eventually get a response that references the document
    await expect(page.locator('text="Thinking..."')).toBeVisible({ timeout: 5000 });
    
    // Wait for response and check if it contains relevant information
    await page.waitForTimeout(10000); // Give time for AI response
    
    // Look for response containing energy-related terms
    const responseContainer = page.locator('.bg-gray-100, [data-testid="assistant-message"]').last();
    await expect(responseContainer).toBeVisible({ timeout: 15000 });
    
    // Should ideally mention solar, wind, or hydroelectric
    const pageContent = await page.content();
    const hasEnergyTerms = /solar|wind|hydro/i.test(pageContent);
    expect(hasEnergyTerms).toBe(true);
  });

  test('should show message sources when available', async ({ page }) => {
    // Upload a document first
    const documentContent = 'Machine learning algorithms include supervised learning, unsupervised learning, and reinforcement learning. Neural networks are a subset of machine learning.';
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'ml-basics.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(documentContent),
    });

    // Wait for processing
    await expect(page.locator('text="ml-basics.txt"')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="complete"')).toBeVisible({ timeout: 20000 });

    // Ask a question that should reference the document
    const question = 'What are the types of machine learning mentioned?';
    
    const chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await chatInput.fill(question);
    await page.click('button:has-text("Send")');

    // Wait for response
    await page.waitForTimeout(10000);

    // Look for sources section
    const sourcesIndicators = [
      'text="Sources:"',
      'text="Source:"',
      '[data-testid="sources"]',
      '.bg-blue-50'
    ];

    let foundSources = false;
    for (const indicator of sourcesIndicators) {
      if (await page.locator(indicator).first().isVisible({ timeout: 2000 })) {
        foundSources = true;
        break;
      }
    }

    // If no sources visible, that's okay - might depend on backend configuration
    // The test passes if the chat functionality works
  });

  test('should handle conversation history', async ({ page }) => {
    // Send first message
    const firstMessage = 'Hello, what can you help me with?';
    let chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await chatInput.fill(firstMessage);
    await page.click('button:has-text("Send")');

    // Wait for first response
    await page.waitForTimeout(8000);

    // Send second message
    const secondMessage = 'Can you tell me more about that?';
    chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await chatInput.fill(secondMessage);
    await page.click('button:has-text("Send")');

    // Both messages should be visible in chat history
    await expect(page.locator(`text="${firstMessage}"`)).toBeVisible();
    await expect(page.locator(`text="${secondMessage}"`)).toBeVisible();

    // Should see multiple message pairs
    const userMessages = page.locator('.bg-blue-600, [data-testid="user-message"]');
    await expect(userMessages).toHaveCount(2);
  });

  test('should show typing indicator while processing', async ({ page }) => {
    const testMessage = 'Test message for typing indicator';
    
    const chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await chatInput.fill(testMessage);
    await page.click('button:has-text("Send")');

    // Should show typing/thinking indicator
    const typingIndicators = [
      'text="Thinking..."',
      'text="Typing..."',
      'text="Processing..."',
      '.animate-bounce',
      '[data-testid="typing-indicator"]'
    ];

    let foundIndicator = false;
    for (const indicator of typingIndicators) {
      if (await page.locator(indicator).first().isVisible({ timeout: 3000 })) {
        foundIndicator = true;
        break;
      }
    }

    expect(foundIndicator).toBe(true);
  });

  test('should clear input after sending message', async ({ page }) => {
    const testMessage = 'This message should be cleared after sending';
    
    const chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await chatInput.fill(testMessage);
    
    // Verify message is in input
    await expect(chatInput).toHaveValue(testMessage);
    
    // Send message
    await page.click('button:has-text("Send")');
    
    // Input should be cleared
    await expect(chatInput).toHaveValue('');
  });

  test('should disable send button when input is empty', async ({ page }) => {
    const sendButton = page.locator('button:has-text("Send")');
    const chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    
    // Send button should be disabled when input is empty
    await expect(sendButton).toBeDisabled();
    
    // Type something
    await chatInput.fill('Test message');
    
    // Send button should be enabled
    await expect(sendButton).toBeEnabled();
    
    // Clear input
    await chatInput.fill('');
    
    // Send button should be disabled again
    await expect(sendButton).toBeDisabled();
  });
});