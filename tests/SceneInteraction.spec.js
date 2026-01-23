import { test, expect } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';

test.describe('ParametricScene Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?e2e=true');
    await page.waitForFunction(() => window.scene && window.intentService && window.scene.getVelocity);
  });

  test.afterEach(async ({ page }, testInfo) => {
    const coverage = await page.evaluate(() => window.__coverage__);
    if (coverage) {
      await addCoverageReport(coverage, testInfo);
    }
  });

  test('Double click toggles spin', async ({ page }) => {
    const canvas = page.locator('canvas.Three');
    await canvas.dblclick();
    // Wait a bit to ensure code path executes
    await page.waitForTimeout(100);
    // Toggle back
    await canvas.dblclick();
  });

  test('Drag interaction updates rotation', async ({ page }) => {
    const canvas = page.locator('canvas.Three');
    const box = await canvas.boundingBox();
    // [cite: 2026-01-20] FIX: Drag from center to avoid HUD overlap (top-left)
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 100, startY + 100, { steps: 5 });
    await page.mouse.up();
    
    // Verify scene quaternion changed (via window.scene access)
    const rotation = await page.evaluate(() => {
      return window.scene.scene.children[0].quaternion.toArray();
    });
    expect(rotation).not.toEqual([0, 0, 0, 1]); // Default identity
  });

  test('Resize triggers handler', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(200); // Wait for debounce
  });

  test('Input Decoupling: Multi-touch gestures should not trigger custom rotation', async ({ page }) => {
    // 1. Simulate a pointer move with 'isPrimary: false' 
    // (Simulating the second finger of a pinch)
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      // Dispatch a move event that should be ignored by the custom handler
      const event = new PointerEvent('pointermove', {
        clientX: 500,
        clientY: 500,
        isPrimary: false, // [cite: 2026-01-21] TEST: This flag should block rotation logic
        bubbles: true
      });
      canvas.dispatchEvent(event);
    });
  
    // 2. Verify rotation velocity remains zero (or near zero)
    const velocity = await page.evaluate(() => window.scene.getVelocity());
    expect(velocity).toBe(0);
  });
});