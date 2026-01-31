export const FLAG_STATE = {
  OFF: 'OFF',   // Feature completely disabled
  ON: 'ON',     // Feature enabled for all users
  EXP: 'EXP',   // Experimental: enabled only via URL param
};

export const FEATURE_FLAGS = {
  // v0.5.1: Accessibility & Semantic Hardening
  accessibilityHardening: { defaultValue: FLAG_STATE.ON, versionTarget: '0.5.1', stage: 'prod' },

  // v0.5.2: Display Domain Optimization
  mobileHudOptimization: { defaultValue: FLAG_STATE.ON, versionTarget: '0.5.2', stage: 'prod' },
  pinchToZoomDisable: { defaultValue: FLAG_STATE.ON, versionTarget: '0.5.2', stage: 'prod' },

  // v0.5.3: Integrated Documentation Bridge
  docsBridge: { defaultValue: FLAG_STATE.ON, versionTarget: '0.5.3', stage: 'prod' },

  // v0.5.4: Instructional Refinement
  instructionalRefinement: { defaultValue: FLAG_STATE.ON, versionTarget: '0.5.4', stage: 'prod' },

  // MVP / Infrastructure Test
  hudHeaderLowercase: { defaultValue: FLAG_STATE.EXP, versionTarget: '0.5.0.1', stage: 'prod' },

  // v0.5.4.2: Layout Hardening (Gap, Tooltips, Shift-Stability)
  mobileHardening: { defaultValue: FLAG_STATE.EXP, versionTarget: '0.5.4.2', stage: 'alpha' },
};