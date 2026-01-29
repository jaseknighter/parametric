/**
 * @fileoverview test-helpers.js
 * [cite: 2026-01-15] AUTHORITY: State-driven synchronization with enhanced diagnostics.
 * GUIDELINE: Tests must assert against the highest-level stable authority available 
 * (IntentService/Reducer), and only descend to GPU state when explicitly testing rendering.
 */
import { expect } from '@playwright/test';
import { INTENT_CONFIG } from '../src/shared/ParametricConstants';

export async function ensureCoverageGated(page) {
  try {
    await page.waitForFunction(() => {
      // 🛡️ The Invariant: Object must exist and contain keys
      return typeof window.__coverage__ === 'object' && Object.keys(window.__coverage__).length > 0;
    }, { timeout: 15000 }); // 15s is plenty for a warm runner
  } catch (e) {
    const env = await page.evaluate(() => import.meta.env.VITE_COVERAGE).catch(() => 'unknown');
    throw new Error(`🚨 INSTRUMENTATION LEAK: VITE_COVERAGE is ${env}, but window.__coverage__ is missing. Page path: ${page.url()}`);
  }
}

export async function getVectors(page) {
  return page.evaluate(() => {
    return window.intentService?.state?.vectors || [];
  });
}

/**
 * Wait for vectors to reach a specific state.
 * Added logging to validate why the state might not be matching.
 */
export async function waitForVector(page, expectedAxis, timeout = 8000) {
  // Capture the RID *before* the action happened (if possible) or use a previous ref
  await page.waitForFunction(
    ({ axis }) => {
      const state = window.intentService?.state;
      const vectors = state?.vectors;
      
      // Determine column index based on expected axis
      const colMap = { 'x': 0, 'y': 1, 'z': 2 };
      const col = colMap[axis] !== undefined ? colMap[axis] : 0;
      
      // Verification: Check Col 0, Row 0
      // [cite: 2026-01-15] Determinism: We only pass if the vectors exist AND match.
      return vectors && vectors[0][col] === axis;
    },
    { axis: expectedAxis },
    { timeout }
  );
}

/**
 * Click a projection button and wait for state confirmation.
 * Increased settle buffer to ensure React doesn't discard the click.
 */
export async function clickAndWaitForVector(page, elementHandle, expected, timeout = 8000) {
  // 1. Settle UI Drawer animations
  await page.waitForTimeout(300); 
  
  // 2. Click with Force to bypass transient overlays
  await elementHandle.waitFor({ state: 'visible' });
  await elementHandle.click({ force: true });
  
  // 3. Poll for state authority transition
  await waitForVector(page, expected, timeout);
}

export async function expectGeometryChange(page, timeout = 8000) {
  await page.waitForFunction(
    (epsilon) => {
      const mesh = window.scene?.getMesh?.() || window.scene?.mesh;
      if (!mesh) return false;

      const pos = mesh.geometry?.attributes?.position?.array;
      if (!pos || pos.length === 0) return false;

      const currentSample = pos[2];
      if (window._lastZ === undefined) {
        window._lastZ = currentSample;
        return false;
      }

      if (Math.abs(currentSample - window._lastZ) > epsilon) {
        window._lastZ = currentSample;
        return true;
      }
      return false;
    },
    INTENT_CONFIG.SYNC_EPSILON,
    { timeout, polling: 100 }
  );
}

/**
 * assertStateMirroring
 * [cite: 2026-01-15] ARCHITECTURAL INVARIANT:
 * Verifies that IntentService is a perfect mirror of the Reducer.
 */
export async function assertStateMirroring(page, timeout = 2000) {
  await expect(async () => {
    const isMirrored = await page.evaluate((epsilon) => {
      if (!window.intentService || !window.parametricState) return false;
      
      const rParams = window.parametricState.transformationInstructions.shaping.vectorParams;
      const serviceState = window.intentService.state;

      // Check key shaping values with epsilon
      // We iterate over the service state to ensure everything it thinks is true matches the Reducer
      const keysToCheck = ['bendAmtX', 'bendAmtY', 'bendAmtZ', 'pinchAmtX', 'pinchAmtY', 'pinchAmtZ'];
      
      return keysToCheck.every(key => {
        // Find matching key in reducer (flattened check)
        // The reducer nests these under BEND, PINCH, etc.
        const group = key.startsWith('bend') ? 'BEND' : (key.startsWith('pinch') ? 'PINCH' : null);
        const rVal = group ? rParams[group]?.[key] : 0;
        const sVal = serviceState[key] || 0;
        return Math.abs((rVal || 0) - sVal) < epsilon;
      });
    }, INTENT_CONFIG.SYNC_EPSILON);
    expect(isMirrored, "IntentService state has diverged from Reducer truth").toBe(true);
  }).toPass({ timeout });
}

