import { test } from './base.js';
import { expect } from '@playwright/test';

/**
 * @fileoverview DisplayBooster.spec.js
 * TARGETED COVERAGE EXPANSION: ParametricScene.js
 * Hits specific low-coverage branches: Momentum, Resize Guards, Layout Modes, Disposal.
 */

test.describe('Display Layer Coverage Booster', () => {
  test('High-Intensity Interaction (ParametricScene)', async ({ page }) => {
    await page.goto('/');
    
    // [cite: 2026-01-24] STABILITY: Wait for "Hot" engine signal (First Frame Rendered)
    await page.waitForFunction(() => window.workerReady === true, { timeout: 60000 });
    
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // 1. Trigger Resize Logic (Hits Window Listeners & Guards)
    // Jump > 300px to hit the "Temporal Guard" (Line 90)
    await page.setViewportSize({ width: 500, height: 500 });
    await page.waitForTimeout(100);
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Trigger "Mobile" layout threshold (Line 105)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(100);
    await page.setViewportSize({ width: 1920, height: 1080 });

    // 2. Multi-Button Mouse Interaction (Hits Branching Event Handlers)
    const box = await canvas.boundingBox();
    if (box) {
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        // "Flick" gesture to generate velocity for Momentum loop (Lines 240-270)
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        // Move fast in a few steps to create delta
        await page.mouse.move(centerX + 200, centerY + 200, { steps: 3 }); 
        await page.mouse.up();
        
        // Allow momentum to decay (hits the animate loop friction logic)
        await page.waitForTimeout(500);
    }

    // 3. Component Teardown (Hits Cleanup/Disposal Branches)
    await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (canvas && canvas.__sceneManager) canvas.__sceneManager.dispose();
    });
  });
});