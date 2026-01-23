import { test } from './base.js';
import { expect } from '@playwright/test';

/**
 * @fileoverview DisplayLayerCoverage.spec.js
 * DIAGNOSTIC TEST: Explicitly targets the Display Layer to ensure coverage collection.
 * Forces a 3D render cycle to guarantee src/display/* code execution.
 */

test.describe('Display Layer Coverage', () => {
  test('Explicitly render Display Layer components', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to be ready (Scene & Service)
    await page.waitForFunction(() => window.scene && window.intentService);

    // Force interaction that definitely uses the Display Layer (ParametricScene)
    // Changing the shape triggers a full geometry rebuild and render cycle.
    const stripe = page.getByTestId('control-stripe-shape');
    const container = stripe.locator('.TAreaInterface_controlsContainer');
    
    // Ensure the shape drawer is open
    if (!(await container.isVisible())) {
      await stripe.locator('button.TAreaInterface___TitleButton').click();
    }
    
    // Click a shape button (e.g., KLEIN) to force execution of display logic
    await stripe.locator('button[data-shape="KLEIN"]').click({ force: true });
    
    // Wait for render to settle
    await page.waitForTimeout(1000);
    
    // Check coverage in browser console for debugging
    const coverage = await page.evaluate(() => window.__coverage__);
    
    // Filter for display layer files (case-insensitive check for robustness)
    const displayFiles = Object.keys(coverage || {}).filter(k => 
        k.toLowerCase().includes('display') || 
        k.includes('ParametricScene')
    );
    
    console.log('Manual Test - Display Files found:', displayFiles);
    
    // Assert that we actually touched the display layer
    expect(displayFiles.length).toBeGreaterThan(0);
  });
});
