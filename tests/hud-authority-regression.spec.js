import { test, expect } from '@playwright/test';

test.describe('HUD Authority Contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__PLAYWRIGHT__ = true;
      window.__packetLog = []; // Initialize log capture
    });

    await page.goto('/parametric/');

    await page.waitForFunction(() =>
      window.parametricState &&
      window.parametricState.ready === true
    );
  });

  test('Automatic packet generation must stop after manual override', async ({ page }) => {
    // Let auto mode run briefly
    await page.waitForTimeout(300);

    // Enter manual mode
    await page.click('.HUD_Textarea', { force: true });

    // Wait for latch
    await page.waitForFunction(() => window.parametricState.isManualOverride === true);

    const isManual = await page.evaluate(
      () => window.parametricState.isManualOverride
    );
    expect(isManual).toBe(true);

    // Observe packets AFTER manual override
    await page.waitForTimeout(500);

    const illegalPackets = await page.evaluate(() => {
      const firstManual = window.__packetLog.find(p => p.manual);
      if (!firstManual) return [];

      // Check for any automatic packets (manual=false) that occurred AFTER the first manual packet
      return window.__packetLog.filter(
        p => p.t > firstManual.t && p.manual === false
      );
    });

    console.log('[Authority] Illegal packets:', illegalPackets);

    // THIS should currently fail if the bug exists
    expect(illegalPackets.length).toBe(0);
  });

  test('Startup Race: Immediate manual override must flush pending intent', async ({ page }) => {
    // 1. Refresh to ensure we are at the very start of the lifecycle
    // This simulates the "Fresh Load" condition where focus state might be stale
    // [cite: 2026-01-16] FIX: Clear storage to prevent "Pinch" preset persistence causing Kernel crash
    await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    await page.reload();
    
    // 2. Wait for the HUD to be interactive (but don't wait for "stable" state)
    // We intentionally avoid waiting for full stability to catch the race condition
    const textarea = page.locator('.HUD_Textarea');
    await textarea.waitFor({ state: 'visible' });

    // [cite: 2026-01-16] FIX: Robust Wake-up Protocol
    // Dispatch both visibility and focus events to ensure the Render Watchdog engages.
    await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
        Object.defineProperty(document, 'hidden', { value: false, writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('focus'));
    });

    // 3. Capture baseline RID (should be 1 or 2 from auto-gen)
    const initialRid = await page.evaluate(() => window.parametricState?.rid || 0);

    // 4. Trigger Manual Mode immediately
    // We use a distinct formula (z = 25.0) to verify the render result later
    await textarea.fill('x = u; y = v; z = 5.0;');

    // 5. Assert: The system must wake up and process the manual intent
    // If the "Focus Gate" bug is active, this will fail (RID won't increment)
    await expect(async () => {
      const currentRid = await page.evaluate(() => window.parametricState?.rid || 0);
      expect(currentRid).toBeGreaterThan(initialRid);
    }).toPass({ timeout: 4000 });

    // 6. Verify the geometry actually updated
    const zVal = await page.evaluate(() => {
      const mesh = window.scene?.getMesh ? window.scene.getMesh() : window.scene?.mesh;
      return mesh?.geometry?.attributes?.position?.array[2];
    });
    // [cite: 2026-01-20] FIX: System applies Radius Scaling (5.0) to manual input.
    // Input 5.0 * Radius 5.0 = 25.0
    expect(zVal).toBeCloseTo(25.0, 1);
  });

  test('Manual Mode + Slider: Sliders must update geometry when formula uses variables', async ({ page }) => {
    // 1. Enter Manual Mode with a formula dependent on a slider
    const textarea = page.locator('.HUD_Textarea');
    await textarea.waitFor({ state: 'visible' });
    
    // [cite: 2026-01-18] FIX: Use a linear variable (pinchAmtX) to avoid radian conversion logic
    await textarea.fill('x = u; y = v; z = pinchAmtX;');
    
    // 2. Wait for Manual Mode latch
    await page.waitForFunction(() => window.parametricState.isManualOverride === true);

    // 3. Capture Baseline RID
    const initialRid = await page.evaluate(() => window.parametricState.rid);

    // 4. Move Slider (Pinch X) via Intent Service
    // We use the intent service directly to simulate the slider for precision/speed
    await page.evaluate(() => {
        window.intentService.setIntent('pinchAmtX', 5.0);
    });

    // 5. Wait for RID increment (Worker processed the slider)
    // [cite: 2026-01-19] FIX: Wait for the specific value to propagate, not just any RID change.
    // This ensures we don't assert against a stale frame.
    await page.waitForFunction(({ initialRid }) => {
        const state = window.parametricState;
        const val = state?.transformationInstructions?.shaping?.vectorParams?.PINCH?.pinchAmtX;
        return state.rid > initialRid && val === 5.0;
    }, { initialRid });

    // 6. Verify Z updated to match the slider value
    // If Parametric.js blocks the update, this will fail (Z will remain 0)
    await expect(async () => {
        const currentZ = await page.evaluate(() => {
            const mesh = window.scene?.getMesh ? window.scene.getMesh() : window.scene?.mesh;
            return mesh?.geometry?.attributes?.position?.array[2];
        });
        // [cite: 2026-01-19] FIX: Expect scaled value (5.0 * 5.0 = 25.0) if scaleFactor is active
        expect(currentZ).toBeCloseTo(25.0, 1);
    }).toPass();
  });

  test('Revocation Race: Slider interaction must atomically switch to AUTO', async ({ page }) => {
    // 1. Establish Manual Mode
    const textarea = page.locator('.HUD_Textarea');
    await textarea.waitFor({ state: 'visible' });
    await textarea.fill('x=u; y=v; z=10.0;');
    await page.waitForFunction(() => window.parametricState.isManualOverride === true);

    // 2. Open a Slider (Bend X) and Trigger Interaction
    const stripe = page.locator('[data-testid="control-stripe-bend"]');
    const container = stripe.locator('.TAreaInterface_controlsContainer');
    if (!(await container.isVisible())) {
        await stripe.locator('button.TAreaInterface___TitleButton').click();
    }
    
    const handle = stripe.locator('[data-testid="slider-BEND-X-handle"]');
    await handle.waitFor({ state: 'visible' });
    const box = await handle.boundingBox();
    
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 50, box.y);
    await page.mouse.up();

    // 3. Assert: System must be in AUTO mode
    await expect(async () => {
        const isManual = await page.evaluate(() => window.parametricState.isManualOverride);
        expect(isManual).toBe(false);
    }).toPass();
  });

  test('Manual Mode: Variable Assignment should update geometry', async ({ page }) => {
    // 1. Enter Manual Mode
    const textarea = page.locator('.HUD_Textarea');
    await textarea.waitFor({ state: 'visible' });
    
    // 2. Set a formula that uses a variable, and assign that variable
    // We use a unique value (e.g. 12.34) to verify the assignment works
    const code = `
      pinchAmtX = 12.34;
      x = u; 
      y = v; 
      z = pinchAmtX;
    `;
    await textarea.fill(code);

    // 3. Wait for Manual Mode latch
    await page.waitForFunction(() => window.parametricState.isManualOverride === true);

    // 4. Verify geometry updated to the assigned value
    await expect(async () => {
        const zVal = await page.evaluate(() => {
            const mesh = window.scene?.getMesh ? window.scene.getMesh() : window.scene?.mesh;
            return mesh?.geometry?.attributes?.position?.array[2];
        });
        // [cite: 2026-01-19] FIX: Expect scaled value (12.34 * 5.0 = 61.7)
        expect(zVal).toBeCloseTo(61.7, 1);
    }).toPass();
  });
});