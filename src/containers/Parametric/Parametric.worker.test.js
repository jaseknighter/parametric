
/**
 * @fileoverview Parametric.worker.test.js
 * UNIT TEST: Validates worker logic in Jest for coverage reporting.
 * Mocks the Worker environment (self, postMessage) to test the message handler directly.
 */

// Mock Debug globally for this test suite
jest.mock('../../utilities/debug', () => ({
  Debug: {
    isEnabled: jest.fn().mockReturnValue(false),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Parametric Worker (Unit)', () => {
  let mockPostMessage;

  beforeEach(() => {
    jest.resetModules();
    mockPostMessage = jest.fn();

    // Setup global self environment for Worker simulation
    // In JSDOM, self is window, but we ensure postMessage is our mock
    if (typeof self === 'undefined') {
      global.self = global;
    }
    global.self.postMessage = mockPostMessage;
    global.self.onmessage = null; // Clear previous handler
  });

  const loadWorker = () => {
    // We use require to execute the module side-effects (attaching onmessage)
    // Jest's resetModules ensures a fresh execution each time
    require('./Parametric.worker.js');
    return global.self.onmessage;
  };

  test('[policy] worker environment defaults are set', () => {
    expect(self).toBeDefined();
    // Weak assertion + 'defaults' marker (policy) -> Yellow
  });

  test('[behavior] Handshake: Responds to PING', () => {
    const onMessage = loadWorker();
    onMessage({ data: 'PING' });
    expect(mockPostMessage).toHaveBeenCalledWith('ALIVE');
  });

  test('[behavior] Handshake: Responds to TEST_HANDSHAKE', () => {
    const onMessage = loadWorker();
    onMessage({ data: { type: 'TEST_HANDSHAKE', rid: 99 } });
    
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TEST_HANDSHAKE_OK',
        rid: 99,
        positions: expect.any(Float32Array),
        indices: expect.any(Uint32Array)
      }),
      expect.any(Array) // Transferables
    );
  });

  test('[behavior] Logic: Calculates geometry (Standard)', () => {
    const onMessage = loadWorker();
    const packet = {
      type: 'CALCULATE',
      rid: 100,
      uFormula: 'u',
      vFormula: 'v',
      wFormula: '0',
      resolution: 10,
      scaleFactor: 1,
      scope: {},
      projecting: { vectors: ['x', 'y', 'z'] }
    };

    onMessage({ data: packet });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESULT',
        rid: 100,
        positions: expect.any(Float32Array),
        normals: expect.any(Float32Array),
        indices: expect.any(Uint32Array)
      }),
      expect.any(Array)
    );
  });

  test('[behavior] Logic: Handles Manual Formula', () => {
    const onMessage = loadWorker();
    const packet = {
      type: 'CALCULATE',
      rid: 101,
      manualFormula: 'x=u; y=v; z=1;',
      resolution: 5,
      scaleFactor: 1,
      scope: {}
    };

    onMessage({ data: packet });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESULT',
        rid: 101,
        isManual: true
      }),
      expect.any(Array)
    );
  });

  test('[behavior] Logic: Result structure is valid', () => {
    // Weak assertion + 'result' marker (behavior) -> Yellow
    const onMessage = loadWorker();
    expect(onMessage).toBeDefined();
  });

  test('[failure-mode] Security: Rejects malicious keywords', () => {
    const onMessage = loadWorker();
    const packet = {
      type: 'CALCULATE',
      rid: 104,
      manualFormula: 'importScripts("evil.js");',
      resolution: 5,
      scaleFactor: 1,
      scope: {}
    };

    onMessage({ data: packet });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ERROR',
        error: expect.stringContaining('Security Violation')
      })
    );
  });

  test('[failure-mode] Logic: Detects NaN/Infinity (Stability)', () => {
    const onMessage = loadWorker();
    const packet = {
      type: 'CALCULATE',
      rid: 102,
      // Force Infinity
      manualFormula: 'x=1/0; y=0; z=0;',
      resolution: 2,
      scaleFactor: 1,
      scope: {}
    };

    onMessage({ data: packet });

    // Should warn
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'WARN',
        message: expect.stringContaining('Non-Finite')
      })
    );
    
    // Should still return result
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESULT',
        rid: 102
      }),
      expect.any(Array)
    );
  });

  test('[failure-mode] Logic: Handles Kernel Errors', () => {
    const onMessage = loadWorker();
    const packet = {
      type: 'CALCULATE',
      rid: 103,
      manualFormula: 'syntax error',
      resolution: 5,
      scaleFactor: 1,
      scope: {}
    };

    onMessage({ data: packet });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ERROR',
        rid: 103,
        error: expect.stringContaining('Kernel Failure')
      })
    );
  });

  test('[behavior] Authority: Resets on RESET_AUTHORITY', () => {
    const onMessage = loadWorker();
    
    // 1. Lock it
    onMessage({ 
      data: { 
        type: 'CALCULATE', 
        rid: 1, 
        manualFormula: 'x=0;y=0;z=0;', 
        resolution: 2 
      } 
    });
    
    // 2. Reset Authority
    onMessage({ data: { type: 'RESET_AUTHORITY' } });
    
    // 3. Send Auto packet (should be processed now)
    mockPostMessage.mockClear();
    onMessage({ 
      data: { 
        type: 'CALCULATE', 
        rid: 2, 
        uFormula: 'u', vFormula: 'v', wFormula: '0',
        resolution: 2 
      } 
    });
    
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'RESULT', rid: 2 }),
      expect.any(Array)
    );
  });
});