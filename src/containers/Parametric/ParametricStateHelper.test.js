import { syncParametricUpdate } from './ParametricStateHelper';

jest.mock('../../services/ParametricRegistry', () => ({
  ParametricRegistry: {
    'bendAmtX': { path: 'transformationInstructions.shaping.vectorParams.BEND.bendAmtX' },
    'pinchAmtY': { path: 'transformationInstructions.shaping.vectorParams.PINCH.pinchAmtY' },
    // [cite: 2026-01-18] FIX: Add vectors to mock to satisfy "Dumb Writer" requirement
    'vectors': { path: 'transformationInstructions.projecting.vectors' }
  }
}));

jest.mock('../../utilities/debug', () => ({
  Debug: {
    log: jest.fn()
  }
}));

describe('ParametricStateHelper', () => {
  const baseState = {
    transformationInstructions: {
      shaping: {
        vectorParams: {
          BEND: { bendAmtX: 0 },
          PINCH: { pinchAmtY: 0 }
        }
      },
      projecting: {
        activeMode: null,
        vectors: []
      }
    }
  };

  test('Updates value at resolved path', () => {
    const updates = [{ paramToUpdate: 'bendAmtX', newValue: 10 }];
    const newState = syncParametricUpdate(baseState, updates, false, null);
    expect(newState.transformationInstructions.shaping.vectorParams.BEND.bendAmtX).toBe(10);
  });

  test('Updates UI state (activeKey)', () => {
    const newState = syncParametricUpdate(baseState, [], false, 'BEND');
    expect(newState.transformationInstructions.projecting.activeMode).toBe('BEND');
  });

  test('Ignores echo updates when synced (Leader/Follower)', () => {
    const updates = [
      { paramToUpdate: 'bendAmtX', newValue: 10 }, // Leader
      { paramToUpdate: 'bendAmtY', newValue: 10 }  // Follower (echo)
    ];
    // activeKey is 'bendAmtX', so bendAmtY should be ignored
    const newState = syncParametricUpdate(baseState, updates, true, 'bendAmtX');
    
    // bendAmtY is not in our mock registry, so it defaults to 'shaping' path
    // transformationInstructions.shaping.vectorParams.bendAmtY
    // We verify it is NOT set
    expect(newState.transformationInstructions.shaping.vectorParams.bendAmtY).toBeUndefined();
  });

  test('Handles "vectors" special case', () => {
    const updates = [{ paramToUpdate: 'vectors', newValue: ['x'] }];
    const newState = syncParametricUpdate(baseState, updates, false, null);
    expect(newState.transformationInstructions.projecting.vectors).toEqual(['x']);
  });

  test('Returns original object if no changes', () => {
    const updates = [{ paramToUpdate: 'bendAmtX', newValue: 0 }]; // Same as base
    const newState = syncParametricUpdate(baseState, updates, false, null);
    expect(newState).toBe(baseState);
  });
});