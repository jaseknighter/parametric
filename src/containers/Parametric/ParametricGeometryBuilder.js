/**
 * @fileoverview ParametricGeometryBuilder.js
 * Optimized for High-Performance Web Worker execution at high resolutions.
 * FIXED: Ensures return objects are never undefined to prevent Worker destructuring crashes.
 * FIXED: Enhanced numerical stability checks and formula sanitization for markers.
 * [cite: 2026-01-07]
 */

/**
 * Sanitizes raw user input into executable JavaScript.
 * Handles implicit multiplication, power operators, and range extraction.
 * @param {string} rawCode - The raw formula string from the UI.
 */
export const cleanFormula = (rawCode) => {
  if (!rawCode || rawCode.trim() === "") {
    return { sanitized: "x=0;y=0;z=0;", ranges: null, isKlein: false, debugInfo: "Empty" };
  }

  let body = rawCode.trim();
  let ranges = { u: [0, 1], v: [0, 1] };
  let hasFoundRanges = false;
  let isKlein = /klein/i.test(body);

  const metaMatch = body.match(/^\{([\s\S]*?)\}/);
  if (metaMatch) {
    body = body.slice(metaMatch[0].length).trim();
    const metaContent = metaMatch[1];
    if (/klein/i.test(metaContent)) isKlein = true;

    const parseMath = (str) => {
      try {
        let clean = str.trim().replace(/π/g, 'PI').replace(/Math\./g, '');
        // [cite: 2026-01-15] FIX: Handle implicit multiplication in metadata (e.g. 2PI)
        clean = clean.replace(/(\d)(PI)/g, '$1 * $2');
        
        // [cite: 2026-01-18] SECURITY: Whitelist characters for metadata math to prevent injection
        // Invariant: Metadata math must be a pure numeric expression. No identifiers, no functions, no side effects.
        if (/[^0-9\.\s\+\-\*\/\(\)PIE]/.test(clean)) return 0;

        const val = new Function('PI', 'E', `return (${clean})`)(Math.PI, Math.E);
        return typeof val === 'number' ? val : 0;
      } catch (e) { return 0; }
    };

    const rangeRegex = /([uv])\s*[:=]?\s*([-\d.πPI/\\*\\s]+)\s+to\s+([-\d.πPI/\\*\\s]+)/gi;
    let match;
    while ((match = rangeRegex.exec(metaContent)) !== null) {
      const varName = match[1].toLowerCase();
      const val1 = parseMath(match[2]);
      const val2 = parseMath(match[3]);
      ranges[varName] = [Math.min(val1, val2), Math.max(val1, val2)];
      hasFoundRanges = true;
    }
  }

  // Regex Cleaning: Remove markers but keep logic
  let sanitized = body
    .replace(/\/\*[\s\S]*?\*\//g, '') // Strips markers like /*base*/
    .replace(/π/g, 'PI')
    .replace(/\^/g, '**');

  sanitized = sanitized
    .replace(/(?<!\.)(\d)(?=[a-zA-Z\(])/g, '$1 * ') 
    .replace(/(\d\.\d+)(?=[a-zA-Z\(])/g, '$1 * ')   
    .replace(/([uvt])(?=\()/g, '$1 * ')            
    .replace(/\)(?=[0-9a-zA-Z])/g, ') * ');        

  sanitized = sanitized.replace(/(^|[;{])\s*(?!(?:x|y|z|u|v|t|Math|let|const|var|if|else|return|PI)\b)([a-zA-Z_]\w*)\s*=(?!=)/g, '$1 let $2 =')
    .replace(/let\s+let/g, 'let')
    .replace(/(?<![;{])\n\s*(x|y|z)\b\s*=/gi, '; $1 =')
    .trim();

  if (!sanitized) sanitized = "x=0;y=0;z=0;";
  return { sanitized, ranges: hasFoundRanges ? ranges : null, isKlein, debugInfo: sanitized.substring(0, 100) };
};

/**
 * Generates geometry buffers (Positions + Indices).
 * @param {Object} config - Contains slices, stacks, time, and formula code.
 * @returns {Object} A guaranteed object containing result status and buffers.
 */
export const parameterizeGeometry = (config) => {
  // Defensive check: Ensure config exists
  if (!config) {
    return { positions: new Float32Array(0), indices: new Uint32Array(0), isValid: false, error: "No config provided" };
  }

  const uSteps = Math.floor(config.slices || 100);
  const vSteps = Math.floor(config.stacks || 100);
  const t = config.t || 0;
  
  // Use hudCode, adHocCode, or generate from shaping
  const code = config.hudCode || config.adHocCode || config.generatedCode;
  if (!code) {
    return { positions: new Float32Array(0), indices: new Uint32Array(0), isValid: false, error: "No formula code" };
  }

  const { sanitized, ranges, isKlein } = cleanFormula(code);
  const activeRanges = ranges || { u: [0, 1], v: [0, 1] };
  const hasMetadata = !!ranges;

  let formulaFunc;
  try {
    const funcBody = `
      "use strict";
      const { sin, cos, tan, asin, acos, atan, atan2, abs, sqrt, pow, min, max, sign, floor, ceil, round, log, exp, PI, E } = Math;
      const u = _u; const v = _v; const t = _t;
      let x = 0, y = 0, z = 0; 
      ${sanitized}
      return { x: Number(x) || 0, y: Number(y) || 0, z: Number(z) || 0 };
    `;
    formulaFunc = new Function('_u', '_v', '_t', funcBody);
  } catch (e) {
    return { positions: new Float32Array(0), indices: new Uint32Array(0), isValid: false, error: e.message };
  }

  // 1. VERTEX GENERATION
  const vertexCount = (uSteps + 1) * (vSteps + 1);
  const positions = new Float32Array(vertexCount * 3);
  const scale = hasMetadata ? 1.0 : 5.0; 

  for (let i = 0; i <= uSteps; i++) {
    const uPercent = i / uSteps;
    const uVal = activeRanges.u[0] + uPercent * (activeRanges.u[1] - activeRanges.u[0]);
    
    for (let j = 0; j <= vSteps; j++) {
      const vPercent = j / vSteps;
      const vVal = activeRanges.v[0] + vPercent * (activeRanges.v[1] - activeRanges.v[0]);
      
      let res;
      try {
        res = formulaFunc(uVal, vVal, t);
      } catch (e) {
        return { positions: new Float32Array(0), indices: new Uint32Array(0), isValid: false, error: "Runtime error in formula" };
      }
      
      // Numerical Stability Check
      if (!Number.isFinite(res.x) || !Number.isFinite(res.y) || !Number.isFinite(res.z)) {
        return { positions: new Float32Array(0), indices: new Uint32Array(0), isValid: false, isStable: false };
      }

      const offset = (i * (vSteps + 1) + j) * 3;
      positions[offset] = res.x * scale;
      positions[offset + 1] = res.y * scale;
      positions[offset + 2] = res.z * scale;
    }
  }

  // 2. INDEX GENERATION
  const indices = new Uint32Array(uSteps * vSteps * 6);
  let idx = 0;
  for (let i = 0; i < uSteps; i++) {
    for (let j = 0; j < vSteps; j++) {
      const a = i * (vSteps + 1) + j;
      const b = (i + 1) * (vSteps + 1) + j;
      const c = (i + 1) * (vSteps + 1) + (j + 1);
      const d = i * (vSteps + 1) + (j + 1);

      indices[idx++] = a; indices[idx++] = b; indices[idx++] = d;
      indices[idx++] = b; indices[idx++] = c; indices[idx++] = d;
    }
  }

  return { 
    positions, 
    indices, 
    uSteps, 
    vSteps, 
    isValid: true, 
    isStable: true, 
    isKlein,
    normals: new Float32Array(0) // Placeholders to satisfy the worker destructuring
  };
};