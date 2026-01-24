/**
 * @fileoverview ParametricRegistry.test.js
 * COMPREHENSIVE REGISTRY EXHAUSTION: Validates every entry against the Reducer.
 * [cite: 2026-01-15]
 */
import { ParametricReducer } from './ParametricReducer';
import { ParametricRegistry } from './ParametricRegistry';
import { intentService } from './ParametricIntentService';

describe('ParametricRegistry Exhaustion Suite', () => {
  const allKeys = Object.keys(ParametricRegistry);

  const createInitialState = () => ({
    rid: 1,
    transformationInstructions: {
      shaping: {
        vectorParams: {
          BEND: {}, PINCH: {}, TEXTURE: {}, 
          SPIRAL: {}, MODULATE: {}, FLATTEN: {}
        },
        formula: 'CIRCLE',
        radius: 2.5
      },
      projecting: { vectors: ['x', 'y', 'z'] }
    }
  });

  allKeys.forEach(key => {
    // [cite: 2026-01-16] SKIP: 't' (Time) is transient/animation-driven and bypasses standard Reducer persistence.
    if (key === 't') return;

    describe(`Registry Key: ${key}`, () => {
      const metadata = ParametricRegistry[key];

      test('Path should be reachable by the Reducer', () => {
        const initialState = createInitialState();
        const testValue = metadata.projection === 'raw' ? ['a', 'b', 'c'] : 1.23;
        
        const action = {
          type: 'INTENT_UPDATE',
          intentKey: key,
          value: testValue,
          category: metadata.category 
        };

        const nextState = ParametricReducer(initialState, action);

        // Traverse the path to verify the write occurred
        const pathParts = metadata.path.split('.');
        const actualValue = pathParts.reduce((obj, part) => obj && obj[part], nextState);

        // [cite: 2026-01-15] FIX: Reducer stores RAW intent.
        expect(actualValue).toEqual(testValue);
      });

      test('Should have a valid category aligned with Seatbelt logic', () => {
        const validCategories = ['deform', 'postProcess', 'displace', 'project', 'animate', 'shape'];
        expect(validCategories).toContain(metadata.category);
      });

      test('Should define a default value', () => {
        expect(metadata.default).toBeDefined();
      });
    });
  });

  test('Exclusion Contract: Registry keys must be identified for HUD exclusion', () => {
    // This simulates the check performed in Parametric.js memo
    const testKeys = ['bendAmtX', 'pinchAmtY', 'customNonRegistryVar'];
    
    const results = testKeys.map(key => ({
      key,
      isExcluded: !!ParametricRegistry[key]
    }));

    expect(results.find(r => r.key === 'bendAmtX').isExcluded).toBe(true);
    expect(results.find(r => r.key === 'customNonRegistryVar').isExcluded).toBe(false);
  });
});