import { createParametricManager } from './ParametricManager';

jest.mock('./ParametricLogic', () => ({
  getWorkerDataPacket: jest.fn((s) => ({ ...s, type: 'CALCULATE' }))
}));

jest.mock('../../services/ParametricIntentService', () => ({
  intentService: { confirmTransition: jest.fn() }
}));

jest.mock('../../utilities/debug', () => ({
  Debug: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    isEnabled: jest.fn(() => true),
    enable: jest.fn()
  }
}));

jest.mock('../../shared/featureFlagUtils', () => ({
  FeatureFlags: {
    isEnabled: jest.fn(() => true),
    setFlag: jest.fn()
  }
}));

jest.mock('../../shared/FEATURE_FLAGS', () => ({ FEATURE_FLAGS: { testFlag: 'EXP' } }));

describe('ParametricManager', () => {
  let mockWorker;
  let mockLoader;
  let onStatus;

  beforeEach(() => {
    mockWorker = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
      onmessage: null
    };
    mockLoader = jest.fn(() => mockWorker);
    onStatus = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Initializes and sends PING', () => {
    createParametricManager(mockLoader, {}, onStatus);
    expect(mockWorker.postMessage).toHaveBeenCalledWith('PING');
  });

  test('Handles Handshake Timeout', () => {
    createParametricManager(mockLoader, {}, onStatus);
    jest.advanceTimersByTime(5001);
    expect(onStatus).toHaveBeenCalledWith(expect.objectContaining({ status: 'ERROR' }));
  });

  test('Handles ALIVE response', () => {
    createParametricManager(mockLoader, {}, onStatus);
    mockWorker.onmessage({ data: 'ALIVE' });
    expect(onStatus).toHaveBeenCalledWith({ status: 'READY' });
  });

  test('Update sends message to worker', () => {
    const manager = createParametricManager(mockLoader, {}, onStatus);
    manager.update({ settings: { rid: 1 }, rid: 1 });
    expect(mockWorker.postMessage).toHaveBeenCalledWith(expect.objectContaining({ rid: 1 }));
  });

  test('Update drops stale RIDs', () => {
    const manager = createParametricManager(mockLoader, {}, onStatus);
    manager.update({ settings: { rid: 10 }, rid: 10 });
    mockWorker.postMessage.mockClear();
    
    manager.update({ settings: { rid: 5 }, rid: 5 });
    expect(mockWorker.postMessage).not.toHaveBeenCalled();
  });

  test('Handles Worker ERROR', () => {
    createParametricManager(mockLoader, {}, onStatus);
    mockWorker.onmessage({ data: { type: 'ERROR', error: 'Fail' } });
    expect(onStatus).toHaveBeenCalledWith({ status: 'ERROR', error: 'Fail' });
  });

  test('Dispose terminates worker', () => {
    const manager = createParametricManager(mockLoader, {}, onStatus);
    manager.dispose();
    expect(mockWorker.terminate).toHaveBeenCalled();
  });

  test('Syncs flags to worker on init (Safari Protection)', () => {
    createParametricManager(mockLoader, {}, onStatus);
    expect(mockWorker.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'UPDATE_FLAGS',
      flags: { testFlag: true }
    }));
  });
});