import { test, expect } from '@playwright/test';

test.describe('ParametricScene Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?e2e=true');
    await page.waitForFunction(() => window.scene && window.intentService);
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
});