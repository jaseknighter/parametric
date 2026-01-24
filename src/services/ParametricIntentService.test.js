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

  test('broadcastChange should be blocked during sync', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    intentService._isSyncing = true;
    intentService.broadcastChange('testKey', 123);
    expect(dispatchSpy).not.toHaveBeenCalled();
    intentService._isSyncing = false;
    dispatchSpy.mockRestore();
  });

  test('setIntent should be blocked during sync', () => {
    intentService._isSyncing = true;
    const original = intentService.state.bendAmtX;
    intentService.setIntent('bendAmtX', 999);
    expect(intentService.state.bendAmtX).toBe(original);
    intentService._isSyncing = false;
  });

  test('setIntent should ignore keys not in registry', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    intentService.setIntent('nonExistentKey', 123);
    expect(dispatchSpy).not.toHaveBeenCalled();
    dispatchSpy.mockRestore();
  });

  test('setIntentBatch should be blocked during sync', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    intentService._isSyncing = true;
    intentService.setIntentBatch({ bendAmtX: 999 });
    expect(dispatchSpy).not.toHaveBeenCalled();
    intentService._isSyncing = false;
    dispatchSpy.mockRestore();
  });

  test('projectForCPU should handle undefined settings and type conversion', () => {
    // Test fallback to state when setting is undefined
    intentService.state.bendAmtX = 5;
    const result = intentService.projectForCPU({});
    expect(result.mathScope.bendAmtX).toBe(intentService.project('bendAmtX', 5));

    // Test numeric conversion
    const resultStr = intentService.projectForCPU({ bendAmtX: "10" });
    expect(resultStr.mathScope.bendAmtX).toBe(intentService.project('bendAmtX', 10));
  });

  test('syncFromReducer should skip if RID matches', () => {
    intentService.state.rid = 100;
    const spy = jest.spyOn(intentService, 'getValueByPath');
    intentService.syncFromReducer({ rid: 100 });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});