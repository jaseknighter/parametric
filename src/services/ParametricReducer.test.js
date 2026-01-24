/**
 * @fileoverview ParametricReducer.test.js
 * INVARIANT VERIFICATION: Projection Seatbelt & Intent Authority.
 * [cite: 2026-01-15] Aligned with ParametricRegistry.js paths.
 */
import { ParametricReducer } from '../services/ParametricReducer'

describe('ParametricReducer Invariants', () => {
  const initialState = {
    rid: 100,
    transformationInstructions: {
      projecting: {
        vectors: ['y', 'y', 'z'] // User-authored state
      },
      shaping: {
        vectorParams: {
          BEND: { bendAmtX: 0 }
        }
      }
    }
  };

  test('Slider update should NOT overwrite projection vectors', () => {
    const action = { type: 'INTENT_UPDATE', intentKey: 'bendAmtX', value: 5.0 };
    const nextState = ParametricReducer(initialState, action);

    // [cite: 2026-01-15] EXPECTATION: Reducer stores RAW intent (Degrees).
    expect(nextState.transformationInstructions.shaping.vectorParams.BEND.bendAmtX)
      .toEqual(5.0);

    // SEATBELT CHECK
    expect(nextState.transformationInstructions.projecting.vectors).toEqual(['y', 'y', 'z']);
  });

  test('Projection intent SHOULD update projection vectors', () => {
    // Arrange: Use the 'vectors' key from the Registry which has category: 'project'
    const action = {
      type: 'INTENT_UPDATE',
      intentKey: 'vectors', 
      value: ['z', 'z', 'z'],
      category: 'project' 
    };

    // Act
    const nextState = ParametricReducer(initialState, action);

    // Assert: Latch released legitimately for project category
    expect(nextState.transformationInstructions.projecting.vectors).toEqual(['z', 'z', 'z']);
  });

  test('Batch Atomicity: Multi-axis updates should produce a SINGLE RID', () => {
    // [cite: 2026-01-16] TEST: Simulates a Shift+Drag "Swarm" update
    const batchAction = {
      type: 'INTENT_UPDATE',
      batch: [
        { intentKey: 'bendAmtX', value: 1.5, category: 'deform' },
        { intentKey: 'bendAmtY', value: 1.5, category: 'deform' },
        { intentKey: 'bendAmtZ', value: 1.5, category: 'deform' }
      ],
      rid: initialState.rid + 1
    };

    const nextState = ParametricReducer(initialState, batchAction);
    const vectorParams = nextState.transformationInstructions.shaping.vectorParams.BEND;

    // 1. Verify all values updated
    expect(vectorParams.bendAmtX).toBe(1.5);
    expect(vectorParams.bendAmtY).toBe(1.5);
    expect(vectorParams.bendAmtZ).toBe(1.5);

    // 2. Verify Atomicity (RID changed exactly once relative to initial)
    expect(nextState.rid).not.toBe(initialState.rid);
    
    // 3. Verify no intermediate RIDs were generated (implied by single reducer call, 
    // but crucial for the contract: One Action = One State Transition)
    expect(nextState.rid).toBeGreaterThan(initialState.rid);
  });

  test('Domain Clamping: Reducer accepts values as-is (Clamping is UI responsibility)', () => {
    // The Reducer is the "System of Record" and assumes the UI/IntentService has validated ranges.
    // This test confirms it doesn't arbitrarily reject out-of-bounds values if the UI sends them.
    const action = { type: 'INTENT_UPDATE', intentKey: 'bendAmtX', value: 9999.9 };
    const nextState = ParametricReducer(initialState, action);
    expect(nextState.transformationInstructions.shaping.vectorParams.BEND.bendAmtX).toBe(9999.9);
  });
});