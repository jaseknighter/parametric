import { ParametricAuthority } from './ParametricAuthority';

jest.mock('../utilities/debug', () => ({
  Debug: {
    log: jest.fn(),
    warn: jest.fn()
  }
}));

describe('ParametricAuthority', () => {
  let authority;
  let mockManager;

  beforeEach(() => {
    authority = new ParametricAuthority();
    mockManager = { resetAuthority: jest.fn() };
    authority.setManager(mockManager);
  });

  test('requestManualOverride latches MANUAL mode and increments RID', () => {
    const rid1 = authority.ridCounter;
    const newRid = authority.requestManualOverride();
    
    expect(authority.mode).toBe('MANUAL');
    expect(newRid).toBeGreaterThan(rid1);
    expect(authority.isWorkerBusy).toBe(false);
    expect(mockManager.resetAuthority).toHaveBeenCalled();
  });

  test('releaseOverride resets mode to AUTO', () => {
    authority.requestManualOverride();
    authority.releaseOverride();
    expect(authority.mode).toBe('AUTO');
    expect(authority.isWorkerBusy).toBe(false);
  });

  test('shouldAcceptResult enforces monotonic RID', () => {
    authority.highestRidProcessed = 5;
    
    expect(authority.shouldAcceptResult(4)).toBe(false);
    expect(authority.shouldAcceptResult(5)).toBe(true);
    expect(authority.shouldAcceptResult(6)).toBe(true);
    expect(authority.highestRidProcessed).toBe(6);
  });

  test('canShip respects worker busy state in AUTO mode', () => {
    authority.mode = 'AUTO';
    authority.isWorkerBusy = true;
    expect(authority.canShip()).toBe(false);

    authority.isWorkerBusy = false;
    expect(authority.canShip()).toBe(true);
  });

  test('canShip ignores worker busy state in MANUAL mode (Pre-emption)', () => {
    authority.mode = 'MANUAL';
    authority.isWorkerBusy = true;
    expect(authority.canShip()).toBe(true);
  });
});