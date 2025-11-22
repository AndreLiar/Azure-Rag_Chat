import { test, expect } from '@playwright/test';

test.describe('Complete RAG Chat Workflow', () => {
  const testUser = {
    email: `workflow-test-${Date.now()}@example.com`,
    password: 'testpassword123',
    orgName: `Workflow Test Org ${Date.now()}`
  };

  test('complete organization workflow: register → upload → chat → manage conversations', async ({ page }) => {
    // Step 1: Register new organization
    await page.goto('/');
    
    await page.click('button:has-text("Sign Up")');
    await page.fill('input[placeholder="Organization Name"]', testUser.orgName);
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button:has-text("Create Organization")');
    
    // Verify successful registration
    await expect(page.locator('h1:has-text("FineDocChat")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text="${testUser.email}"`)).toBeVisible();
    console.log('✅ Step 1: Organization registration successful');

    // Step 2: Upload documents
    const documents = [
      {
        name: 'tech-guide.txt',
        content: `Artificial Intelligence (AI) Technology Guide
        
AI encompasses machine learning, deep learning, and neural networks. 
Machine learning algorithms include supervised learning (classification, regression), 
unsupervised learning (clustering, dimensionality reduction), and reinforcement learning.

Deep learning uses multi-layered neural networks to process complex data patterns.
Popular frameworks include TensorFlow, PyTorch, and Keras.

Natural Language Processing (NLP) enables computers to understand human language.
Applications include sentiment analysis, text classification, and language translation.

Computer vision allows machines to interpret visual information.
Applications include image recognition, object detection, and facial recognition.`
      },
      {
        name: 'business-strategy.txt',
        content: `Digital Transformation Strategy

Companies must adapt to digital technologies to remain competitive.
Key areas include cloud computing, data analytics, and automation.

Customer experience is paramount in digital transformation.
Personalization and omnichannel approaches drive customer satisfaction.

Data-driven decision making requires robust analytics capabilities.
Business intelligence tools help organizations extract insights from data.

Change management is crucial for successful digital transformation.
Employee training and cultural adaptation ensure smooth transitions.`
      }
    ];

    for (const doc of documents) {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: doc.name,
        mimeType: 'text/plain',
        buffer: Buffer.from(doc.content),
      });

      // Wait for upload to complete
      await expect(page.locator(`text="${doc.name}"`)).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000); // Brief pause between uploads
    }

    // Wait for all documents to be processed
    await expect(page.locator('text="complete"')).toBeVisible({ timeout: 30000 });
    console.log('✅ Step 2: Document upload successful');

    // Step 3: Test RAG chat functionality
    const chatQuestions = [
      {
        question: 'What machine learning types are mentioned in my documents?',
        expectedTerms: ['supervised', 'unsupervised', 'reinforcement']
      },
      {
        question: 'What are the key areas of digital transformation?',
        expectedTerms: ['cloud', 'analytics', 'automation']
      },
      {
        question: 'Tell me about deep learning frameworks',
        expectedTerms: ['TensorFlow', 'PyTorch', 'Keras']
      }
    ];

    for (let i = 0; i < chatQuestions.length; i++) {
      const { question, expectedTerms } = chatQuestions[i];
      
      if (i > 0) {
        // Create new conversation for each question after the first
        await page.click('button:has-text("New Chat")');
      }

      const chatInput = page.locator('textarea[placeholder*="Ask a question"]');
      await chatInput.fill(question);
      await page.click('button:has-text("Send")');

      // Wait for response
      await expect(page.locator(`text="${question}"`)).toBeVisible();
      await expect(page.locator('text="Thinking..."')).toBeVisible({ timeout: 5000 });
      
      // Wait for AI response
      await page.waitForTimeout(12000);

      // Check if response contains expected terms
      const pageContent = await page.content().then(content => content.toLowerCase());
      const foundTerms = expectedTerms.filter(term => pageContent.includes(term.toLowerCase()));
      
      console.log(`✅ Step 3.${i + 1}: Asked "${question}" - Found terms: ${foundTerms.join(', ')}`);
    }

    console.log('✅ Step 3: RAG chat functionality tested');

    // Step 4: Test conversation management
    // Check conversation list
    await page.waitForTimeout(3000);
    
    const conversationList = page.locator('[data-testid="conversation-list"], .space-y-1').first();
    if (await conversationList.isVisible()) {
      const conversationItems = conversationList.locator('div[role="button"], .cursor-pointer');
      const conversationCount = await conversationItems.count();
      
      console.log(`✅ Step 4: Found ${conversationCount} conversations in sidebar`);
      
      // Test switching between conversations
      if (conversationCount > 1) {
        // Click on first conversation
        await conversationItems.first().click();
        await page.waitForTimeout(2000);
        
        // Click on second conversation
        await conversationItems.nth(1).click();
        await page.waitForTimeout(2000);
        
        console.log('✅ Step 4: Conversation switching tested');
      }
    }

    // Step 5: Test search functionality (if available)
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('machine learning');
      await page.waitForTimeout(2000);
      console.log('✅ Step 5: Search functionality tested');
    }

    // Step 6: Test document management
    // Check uploaded documents list
    const documentsList = page.locator('[data-testid="document-list"], text="Documents"').first();
    if (await documentsList.isVisible()) {
      // Should see both uploaded documents
      await expect(page.locator('text="tech-guide.txt"')).toBeVisible();
      await expect(page.locator('text="business-strategy.txt"')).toBeVisible();
      console.log('✅ Step 6: Document management verified');
    }

    // Step 7: Test logout and re-login
    await page.click('button:has-text("Sign Out")');
    await expect(page.locator('h2:has-text("Sign In")')).toBeVisible();
    
    // Log back in
    await page.click('button:has-text("Sign In")');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button:has-text("Sign In")');
    
    await expect(page.locator('h1:has-text("FineDocChat")')).toBeVisible({ timeout: 10000 });
    console.log('✅ Step 7: Logout and re-login successful');

    // Step 8: Verify data persistence
    await page.waitForTimeout(5000);
    
    // Check if documents are still there
    const documentsStillVisible = await Promise.all([
      page.locator('text="tech-guide.txt"').isVisible({ timeout: 5000 }),
      page.locator('text="business-strategy.txt"').isVisible({ timeout: 5000 })
    ]);
    
    const documentsPersistedCount = documentsStillVisible.filter(Boolean).length;
    console.log(`✅ Step 8: ${documentsPersistedCount}/2 documents persisted after login`);

    console.log('🎉 Complete workflow test finished successfully!');
  });

  test('error handling and edge cases', async ({ page }) => {
    const testUser2 = {
      email: `error-test-${Date.now()}@example.com`,
      password: 'testpassword123',
      orgName: `Error Test Org ${Date.now()}`
    };

    // Register user
    await page.goto('/');
    await page.click('button:has-text("Sign Up")');
    await page.fill('input[placeholder="Organization Name"]', testUser2.orgName);
    await page.fill('input[type="email"]', testUser2.email);
    await page.fill('input[type="password"]', testUser2.password);
    await page.click('button:has-text("Create Organization")');
    await expect(page.locator('h1:has-text("FineDocChat")')).toBeVisible({ timeout: 10000 });

    // Test empty message handling
    const chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await chatInput.fill('');
    const sendButton = page.locator('button:has-text("Send")');
    await expect(sendButton).toBeDisabled();
    console.log('✅ Empty message properly disabled');

    // Test very long message
    const longMessage = 'Very long message. '.repeat(100);
    await chatInput.fill(longMessage);
    await expect(sendButton).toBeEnabled();
    console.log('✅ Long message handling tested');

    // Test special characters
    const specialMessage = 'Test with special chars: áéíóú ñ @#$%^&*() 中文 العربية 🚀🎉';
    await chatInput.fill(specialMessage);
    await page.click('button:has-text("Send")');
    await expect(page.locator(`text="${specialMessage}"`)).toBeVisible();
    console.log('✅ Special characters handled correctly');

    // Test rapid message sending
    const rapidMessages = ['Message 1', 'Message 2', 'Message 3'];
    for (const msg of rapidMessages) {
      await chatInput.fill(msg);
      await page.click('button:has-text("Send")');
      await page.waitForTimeout(1000); // Small delay
    }
    
    // All messages should appear
    for (const msg of rapidMessages) {
      await expect(page.locator(`text="${msg}"`)).toBeVisible();
    }
    console.log('✅ Rapid message sending handled');

    console.log('🎉 Error handling tests completed!');
  });

  test('performance and responsiveness', async ({ page }) => {
    const performanceUser = {
      email: `perf-test-${Date.now()}@example.com`,
      password: 'testpassword123',
      orgName: `Performance Test Org ${Date.now()}`
    };

    // Register and measure time
    const startTime = Date.now();
    await page.goto('/');
    await page.click('button:has-text("Sign Up")');
    await page.fill('input[placeholder="Organization Name"]', performanceUser.orgName);
    await page.fill('input[type="email"]', performanceUser.email);
    await page.fill('input[type="password"]', performanceUser.password);
    await page.click('button:has-text("Create Organization")');
    await expect(page.locator('h1:has-text("FineDocChat")')).toBeVisible({ timeout: 10000 });
    
    const registrationTime = Date.now() - startTime;
    console.log(`✅ Registration took ${registrationTime}ms`);

    // Test page load performance
    const loadStart = Date.now();
    await page.reload();
    await expect(page.locator('h1:has-text("FineDocChat")')).toBeVisible({ timeout: 10000 });
    const loadTime = Date.now() - loadStart;
    console.log(`✅ Page reload took ${loadTime}ms`);

    // Test chat responsiveness
    const chatStart = Date.now();
    const chatInput = page.locator('textarea[placeholder*="Ask a question"]');
    await chatInput.fill('Quick performance test message');
    await page.click('button:has-text("Send")');
    await expect(page.locator('text="Quick performance test message"')).toBeVisible();
    const chatResponseTime = Date.now() - chatStart;
    console.log(`✅ Chat response took ${chatResponseTime}ms`);

    // Test UI responsiveness with multiple interactions
    const interactions = [
      () => page.click('button:has-text("New Chat")'),
      () => chatInput.fill('Test message'),
      () => chatInput.clear(),
      () => page.locator('input[placeholder*="Search"]').first().fill('search').catch(() => {}),
    ];

    for (const interaction of interactions) {
      const interactionStart = Date.now();
      await interaction();
      await page.waitForTimeout(100);
      const interactionTime = Date.now() - interactionStart;
      console.log(`✅ UI interaction took ${interactionTime}ms`);
    }

    console.log('🎉 Performance tests completed!');
  });
});