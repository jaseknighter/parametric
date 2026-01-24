/**
 * @fileoverview ParametricContract.test.js
 * CONTRACT VALIDATION: Ensures Registry, Reducer, and Projections are synchronized.
 * [cite: 2026-01-15]
 */
import { ParametricReducer } from './ParametricReducer';
import { ParametricRegistry } from './ParametricRegistry';
import { intentService } from './ParametricIntentService';

describe('Registry-Reducer Contract Sync', () => {
  const initialState = {
    rid: 1,
    transformationInstructions: {
      shaping: {
        vectorParams: {
          BEND: { bendAmtX: 0 },
          PINCH: { pinchAmtX: 0 },
          TEXTURE: { outerTextureAmt: 0 }
        }
      },
      projecting: { vectors: ['x', 'y', 'z'] }
    }
  };

  const testKeys = ['bendAmtX', 'pinchAmtX', 'vectors', 'outerTextureAmt'];

  testKeys.forEach(key => {
    test(`Reducer should apply correct projection for: ${key}`, () => {
      const metadata = ParametricRegistry[key];
      const rawInput = key === 'vectors' ? ['y', 'y', 'y'] : 42;
      
      const action = {
        type: 'INTENT_UPDATE',
        intentKey: key,
        value: rawInput,
        category: metadata.category,
        rid: initialState.rid + 1
      };

      const nextState = ParametricReducer(initialState, action);

      // 1. Resolve actual value in state
      const pathParts = metadata.path.split('.');
      const actualValue = pathParts.reduce((obj, part) => obj && obj[part], nextState);

      // [cite: 2026-01-15] FIX: Reducer now stores RAW intent. 
      // Projection is deferred to the Worker/CPU edge (ParametricLogic).
      // We expect the state to hold the exact value passed in the action.
      expect(actualValue).toEqual(rawInput);
      
      expect(nextState.rid).toBeGreaterThan(initialState.rid);
    });
  });
});