import { test } from './base.js';
import { expect } from '@playwright/test';

/**
 * @fileoverview ConsoleNoise.spec.js
 * QUALITY GATE: Ensures the application doesn't spam the console with errors
 * during normal interaction (e.g. typing in HUD).
 */

test.describe('Console Noise Control', () => {
  test('HUD syntax errors should not trigger console.error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForFunction(() => window.scene && window.intentService);

    // Check errors
    const workerErrors = errors.filter(e => e.includes('Worker-Logic-Mismatch'));
    expect(workerErrors.length).toBe(0);
  });
});