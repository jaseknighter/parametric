/**
 * @fileoverview ParametricHUD.test.js
 * VERIFICATION: Ensures HUD formulas remain dynamic and Registry-aware.
 * [cite: 2026-01-16]
 */
import Formulas from '../../Parametric/ParametricGeometryFormulas';
import { SCALARS } from '../../../shared/ParametricConstants';

describe('HUD Formula Generation', () => {
  const mockSettings = {
    transformationInstructions: {
      shaping: { formula: 'CIRCLE', radius: 1.0 },
      projecting: { vectors: ['x', 'y', 'z'] }
    }
  };

  test('Should use dynamic scope variables for BEND instead of baked values', () => {
    const scope = { bendAmtY: 0.5 }; // Significant value
    const result = Formulas.generateFormulaString(mockSettings, scope, 'u', null, true);
    
    // Expectation: The string should contain "bendAmtY" literal
    expect(result.expr).toContain('bendAmtY');
    
    // [cite: 2026-01-16] FIX: The vars object MUST contain the canonical key
    // so that Parametric.js can identify it as a Registry key and exclude it from baking.
    expect(result.vars).toHaveProperty('bendAmtY');
    
    // Expectation: The scalar should be embedded
    expect(result.expr).toContain(`${SCALARS.BEND}`);
  });

  test('Should use dynamic scope variables for PINCH', () => {
    const scope = { pinchAmtX: 0.5 };
    const result = Formulas.generateFormulaString(mockSettings, scope, 'u', null, true);
    
    expect(result.expr).toContain('pinchAmtX');
    
    // Ensure canonical key is exposed for filtering
    expect(result.vars).toHaveProperty('pinchAmtX');
    expect(result.expr).toContain(`${SCALARS.PINCH}`);
  });

  test('Should include cross-axis term for BEND rotation (Math Correctness)', () => {
    // Bend X affects Z by adding Y * sin(angle)
    const scope = { bendAmtX: 0.5 };
    // Generate Z component ('w')
    const result = Formulas.generateFormulaString(mockSettings, scope, 'w', null, true);
    
    // Expectation: The formula for Z should include the base Y expression (sin(v * PI) ...)
    // Base circle Y is: sin(u * 2.0 * PI) * sin(v * PI)
    expect(result.expr).toContain('sin(v * π)'); 
  });
});