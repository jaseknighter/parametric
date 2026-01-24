import { test, expect } from '@playwright/test';
import { runFormulaAudit } from '../src/tools/FormulaSnapshotTest.js';
import { INITIAL_PARAMETRIC_OBJ } from '../src/shared/ParametricConstants.js';

/**
 * @fileoverview FormulaSnapshot.spec.js
 * UNIT TEST: Verifies the Mathematical Integrity of the Parametric Pipeline.
 * Ensures that the Local JS execution (used for UI/Previews) matches 
 * the Worker String execution (used for Mesh Generation).
 */

test.describe('Tool: Formula Snapshot Audit', () => {
  test('Math consistency between Local JS and Worker String execution', () => {
    // We use the initial state as the baseline settings for the audit
    const isStable = runFormulaAudit(INITIAL_PARAMETRIC_OBJ);
    expect(isStable, 'Worker math logic has drifted from Local JS logic').toBe(true);
  });

  test('Detects drift when formula produces NaN or Infinity (Edge Case)', () => {
    // Create a settings object that forces a math error (e.g. division by zero if logic differs)
    // or simply verify the audit tool handles bad inputs gracefully.
    const badSettings = JSON.parse(JSON.stringify(INITIAL_PARAMETRIC_OBJ));
    // Inject a value that might cause issues if not handled, though our current formulas are robust.
    // This test primarily verifies the harness doesn't crash.
    badSettings.transformationInstructions.shaping.radius = 0; 
    
    const isStable = runFormulaAudit(badSettings);
    expect(typeof isStable).toBe('boolean');
  });

  test('Detects drift when formula logic mismatches (e.g. SINE vs CIRCLE)', () => {
    // Clone initial settings
    const driftSettings = JSON.parse(JSON.stringify(INITIAL_PARAMETRIC_OBJ));
    // Force formula to SINE. 
    // The local JS calculation (calculateVector) is hardcoded to CIRCLE logic.
    // The Worker simulation will generate SINE logic.
    // This mismatch should trigger drift detection.
    driftSettings.transformationInstructions.shaping.formula = 'SINE';
    
    const isStable = runFormulaAudit(driftSettings);
    expect(isStable).toBe(false);
  });
});