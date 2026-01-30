import { FeatureFlags, isFeatureEnabled } from './featureFlagUtils';
import { fireEvent } from '@testing-library/react';

// Mock the constants to control test scenarios
jest.mock('./FEATURE_FLAGS', () => ({
  FEATURE_FLAGS: {
    flagExp: { defaultValue: 'EXP' },
    flagOn: { defaultValue: 'ON' },
    flagOff: { defaultValue: 'OFF' },
    flagSimpleExp: 'EXP',
    flagSimpleOn: 'ON',
    flagSimpleOff: 'OFF',
    flagObjOff: { defaultValue: 'OFF' }
  },
  FLAG_STATE: { OFF: 'OFF', ON: 'ON', EXP: 'EXP' }
}));

describe('featureFlagUtils', () => {
  beforeEach(() => {
    // Reset URL
    window.history.replaceState({}, '', 'http://localhost/');
    // Clear DOM
    document.body.innerHTML = '';
    jest.useFakeTimers();
    // Suppress JSDOM "Not implemented: navigation" error from reload()
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    const container = document.getElementById(FeatureFlags.listFlagsContainerId);
    if (container) container.remove();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('isFeatureEnabled', () => {
    test('[behavior] returns false for unknown flags', () => {
      expect(isFeatureEnabled('unknown')).toBe(false);
    });

    test('[policy] returns false for OFF flags', () => {
      expect(isFeatureEnabled('flagOff')).toBe(false);
      expect(isFeatureEnabled('flagSimpleOff')).toBe(false);
      expect(isFeatureEnabled('flagObjOff')).toBe(false);
    });

    test('[policy] returns true for ON flags by default', () => {
      expect(isFeatureEnabled('flagOn')).toBe(true);
      expect(isFeatureEnabled('flagSimpleOn')).toBe(true);
    });

    test('[behavior] returns false for ON flags if disabled via URL', () => {
      window.history.replaceState({}, '', '/?flag_off=flagOn');
      expect(isFeatureEnabled('flagOn')).toBe(false);
    });

    test('[policy] returns false for EXP flags by default', () => {
      expect(isFeatureEnabled('flagExp')).toBe(false);
    });

    test('[behavior] returns true for EXP flags if enabled via URL', () => {
      window.history.replaceState({}, '', '/?flag_on=flagExp');
      expect(isFeatureEnabled('flagExp')).toBe(true);
    });
  });

  describe('FeatureFlags.setFlag', () => {
    test('[behavior] enables a flag by adding to flag_on', () => {
      FeatureFlags.setFlag('flagExp', true);
      expect(window.location.search).toContain('flag_on=flagExp');
    });

    test('[behavior] disables a flag by adding to flag_off', () => {
      FeatureFlags.setFlag('flagOn', false);
      expect(window.location.search).toContain('flag_off=flagOn');
    });

    test('[behavior] persists showFlags param', () => {
      FeatureFlags.setFlag('flagExp', true);
      expect(window.location.search).toContain('showFlags=true');
    });
  });

  describe('FeatureFlags.listFlags', () => {
    test('[behavior] creates the debug panel', () => {
      FeatureFlags.listFlags();
      const container = document.getElementById('__debugFlagPanel');
      expect(container).toBeInTheDocument();
      expect(container.innerHTML).toContain('Feature Flags');
    });

    test('[behavior] toggle button calls setFlag', () => {
      const spy = jest.spyOn(FeatureFlags, 'setFlag').mockImplementation(() => {});
      FeatureFlags.listFlags();
      
      // Find a disable button (for an ON flag)
      const disableBtns = document.querySelectorAll('button');
      const btn = Array.from(disableBtns).find(b => b.textContent === 'Disable');
      fireEvent.click(btn);
      
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('flag'), false);
    });

    test('[behavior] updates position on resize', () => {
      FeatureFlags.listFlags();
      const container = document.getElementById('__debugFlagPanel');
      
      // Trigger resize logic
      window.innerWidth = 500;
      fireEvent(window, new Event('resize'));
      jest.advanceTimersByTime(1000); // Trigger interval
      
      expect(container).toBeInTheDocument();
    });
  });
});
