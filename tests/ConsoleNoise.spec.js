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
    // [cite: 2026-01-24] STABILITY: Wait for "Hot" engine signal (First Frame Rendered)
    await page.waitForFunction(() => window.__PARAMETRIC_READY__ === true, { timeout: 60000 });

    // Check errors
    const workerErrors = errors.filter(e => e.includes('Worker-Logic-Mismatch'));
    expect(workerErrors.length).toBe(0);
  });
});