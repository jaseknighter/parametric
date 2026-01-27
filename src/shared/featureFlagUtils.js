import { FEATURE_FLAGS, FLAG_STATE } from './FEATURE_FLAGS.js';

export function isFeatureEnabled(flagName) {
  const flagState = FEATURE_FLAGS[flagName];

  if (!flagState || flagState === FLAG_STATE.OFF) return false;

  const urlParams = new URLSearchParams(window.location.search);

  if (flagState === FLAG_STATE.ON) {
    // Allow disabling via URL: ?flag_off=featureName
    const disabledFlags = urlParams.getAll('flag_off');
    return !disabledFlags.includes(flagName);
  }

  // EXP mode: only enabled if URL contains ?flag_on=<flagName>
  if (flagState === FLAG_STATE.EXP) {
    const activeFlags = urlParams.getAll('flag_on');
    return activeFlags.includes(flagName);
  }

  return false;
}

// Expose debug helper to console
if (typeof window !== 'undefined') {
  window.listFeatureFlags = () => {
    console.table(
      Object.keys(FEATURE_FLAGS).map(key => ({
        Flag: key,
        ConfigState: FEATURE_FLAGS[key],
        IsEnabled: isFeatureEnabled(key)
      }))
    );
  };
}