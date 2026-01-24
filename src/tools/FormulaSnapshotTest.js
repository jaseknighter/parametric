/**
 * @fileoverview FormulaSnapshotTest.js
 * INVARIANT: Math consistency between local JS execution and Worker String execution.
 * This script calculates a point using both pipelines and compares the delta.
 * Why this test is critical:
 *  Precision drift: It catches if toPrecise is rounding too aggressively.
 *  Variable Mismatch: It immediately fails if generateFormulaString uses a variable name (like spiral) that you forgot to pass into the worker scope.
 *  Normalization Logic: It verifies that _r and _theta are being calculated identically in both environments.
 */
import formulas, { calculateVector } from '../containers/Parametric/ParametricGeometryFormulas.js';
import { SHAPE_KEYS } from '../shared/ParametricConstants.js';
import { getFormulaExecutionScope } from '../utilities/VariableBridge.js';
import { Debug } from '../utilities/debug.js';

export const runFormulaAudit = (settings) => {
    const u = 0.5;
    const v = 0.5;
    const r = settings.transformationInstructions?.shaping?.radius || 1.0;
    const vp = settings.transformationInstructions.shaping.vectorParams;

    // 1. Calculate locally via JS Functions
    const localResult = calculateVector(u, v, r, vp);

    // 2. Simulate Worker Execution
    // We wrap the generated string in a Function constructor to simulate the worker environment
    // [cite: 2026-01-16] FIX: Generate all 3 components (X, Y, Z) to match Worker logic
    const xCode = formulas.generateFormulaString(settings, {}, 'u');
    const yCode = formulas.generateFormulaString(settings, {}, 'v');
    const zCode = formulas.generateFormulaString(settings, {}, 'w');
    
    // [cite: 2026-01-16] FIX: Use Variable Bridge to ensure Scope Parity with Worker.
    // This prevents "ReferenceError" by injecting the exact same variables the formula expects.
    const executionScope = {
        u, v, 
        PI: Math.PI, E: Math.E, 
        abs: Math.abs, sin: Math.sin, cos: Math.cos, pow: Math.pow, sqrt: Math.sqrt, atan2: Math.atan2, sign: Math.sign,
        ...getFormulaExecutionScope(vp)
    };

    // Dynamic Function Constructor
    // We generate the arguments list dynamically from the scope keys
    const workerSim = new Function(
        ...Object.keys(executionScope), 
        `
        // The generator returns an IIFE string (e.g. "(function(){...})()")
        // We execute each component to get the final vector
        // [cite: 2026-01-16] FIX: Result Harvester Pattern - Explicitly capture IIFE outputs
        return { x: ${xCode}, y: ${yCode}, z: ${zCode} };
        `
    );

    // Execute with the Intent Service's own data
    const workerResult = workerSim(...Object.values(executionScope));

    // 3. Compare Results
    const delta = {
        x: Math.abs(localResult.x - workerResult.x),
        y: Math.abs(localResult.y - workerResult.y),
        z: Math.abs(localResult.z - workerResult.z)
    };

    // [cite: 2026-01-16] FIX: Edge Case Handling for NaN/Infinity
    // Ensure drift detection catches mathematical instability
    const isValid = (n) => typeof n === 'number' && !isNaN(n) && isFinite(n);
    const isStable = isValid(delta.x) && isValid(delta.y) && isValid(delta.z) &&
                     delta.x < 1e-6 && delta.y < 1e-6 && delta.z < 1e-6;

    Debug.log('AUDIT', `📊 [Formula Audit] Result: ${isStable ? 'STABLE ✅' : 'DRIFT DETECTED ❌'}`);
    if (!isStable) {
        console.table({ localResult, workerResult, delta });
    }
    
    return isStable;
};