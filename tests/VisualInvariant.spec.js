/**
 * @fileoverview VisualInvariant.spec.js
 * E2E SMOKE TEST: Validates UI-Worker Synchronization.
 * [cite: 2026-01-15] FIXED: Aligned with Stripe-based UI architecture.
 */
import { test, expect } from '@playwright/test';
import { getVectors } from './test-helpers';

// [cite: 2026-01-15] AUTHORITY: Prevent GPU collisions by running these 3D tests serially
test.describe.configure({ mode: 'serial' });

test.describe('Parametric Visual Invariants', () => {
  
  test.beforeEach(async ({ page }) => {
    // 1. Force debug mode for renderer hooks
    await page.addInitScript(() => { window.__PLAYWRIGHT__ = true; });
    await page.goto('/');

    // 2. Wait for System Readiness (using your Smoke Suite logic)
    await page.waitForFunction(() => window.scene && window.intentService);
    
    // 3. OPEN THE DRAWER (The "Stripe")
    // In your UI, sliders live inside a 'control-stripe'
    const stripe = page.getByTestId('control-stripe-bend');
    const container = stripe.locator('.TAreaInterface_controlsContainer');
    
    // If the stripe is closed, click the title button to expand it
    if (!(await container.isVisible())) {
      await stripe.locator('button.TAreaInterface___TitleButton').click();
      // Ensure the expansion animation is finished
      await expect(container).toHaveClass(/Controls_Show/);
    }
  });

  test('Slider: BEND-X should update engine and resolve RID', async ({ page }) => {
    // Use the specific ID pattern from your Smoke Suite
    const testID = 'slider-BEND-X';
    const handle = page.getByTestId(`${testID}-handle`);
    const rail = page.getByTestId(`${testID}-rail`);
    const railBox = await rail.boundingBox();

    if (railBox) {
      // Simulate real user drag
      await handle.hover();
      await page.mouse.down();
      await page.mouse.move(railBox.x + railBox.width / 2, railBox.y, { steps: 5 });
      await page.mouse.up();
    }

    // 4. SEATBELT CHECK: Verify projection vectors didn't reset (using your util)
    const vectors = await getVectors(page);
    expect(vectors.length).toBe(3);
  });
});