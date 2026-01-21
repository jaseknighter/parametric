import { ParametricRegistry } from '../../services/ParametricRegistry';
import { ParametricReducer } from '../../services/ParametricReducer';

describe('Reducer Path Integrity', () => {
  // Iterate over all registry keys to ensure no "Silent Path Failures"
  Object.keys(ParametricRegistry).forEach(key => {
    // Skip keys that might not have a direct path if necessary, or assume all do
    if (!ParametricRegistry[key].path) return;
    
    // [cite: 2026-01-16] SKIP: 't' (Time) is transient/animation-driven and bypasses standard Reducer persistence.
    if (key === 't') return;

    test(`should surgically update the path for: ${key}`, () => {
      const initialState = { 
        transformationInstructions: { shaping: {}, projecting: {} },
        rid: 0 
      };
      
      // [cite: 2026-01-16] FIX: Use valid matrix for 'vectors' to pass Sanity Guard
      const testValue = key === 'vectors' ? [['x','',''],['','y',''],['','','z']] : 42;
      // Construct a mock action based on the registry definition
      const action = { 
        type: 'INTENT_UPDATE', 
        intentKey: key, 
        value: testValue,
        category: ParametricRegistry[key].category 
      };
      
      const nextState = ParametricReducer(initialState, action);
      
      // Use the Registry's own path to verify the Reducer's work
      const path = ParametricRegistry[key].path.split('.');
      const valueAtLeaf = path.reduce((acc, part) => acc?.[part], nextState);
      
      expect(valueAtLeaf).toEqual(testValue);
      expect(nextState.rid).not.toBe(initialState.rid); // Ensure signal is emitted
    });
  });
});