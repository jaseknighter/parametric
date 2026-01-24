import { test, expect } from '@playwright/test';
import { getFormulaExecutionScope, resetVariableBridge } from '../src/utilities/VariableBridge.js';

/**
 * @fileoverview VariableBridge.spec.js
 * UNIT TEST: Verifies the mapping integrity between Intent Service and Formula Scope.
 */

test.describe('Unit: VariableBridge', () => {
  test('getFormulaExecutionScope maps all canonical keys correctly', () => {
    const mockParams = {
      bendAmtX: 1, bendAmtY: 2, bendAmtZ: 3,
      pinchAmtX: 4, pinchAmtY: 5, pinchAmtZ: 6,
      spiralAmtX: 7, spiralAmtY: 8, spiralAmtZ: 9,
      modulateAmtX: 10, modulateAmtY: 11, modulateAmtZ: 12,
      flattenAmtX: 13, flattenAmtY: 14, flattenAmtZ: 15,
      outerTextureAmt: 16, innerTextureAmt: 17
    };

    const scope = getFormulaExecutionScope(mockParams);

    expect(scope.bendAmtX).toBe(1);
    expect(scope.bendAmtY).toBe(2);
    expect(scope.bendAmtZ).toBe(3);
    expect(scope.pinchAmtX).toBe(4);
    expect(scope.spiralAmtX).toBe(7);
    expect(scope.modulateAmtX).toBe(10);
    expect(scope.flattenAmtX).toBe(13);
    expect(scope.outerTextureAmt).toBe(16);
    expect(scope.innerTextureAmt).toBe(17);
  });

  test('getFormulaExecutionScope defaults missing keys to 0', () => {
    const scope = getFormulaExecutionScope({});
    expect(scope.bendAmtX).toBe(0);
    expect(scope.spiralAmtZ).toBe(0);
    
    // Verify all keys default to 0 to hit all branches
    const keys = [
      'bendAmtX', 'bendAmtY', 'bendAmtZ',
      'pinchAmtX', 'pinchAmtY', 'pinchAmtZ',
      'spiralAmtX', 'spiralAmtY', 'spiralAmtZ',
      'modulateAmtX', 'modulateAmtY', 'modulateAmtZ',
      'flattenAmtX', 'flattenAmtY', 'flattenAmtZ',
      'outerTextureAmt', 'innerTextureAmt'
    ];
    
    keys.forEach(key => expect(scope[key]).toBe(0));
  });

  test('getFormulaExecutionScope preserves raw values (No Projection)', () => {
    // [cite: 2026-01-18] INVARIANT: The Bridge must be "Dumb".
    // It should pass raw values (e.g. degrees) to the consumer.
    // Unit conversion is the responsibility of the Formula Generator or Worker, not the Bridge.
    const mockParams = {
      bendAmtX: 180, // Degrees
      pinchAmtX: 0.5
    };

    const scope = getFormulaExecutionScope(mockParams);

    expect(scope.bendAmtX).toBe(180); // Should NOT be converted to radians (PI)
    expect(scope.pinchAmtX).toBe(0.5);
  });

  test('getFormulaExecutionScope handles null or undefined input', () => {
    resetVariableBridge(); // [cite: 2026-01-20] FIX: Reset state to ensure clean fallback
    const scopeNull = getFormulaExecutionScope(null);
    expect(scopeNull.bendAmtX).toBe(0);

    const scopeUndefined = getFormulaExecutionScope(undefined);
    expect(scopeUndefined.bendAmtX).toBe(0);
  });

  test('Security Guard: getFormulaExecutionScope must filter unknown keys', () => {
    const poisonedInput = {
      bendAmtX: 5,
      maliciousKey: 'DROP TABLE users', // Simulation of unexpected junk data
      unexpectedObject: { leaked: 'internal_state' }
    };
  
    const cleanScope = getFormulaExecutionScope(poisonedInput);
  
    // 1. Verify Known Key persists
    expect(cleanScope.bendAmtX).toBe(5);
  
    // 2. Verify Garbage is filtered (The key should not exist in the output)
    expect(cleanScope.maliciousKey).toBeUndefined();
    expect(cleanScope.unexpectedObject).toBeUndefined();
  });
});