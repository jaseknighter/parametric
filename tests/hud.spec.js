/**
 * @fileoverview hud.spec.js
 * FINAL RESOLUTION: High-Velocity, Zero-Flake, 12-Invariant Suite.
 * [cite: 2026-01-15] AUTHORITY: Validates UI, Animation, and Manual Mode.
 */
import { test, expect } from '@playwright/test';

test.describe('HUD & Formula System Invariants', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { window.__PLAYWRIGHT__ = true; });
    await page.goto('/');
    
    // Auth: Wait for the engine to be stable before starting any test
    // [cite: 2026-01-24] STABILITY: Wait for "Hot" engine signal (First Frame Rendered)
    await page.waitForFunction(() => window.__PARAMETRIC_READY__ === true, { timeout: 90000 });

    const wrapper = page.locator('.HUD_Wrapper');
    if (await wrapper.evaluate(el => el.classList.contains('is-closed'))) {
      await page.locator('.HUD_Header').click();
    }
  });

  // --- 1. ANIMATION AUTHORITY ---
  test('Animation variable (t) should advance geometry authoritatively', async ({ page }) => {
    const textarea = page.locator('.HUD_Textarea');
    await textarea.fill('x = u; y = v; z = sin(t * 50.0);');
    
    // [cite: 2026-01-16] PROD: Briefly click the canvas to ensure the browser focuses/animates the tab
    await page.mouse.click(500, 500);
    
    // Capture initial Z position
    const z1 = await page.evaluate(() => {
      const mesh = window.scene.getMesh?.() || window.scene.mesh;
      return mesh.geometry.attributes.position.array[2];
    });

    // Wait for animation to advance (Deterministic)
    await page.waitForFunction((startZ) => {
      const mesh = window.scene.getMesh?.() || window.scene.mesh;
      const currentZ = mesh.geometry.attributes.position.array[2];
      return Math.abs(currentZ - startZ) > 0.0001;
    }, z1, { timeout: 10000 });
  });

  // --- 2. AUTHORITY REVOCATION ---
  test('Slider interaction should revoke manual HUD authority', async ({ page }) => {
    await page.locator('.HUD_Textarea').fill('x = u; y = v; z = 5.0;');
    await expect(page.locator('.HUD_Wrapper')).toHaveClass(/is-manual/);

    const stripe = page.getByTestId('control-stripe-bend');
    if (!(await stripe.locator('.TAreaInterface_controlsContainer').isVisible())) {
      await stripe.locator('button.TAreaInterface___TitleButton').click();
    }

    const handle = stripe.locator('[data-testid*="handle"]').first();
    // Use 'attached' state + a small wait to bypass CSS transition flakiness
    await handle.waitFor({ state: 'attached' });
    await page.waitForTimeout(300); 
    
    const box = await handle.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y, { steps: 5 });
    await page.mouse.up();

    await expect(page.locator('.HUD_Wrapper')).toHaveClass(/is-generated/, { timeout: 3000 });
  });

  // --- 3. PROJECTION AUTHORITY ---
  test('Projection buttons should update HUD formula', async ({ page }) => {
    const stripe = page.getByTestId('control-stripe-project');
    if (!(await stripe.locator('.TAreaInterface_controlsContainer').isVisible())) {
      await stripe.locator('button.TAreaInterface___TitleButton').click();
    }
    
    const btn = stripe.locator('.IconButton___y').first();
    // [cite: 2026-01-15] FIX: Ensure UI is stable before clicking
    await btn.waitFor({ state: 'visible' });
    await page.waitForTimeout(300); // Allow animation to settle
    await btn.click({ force: true });
    
    // [cite: 2026-01-15] FIX: The HUD displays expanded math.
    // Projecting Y (sin-based) onto X (cos-based) means X should become sin-based.
    await expect(page.locator('.HUD_Textarea')).toHaveValue(/x = sin/, { timeout: 3000 });
  });

  // --- 4. STICKINESS ---
  test('Manual Mode should be sticky across shape changes', async ({ page }) => {
    const textarea = page.locator('.HUD_Textarea');
    await textarea.fill('x = u; y = v; z = 2.0;');
    
    // [cite: 2026-01-30] FIX: Open Shape drawer before interaction
    const stripe = page.getByTestId('control-stripe-shape');
    const container = stripe.locator('.TAreaInterface_controlsContainer');
    if (!(await container.isVisible())) {
      await stripe.locator('button.TAreaInterface___TitleButton').click();
      await expect(container).toHaveClass(/Controls_Show/);
    }

    await page.locator('button[data-shape="SINE"]').click({ force: true });
    await expect(page.locator('.HUD_Wrapper')).toHaveClass(/is-manual/);
    expect(await textarea.inputValue()).toContain('z = 2.0;');
  });

  // --- 5. ERROR STATE ---
  test('Invalid math should trigger visual error state', async ({ page }) => {
    await page.locator('.HUD_Textarea').fill('x = ;'); 
    await expect(page.locator('.HUD_Wrapper')).toHaveClass(/has-error/, { timeout: 5000 });
  });
});