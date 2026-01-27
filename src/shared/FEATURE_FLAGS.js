export const FLAG_STATE = {
  OFF: 'OFF',   // Feature completely disabled
  ON: 'ON',     // Feature enabled for all users
  EXP: 'EXP',   // Experimental: enabled only via URL param
};

export const FEATURE_FLAGS = {
  // v0.5.1: Accessibility & Semantic Hardening
  accessibilityHardening: FLAG_STATE.EXP,

  // v0.5.2: Display Domain Optimization
  mobileHudOptimization: FLAG_STATE.EXP,
  pinchToZoomDisable: FLAG_STATE.EXP,

  // v0.5.3: Integrated Documentation Bridge
  docsBridge: FLAG_STATE.EXP,

  // v0.5.4: Instructional Refinement
  instructionalRefinement: FLAG_STATE.EXP,

  // MVP / Infrastructure Test
  hudHeaderLowercase: FLAG_STATE.EXP,
};