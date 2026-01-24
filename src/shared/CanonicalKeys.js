/**
 * @fileoverview CanonicalKeys.js
 * SOURCE OF TRUTH: Maps UI Labels to State Property Keys.
 * REQUIRED for IntentBasedVectorSlider to avoid property cross-talk.
 */
export const CANONICAL_KEYS = {
  BEND: { X: 'bendAmtX', Y: 'bendAmtY', Z: 'bendAmtZ' },
  MODULATE: { X: 'modulateAmtX', Y: 'modulateAmtY', Z: 'modulateAmtZ' },
  SPIRAL: { X: 'spiralAmtX', Y: 'spiralAmtY', Z: 'spiralAmtZ' },
  PINCH: { X: 'pinchAmtX', Y: 'pinchAmtY', Z: 'pinchAmtZ' },
  FLATTEN: { X: 'flattenAmtX', Y: 'flattenAmtY', Z: 'flattenAmtZ' },
  SCALE: { X: 'scaleAmtX', Y: 'scaleAmtY', Z: 'scaleAmtZ' },
  ROTATION: { X: 'rotationAmtX', Y: 'rotationAmtY', Z: 'rotationAmtZ' },
  TEXTURE: {
    inner: "innerTextureAmt", 
    outer: "outerTextureAmt"
  }
};

/**
 * Helper to get the canonical key for any label within a feature group.
 */
export const resolveCanonical = (feature, label) => {
  return CANONICAL_KEYS[feature]?.[label] || label;
};