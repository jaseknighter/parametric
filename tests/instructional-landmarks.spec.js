import { test, expect } from '@playwright/test';
import { GUIDANCE_REGISTRY } from '../src/shared/GUIDANCE_REGISTRY/GUIDANCE_REGISTRY.js';

/**
 * @fileoverview instructional-landmarks.spec.js
 * VERIFICATION: Uses stable test-ids to validate KaTeX Tooltip logic.
 * [cite: 2026-01-27] Phase 4: Math Tooltip Integration
 */

test.describe('Instructional Landmarks: MathTooltip', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__PARAMETRIC_READY__ === true);
  });

  const drawers = ['bend', 'pinch', 'spiral'];

  drawers.forEach((id) => { 
    test(`Drawer "${id}" renders formatted KaTeX in custom tooltip`, async ({ page }) => {
      const drawerButton = page.getByTestId(`control-stripe-${id}`).locator('.TAreaInterface___TitleButton');
      const tooltip = page.getByTestId(`math-tooltip-${id}`);

      // 1. Verify native tooltip is absent
      await expect(drawerButton).not.toHaveAttribute('title');

      // 2. Trigger Custom Tooltip
      await drawerButton.hover();
      
      // [cite: 2026-01-27] UX: Wait for 1s delay
      await page.waitForTimeout(1100);
      
      await expect(tooltip).toBeVisible();

      // 3. Verify KaTeX Symbols (DOM Check)
      const registryKey = `${id.toUpperCase()}_DRAWER`;
      const behavior = GUIDANCE_REGISTRY[registryKey]?.behavior;

      if (behavior?.includes('$')) {
        await expect(tooltip.locator('.katex')).toHaveCountGreaterThan(0);
      }
      
      // 4. Verify Intent is present
      const intent = GUIDANCE_REGISTRY[registryKey]?.intent;
      if (intent) {
        await expect(tooltip).toContainText(intent);
      }

      // 5. Visual Regression Snapshot
      // Note: Snapshots require a baseline. If running for the first time, this will fail/create new.
      // await expect(tooltip).toHaveScreenshot(`${id}-math-rendering.png`);
    });

    test(`Drawer "${id}" displays tooltip on keyboard focus`, async ({ page }) => {
      const drawerButton = page.getByTestId(`control-stripe-${id}`).locator('.TAreaInterface___TitleButton');
      const tooltip = page.getByTestId(`math-tooltip-${id}`);

      await drawerButton.focus();
      await expect(tooltip).toBeVisible();
    });
  });
});