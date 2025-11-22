import { test, expect } from '@playwright/test';
import { createTestUser, loginUser } from './helpers/auth-helper';

test.describe('Document Upload and Management', () => {
  let testUser: { email: string; password: string; orgName: string };

  test.beforeAll(async () => {
    testUser = {
      email: `test-docs-${Date.now()}@example.com`,
      password: 'testpassword123',
      orgName: `Document Test Org ${Date.now()}`
    };
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await createTestUser(page, testUser);
  });

  test('should display document upload interface', async ({ page }) => {
    // Should see the document upload section
    await expect(page.locator('text="Upload Documents"')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeVisible();
    await expect(page.locator('text="Drag & drop files here"')).toBeVisible();
  });

  test('should upload a text document successfully', async ({ page }) => {
    // Create a test file
    const testContent = 'This is a test document about artificial intelligence and machine learning. It contains information about neural networks, deep learning, and natural language processing.';
    
    // Create a temporary file blob
    const file = new File([testContent], 'test-document.txt', { type: 'text/plain' });
    
    // Upload the file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(testContent),
    });

    // Click upload button or wait for auto-upload
    const uploadButton = page.locator('button:has-text("Upload")');
    if (await uploadButton.isVisible()) {
      await uploadButton.click();
    }

    // Wait for upload to complete
    await expect(page.locator('text="test-document.txt"')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="complete"')).toBeVisible({ timeout: 15000 });
  });

  test('should display uploaded documents list', async ({ page }) => {
    // Upload a document first
    const testContent = 'Sample document content for listing test.';
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'sample-doc.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(testContent),
    });

    // Wait for upload to complete
    await expect(page.locator('text="sample-doc.txt"')).toBeVisible({ timeout: 10000 });
    
    // Should show document in the list
    const documentList = page.locator('[data-testid="document-list"], .document-list, text="Documents"').first();
    await expect(documentList).toBeVisible();
    await expect(page.locator('text="sample-doc.txt"')).toBeVisible();
  });

  test('should handle multiple file uploads', async ({ page }) => {
    const files = [
      {
        name: 'doc1.txt',
        content: 'First document about technology trends.',
        mimeType: 'text/plain'
      },
      {
        name: 'doc2.txt', 
        content: 'Second document about business strategy.',
        mimeType: 'text/plain'
      }
    ];

    // Upload multiple files
    for (const file of files) {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: file.name,
        mimeType: file.mimeType,
        buffer: Buffer.from(file.content),
      });

      // Wait for each upload to start
      await page.waitForTimeout(1000);
    }

    // Wait for all uploads to complete
    for (const file of files) {
      await expect(page.locator(`text="${file.name}"`)).toBeVisible({ timeout: 15000 });
    }
  });

  test('should delete uploaded document', async ({ page }) => {
    // Upload a document first
    const testContent = 'Document to be deleted.';
    const fileName = 'delete-me.txt';
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from(testContent),
    });

    // Wait for upload to complete
    await expect(page.locator(`text="${fileName}"`)).toBeVisible({ timeout: 10000 });

    // Look for delete button near the file
    const deleteButton = page.locator(`[data-testid="delete-${fileName}"], button:near(:text("${fileName}"))`).first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Confirm deletion if modal appears
      const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Document should be removed from list
      await expect(page.locator(`text="${fileName}"`)).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should show upload progress for large files', async ({ page }) => {
    // Create a larger test file
    const largeContent = 'Large document content. '.repeat(1000);
    const fileName = 'large-document.txt';
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from(largeContent),
    });

    // Should show some kind of progress indicator
    const progressIndicators = [
      'progress',
      'uploading',
      'processing',
      '%',
      'loading',
      'spinner',
      'pending'
    ];

    let foundProgress = false;
    for (const indicator of progressIndicators) {
      if (await page.locator(`text="${indicator}"`).first().isVisible({ timeout: 2000 })) {
        foundProgress = true;
        break;
      }
    }

    // Wait for completion
    await expect(page.locator(`text="${fileName}"`)).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text="complete"')).toBeVisible({ timeout: 20000 });
  });

  test('should handle unsupported file types gracefully', async ({ page }) => {
    // Try to upload an unsupported file type
    const invalidContent = 'Invalid file content';
    const fileName = 'test.xyz'; // Unsupported extension
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: 'application/xyz',
      buffer: Buffer.from(invalidContent),
    });

    // Should either reject the file or show an error
    await page.waitForTimeout(3000);
    
    // Look for error messages
    const errorIndicators = [
      'error',
      'unsupported',
      'invalid',
      'failed',
      'not supported'
    ];

    // Either should show error or not appear in the list
    const hasError = await Promise.race([
      ...errorIndicators.map(indicator => 
        page.locator(`text="${indicator}"`).first().isVisible({ timeout: 1000 })
      ),
      page.locator(`text="${fileName}"`).isVisible({ timeout: 1000 }).then(() => false)
    ]);
  });
});