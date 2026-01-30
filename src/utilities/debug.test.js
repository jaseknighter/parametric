import { Debug } from './debug';
import { FeatureFlags } from '../shared/featureFlagUtils';

// Mock dependencies
jest.mock('../shared/ParametricConstants', () => ({
  DEBUG_THROTTLES: {}
}));

jest.mock('../shared/FEATURE_FLAGS', () => ({
  FEATURE_FLAGS: {
    testFlagOn: { defaultValue: true, versionTarget: 'v1.0', stage: 'prod' },
    testFlagOff: { defaultValue: false, versionTarget: 'v1.1', stage: 'dev' },
    testFlagExp: { defaultValue: 'EXP', versionTarget: 'v2.0', stage: 'dev' }
  }
}));

jest.mock('../shared/featureFlagUtils', () => ({
  FeatureFlags: {
    isEnabled: jest.fn((key) => key === 'testFlagOn'),
    listFlags: jest.fn(),
    setFlag: jest.fn()
  }
}));

describe('Debug Utility', () => {
  let mockConsoleTable;
  let mockConsoleGroup;
  let mockConsoleGroupCollapsed;
  let mockConsoleGroupEnd;
  let mockConsoleLog;

  beforeAll(() => {
    // Spy on console methods
    mockConsoleTable = jest.spyOn(console, 'table').mockImplementation(() => {});
    mockConsoleGroup = jest.spyOn(console, 'group').mockImplementation(() => {});
    mockConsoleGroupCollapsed = jest.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    mockConsoleGroupEnd = jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    // Mock URL environment with extra query param
    window.history.replaceState({}, '', '/parametric?existing=param&flag_on=testFlagOff');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('listFlags generates console table and delegates DOM panel', () => {
    // Setup DOM for panel test
    document.body.innerHTML = '';
    
    Debug.listFlags();

    // Ensure the main console group is opened
    expect(mockConsoleGroup).toHaveBeenCalledWith("🛠️ Parametric Feature Flags");
    
    const flagData = mockConsoleTable.mock.calls[0][0];

    // Enabled flag (true by default)
    const onFlag = flagData['testFlagOn'];
    expect(onFlag.State).toContain("ENABLED");
    expect(onFlag.Type).toBe('ON');
    expect(onFlag.Version).toBe("v1.0 (prod)");
    // Disabled flag (false) but overridden by URL -> ON
    const offFlag = flagData['testFlagOff'];
    expect(offFlag.State).toContain("DISABLED");
    expect(offFlag.Type).toBe('OFF');
    expect(offFlag.Version).toBe("v1.1 (dev)");

    // Experimental flag ('EXP') - Default OFF in new logic
    const expFlag = flagData['testFlagExp'];
    expect(expFlag.State).toContain("DISABLED");
    expect(expFlag.Type).toBe('EXP');
    expect(expFlag.Version).toBe("v2.0 (dev)");

    // Verify delegation
    expect(FeatureFlags.listFlags).toHaveBeenCalled();
  });
});