/**
 * Helper: Test Shift + Drag multi-axis slider for all axes (X, Y, Z)
 * Verifies the Identity Contract (moving X affects Y/Z).
 * @param page - Playwright page
 * @param control - Slider control name (e.g., "BEND")
 * @param values - Optional map of axis -> value, or single number applied to all axes
 */
export async function testShiftDragAllAxes(page, control, values) {
  const axisValues = typeof values === 'number' 
    ? { X: values, Y: values, Z: values } 
    : values;

  const stripe = page.getByTestId(`control-stripe-${control.toLowerCase()}`);
  
  // Ensure controls are open
  const container = stripe.locator('.TAreaInterface_controlsContainer');
  if (!(await container.isVisible())) {
    await stripe.locator('button.TAreaInterface___TitleButton').click();
    await expect(container).toHaveClass(/Controls_Show/);
  }

  const results = {};

  for (const axis of ['X', 'Y', 'Z']) {
    const activeKey = `${control.toLowerCase()}Amt${axis}`;
    const expectedValue = axisValues[axis];

    // Press Shift
    await page.keyboard.down('Shift');
    await page.waitForTimeout(100); // Allow React event loop to register keydown

    // Dispatch parametric update for the active axis
    await page.evaluate(({ key, val, path }) => {
      const payload = [{ objectStatePath: path, paramToUpdate: key, newValue: val }];
      if (!window.onUpdateParametric) throw new Error("onUpdateParametric not found");
      window.onUpdateParametric(payload, { shiftKey: true, activeKey: key });
    }, {
      key: activeKey,
      val: expectedValue,
      path: `transformationInstructions.shaping.vectorParams.${control}`
    });

    // [cite: 2026-01-16] WRENCH: Wait for VALUE convergence, not RID.
    // This is immune to RID-overwriting races caused by jitter.
    await page.waitForFunction(({ key, val, group }) => {
      const rVal = window.parametricState?.transformationInstructions?.shaping?.vectorParams?.[group]?.[key];
      const sVal = window.intentService?.state?.[key];
      // Wait until BOTH Reducer and Service have converged on the target
      return Math.abs(rVal - val) < 0.01 && Math.abs(sVal - val) < 0.01;
    }, { key: activeKey, val: expectedValue, group: control }, { timeout: 5000 });

    // Release Shift
    await page.keyboard.up('Shift');

    // Capture values after update
    results[axis] = await page.evaluate(({ s }) => {
      const state = window.intentService?.state || {};
      return {
        X: state[`${s.toLowerCase()}AmtX`],
        Y: state[`${s.toLowerCase()}AmtY`],
        Z: state[`${s.toLowerCase()}AmtZ`]
      };
    }, { s: control });
  }

  return results;
}

/**
 * Mimics a Shift+Drag interaction on a 3-axis vector group.
 * @param {string} group - e.g., 'BEND', 'PINCH', 'SPIRAL'
 * @param {Object} values - { x: number, y: number, z: number }
 */
export async function shiftDragSlider(page, group, values) {
  await page.evaluate(({ group, values }) => {
    // 1. Construct the batch based on the Registry keys for this group
    const batch = [
      { paramToUpdate: `${group.toLowerCase()}AmtX`, newValue: values.x },
      { paramToUpdate: `${group.toLowerCase()}AmtY`, newValue: values.y },
      { paramToUpdate: `${group.toLowerCase()}AmtZ`, newValue: values.z }
    ];

    // 2. Call the real handler that was attached to window during bootstrap
    // This ensures we trigger the Reducer batch logic and the Atomic RID.
    if (window.updateParametricObjHandler) {
      window.updateParametricObjHandler(batch);
    } else {
      throw new Error("Parametric UI Handler not found on global scope.");
    }
  }, { group, values });
}

/**
 * Verifies that the Interface is visually and interactively collapsed.
 * Checks pointer-events and opacity.
 */
export async function expectInterfaceCollapsed(page) {
  const interfaceEl = page.locator('.Interface');
  await expect(interfaceEl).toHaveCSS('pointer-events', 'none');
  
  // Visual Check: Interface container itself fades out
  await expect(interfaceEl).toHaveCSS('opacity', '0');
}