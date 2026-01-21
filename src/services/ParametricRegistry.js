/**
 * @fileoverview ParametricRegistry.js
 * CENTRAL AUTHORITY: Unified State Mapping, Projections, and Canonical Paths.
 * SOLUTION INTEGRITY: Consolidates PathRegistry to prevent state-desync.
 * [cite: 2026-01-13]
 */

export const ParametricRegistry = {
  // --- PINCH TRANSFORMATIONS ---
  // FIXED: Default set to 0.0 (Identity). Math updated to prevent collapse/expansion.
  pinchAmtX: { 
    path: "transformationInstructions.shaping.vectorParams.PINCH.pinchAmtX", 
    category: "postProcess", label: "Pinch X", projection: "linear", default: 0.0 
  },
  pinchAmtY: { 
    path: "transformationInstructions.shaping.vectorParams.PINCH.pinchAmtY", 
    category: "postProcess", label: "Pinch Y", projection: "linear", default: 0.0 
  },
  pinchAmtZ: { 
    path: "transformationInstructions.shaping.vectorParams.PINCH.pinchAmtZ", 
    category: "postProcess", label: "Pinch Z", projection: "linear", default: 0.0 
  },

  // --- TRIGONOMETRIC DEFORMS ---
  bendAmtX: { 
    path: "transformationInstructions.shaping.vectorParams.BEND.bendAmtX", 
    category: "deform", label: "Bend X", projection: "radians", default: 0 
  },
  bendAmtY: { 
    path: "transformationInstructions.shaping.vectorParams.BEND.bendAmtY", 
    category: "deform", label: "Bend Y", projection: "radians", default: 0 
  },
  bendAmtZ: { 
    path: "transformationInstructions.shaping.vectorParams.BEND.bendAmtZ", 
    category: "deform", label: "Bend Z", projection: "radians", default: 0 
  },

  // --- TEXTURE CHANNELS ---
  outerTextureAmt: { 
    path: "transformationInstructions.shaping.vectorParams.TEXTURE.outerTextureAmt", 
    category: "displace", label: "Outer Texture", projection: "linear", default: 0 
  },
  innerTextureAmt: { 
    path: "transformationInstructions.shaping.vectorParams.TEXTURE.innerTextureAmt", 
    category: "displace", label: "Inner Texture", projection: "linear", default: 0 
  },

  // SPIRAL
  spiralAmtX: { 
    path: "transformationInstructions.shaping.vectorParams.SPIRAL.spiralAmtX", 
    category: "deform", label: "Spiral X", projection: "radians", default: 0 
  },
  spiralAmtY: { 
    path: "transformationInstructions.shaping.vectorParams.SPIRAL.spiralAmtY", 
    category: "deform", label: "Spiral Y", projection: "radians", default: 0 
  },
  spiralAmtZ: { 
    path: "transformationInstructions.shaping.vectorParams.SPIRAL.spiralAmtZ", 
    category: "deform", label: "Spiral Z", projection: "radians", default: 0 
  },

  // MODULATE
  modulateAmtX: { 
    path: "transformationInstructions.shaping.vectorParams.MODULATE.modulateAmtX", 
    category: "deform", label: "Modulate X", projection: "radians", default: 0 
  },
  modulateAmtY: { 
    path: "transformationInstructions.shaping.vectorParams.MODULATE.modulateAmtY", 
    category: "deform", label: "Modulate Y", projection: "radians", default: 0 
  },
  modulateAmtZ: { 
    path: "transformationInstructions.shaping.vectorParams.MODULATE.modulateAmtZ", 
    category: "deform", label: "Modulate Z", projection: "radians", default: 0 
  }, 
  
  // --- POST-PROCESS FLATTEN ---
  flattenAmtX: { 
    path: "transformationInstructions.shaping.vectorParams.FLATTEN.flattenAmtX", 
    category: "postProcess", label: "Flatten X", projection: "linear", default: 0 
  },
  flattenAmtY: { 
    path: "transformationInstructions.shaping.vectorParams.FLATTEN.flattenAmtY", 
    category: "postProcess", label: "Flatten Y", projection: "linear", default: 0 
  },
  flattenAmtZ: { 
    path: "transformationInstructions.shaping.vectorParams.FLATTEN.flattenAmtZ", 
    category: "postProcess", label: "Flatten Z", projection: "linear", default: 0 
  },

  // --- SCALE ---
  scaleAmtX: { 
    path: "transformationInstructions.shaping.vectorParams.SCALE.scaleAmtX", 
    category: "postProcess", label: "Scale X", projection: "linear", default: 1.0 
  },
  scaleAmtY: { 
    path: "transformationInstructions.shaping.vectorParams.SCALE.scaleAmtY", 
    category: "postProcess", label: "Scale Y", projection: "linear", default: 1.0 
  },
  scaleAmtZ: { 
    path: "transformationInstructions.shaping.vectorParams.SCALE.scaleAmtZ", 
    category: "postProcess", label: "Scale Z", projection: "linear", default: 1.0 
  },

  // --- ROTATION ---
  rotationAmtX: { 
    path: "transformationInstructions.shaping.vectorParams.ROTATION.rotationAmtX", 
    category: "postProcess", label: "Rotation X", projection: "radians", default: 0.0 
  },
  rotationAmtY: { 
    path: "transformationInstructions.shaping.vectorParams.ROTATION.rotationAmtY", 
    category: "postProcess", label: "Rotation Y", projection: "radians", default: 0.0 
  },
  rotationAmtZ: { 
    path: "transformationInstructions.shaping.vectorParams.ROTATION.rotationAmtZ", 
    category: "postProcess", label: "Rotation Z", projection: "radians", default: 0.0 
  },

  // [cite: 2026-01-13] ADDED: Projection Vectors
  vectors: { 
    path: "transformationInstructions.projecting.vectors", 
    category: "project", label: "Projection", projection: "raw", default: [['x',0,0],[0,'y',0],[0,0,'z']] 
  },

  // [cite: 2026-01-15] ADDED: Granular Projection Keys for 3x3 Matrix
  vectorCol0Row0: { path: "transformationInstructions.projecting.vectors.0.0", category: "project", label: "X->X", projection: "raw", default: "x" },
  vectorCol1Row0: { path: "transformationInstructions.projecting.vectors.0.1", category: "project", label: "Y->X", projection: "raw", default: 0 },
  vectorCol2Row0: { path: "transformationInstructions.projecting.vectors.0.2", category: "project", label: "Z->X", projection: "raw", default: 0 },
  vectorCol0Row1: { path: "transformationInstructions.projecting.vectors.1.0", category: "project", label: "X->Y", projection: "raw", default: 0 },
  vectorCol1Row1: { path: "transformationInstructions.projecting.vectors.1.1", category: "project", label: "Y->Y", projection: "raw", default: "y" },
  vectorCol2Row1: { path: "transformationInstructions.projecting.vectors.1.2", category: "project", label: "Z->Y", projection: "raw", default: 0 },
  vectorCol0Row2: { path: "transformationInstructions.projecting.vectors.2.0", category: "project", label: "X->Z", projection: "raw", default: 0 },
  vectorCol1Row2: { path: "transformationInstructions.projecting.vectors.2.1", category: "project", label: "Y->Z", projection: "raw", default: 0 },
  vectorCol2Row2: { path: "transformationInstructions.projecting.vectors.2.2", category: "project", label: "Z->Z", projection: "raw", default: "z" },

  // [cite: 2026-01-15] ADDED: Time variable for animation testing
  t: {
    path: "t",
    category: "animate", label: "Time", projection: "raw", default: 0
  },

  // [cite: 2026-01-15] ADDED: Core Shape Parameters for Reducer Authority
  formula: {
    path: "transformationInstructions.shaping.formula",
    category: "shape", label: "Formula", projection: "raw", default: "CIRCLE"
  },
  radius: {
    path: "transformationInstructions.shaping.radius",
    category: "shape", label: "Radius", projection: "raw", default: 5.0
  }
};

/**
 * Helper to retrieve the dot-notation path for any registry key.
 * @param {string} key - The registry key (e.g. 'pinchAmtX').
 * @returns {string} The full state path.
 */
export const getFeaturePath = (key) => ParametricRegistry[key]?.path || `transformationInstructions.shaping.vectorParams.${key}`;

/**
 * Helper to retrieve default value to satisfy smoke tests.
 * @param {string} key 
 * @returns {number}
 */
export const getFeatureDefault = (key) => ParametricRegistry[key]?.default ?? 0;