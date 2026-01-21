/**
 * @fileoverview ParametricIntentService.test.js
 * UNIT VERIFICATION: Mathematical Projections and Broadcast Integrity.
 * [cite: 2026-01-15]
 */
import { intentService } from './ParametricIntentService';

describe('ParametricIntentService Projections', () => {
  
  test('project() should convert degrees to radians for BEND category', () => {
    // 90 degrees should be PI/2 (~1.5707)
    const result = intentService.project('bendAmtX', 90);
    expect(result).toBeCloseTo(Math.PI / 2, 4);
  });

  test('project() should pass through raw values for vectors', () => {
    const vectors = ['y', 'z', 'x'];
    const result = intentService.project('vectors', vectors);
    expect(result).toEqual(vectors);
  });

  test('setIntent() should broadcast the Synchronization Signal payload', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    
    intentService.setIntent('pinchAmtX', 0.5);

    // Verify the CustomEvent has the correct detail for the Reducer
    const lastCall = dispatchSpy.mock.calls[dispatchSpy.mock.calls.length - 1][0];
    expect(lastCall.type).toBe('parametric-intent-update');
    expect(lastCall.detail).toEqual({
      intentKey: 'pinchAmtX',
      value: 0.5,
      category: 'postProcess'
    });

    dispatchSpy.mockRestore();
  });

  test('setIntentBatch() should broadcast atomic batch update', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    const updates = { bendAmtX: 10, bendAmtY: 20 };
    
    intentService.setIntentBatch(updates);

    // Verify the CustomEvent has the correct detail for the Reducer
    const lastCall = dispatchSpy.mock.calls[dispatchSpy.mock.calls.length - 1][0];
    expect(lastCall.type).toBe('parametric-intent-batch-update');
    expect(lastCall.detail.updates).toEqual(updates);
    
    // Verify optimistic update
    expect(intentService.state.bendAmtX).toBe(10);
    expect(intentService.state.bendAmtY).toBe(20);

    dispatchSpy.mockRestore();
  });

  test('syncFromReducer() should update state and resolve waiters', async () => {
    const rid = 999;
    const reducerState = {
      rid,
      transformationInstructions: {
        shaping: { radius: 10 },
        projecting: { vectors: [['x',0,0],[0,'y',0],[0,0,'z']] }
      }
    };

    const waitPromise = intentService.waitForRid(rid);
    intentService.syncFromReducer(reducerState);
    
    await expect(waitPromise).resolves.toBeUndefined();
    expect(intentService.state.rid).toBe(rid);
    expect(intentService.state.radius).toBe(10);
  });
});