import { isFeatureEnabled } from './featureFlagUtils';
import { FEATURE_FLAGS, FLAG_STATE } from './FEATURE_FLAGS';
import { withSelfHealing } from './selfHealingWrapper';

// --- Surgical Mocking ---
let mockSearchString = '';

// We mock the specific global our utility uses to read params
global.URLSearchParams = class extends URLSearchParams {
  constructor(input) {
    // If the utility passes window.location.search, we swap it for our mock
    if (input === window.location.search) {
      super(mockSearchString);
    } else {
      super(input);
    }
  }
};

const setUrlSearchParams = (paramsObj) => {
  const params = new URLSearchParams();
  Object.entries(paramsObj).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(val => params.append(key, val));
    } else {
      params.set(key, value);
    }
  });
  mockSearchString = params.toString() ? `?${params.toString()}` : '';
};

beforeEach(() => {
  mockSearchString = '';
  jest.clearAllMocks();
});

describe('Feature Flags', () => {
  test('returns false for OFF flags', () => {
    FEATURE_FLAGS.testOff = { defaultValue: FLAG_STATE.OFF };
    expect(isFeatureEnabled('testOff')).toBe(false);
  });

  test('returns true for ON flags', () => {
    FEATURE_FLAGS.testOn = { defaultValue: FLAG_STATE.ON };
    expect(isFeatureEnabled('testOn')).toBe(true);
  });

  test('returns false for ON flag when disabled via URL', () => {
    FEATURE_FLAGS.testOn = { defaultValue: FLAG_STATE.ON };
    setUrlSearchParams({ flag_off: 'testOn' });
    expect(isFeatureEnabled('testOn')).toBe(false);
  });

  test('returns false for EXP flags without URL param', () => {
    FEATURE_FLAGS.testExp = { defaultValue: FLAG_STATE.EXP };
    setUrlSearchParams({});
    expect(isFeatureEnabled('testExp')).toBe(false);
  });

  test('returns true for EXP flags with URL param', () => {
    FEATURE_FLAGS.testExp = { defaultValue: FLAG_STATE.EXP };
    setUrlSearchParams({ flag_on: 'testExp' });
    expect(isFeatureEnabled('testExp')).toBe(true);
  });

  test('returns true for EXP flag when multiple flags are present', () => {
    FEATURE_FLAGS.testExp = { defaultValue: FLAG_STATE.EXP };
    // Testing multi-flag support with the new object helper
    // [cite: 2026-01-27] FIX: Use comma-separated string to match the "Comma-Separated Contract"
    setUrlSearchParams({ flag_on: 'otherFlag,testExp' });
    expect(isFeatureEnabled('testExp')).toBe(true);
  });

  test('returns true for EXP flags with URL param (Object Config)', () => {
    FEATURE_FLAGS.testExpObj = { defaultValue: FLAG_STATE.EXP };
    setUrlSearchParams({ flag_on: 'testExpObj' });
    expect(isFeatureEnabled('testExpObj')).toBe(true);
  });

  test('returns false for unknown flags', () => {
    expect(isFeatureEnabled('nonExistentFlag')).toBe(false);
  });

  // 2. The "Flag Leak" Guard: Configuration Integrity Audit
  test('Audit: all configured flags have valid states', () => {
    const validStates = Object.values(FLAG_STATE);
    Object.entries(FEATURE_FLAGS).forEach(([flag, config]) => {
      // [cite: 2026-01-27] FIX: Handle object-based config
      const state = (typeof config === 'object' && config !== null) ? config.defaultValue : config;
      
      if (!validStates.includes(state)) {
        throw new Error(`Flag "${flag}" has invalid state "${state}"`);
      }
    });
  });

  // 3. The "Self-Healing" Protocol: Sense and Respond
  test('Self-Healing: recovers from transient state failure', async () => {
    FEATURE_FLAGS.testHeal = { defaultValue: FLAG_STATE.EXP };
    mockSearchString = ''; // Initially OFF

    await withSelfHealing(
      async () => {
        // The Action: Expect flag to be ON
        if (!isFeatureEnabled('testHeal')) {
          throw new Error('Flag check failed');
        }
      },
      async () => {
        // Heal by updating our "internal" mock string
        setUrlSearchParams({ flag_on: 'testHeal' });
      }
    );
    
    expect(isFeatureEnabled('testHeal')).toBe(true);
  });
});