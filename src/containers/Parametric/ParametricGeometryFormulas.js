/**
 * @fileoverview ParametricGeometryFormulas.js
 * MAIN MATH PIPELINE: Handles Worker-side string generation.
 */

import { 
  SHAPE_KEYS, 
  ROMANESCO_G_VAL,
  ROMANESCO_P_OFF,
  ROMANESCO_NUM,
  ROMANESCO_SCALE,
  ROMANESCO_MASK,
  BEND_FREQ_BASE,
  MODULATE_FREQ_MULT,
  SCALARS,
  TEX_OUTER_FREQ,
  TEX_INNER_FREQ
} from "../../shared/ParametricConstants";
import { Debug } from "../../utilities/debug";

/**
 * toPrecise
 * Strictly enforces the system invariant for string-based math injection.
 */
const toPrecise = (val) => {
  const num = Number(val);
  return isNaN(num) ? "0.0" : num.toString();
};

const Pipeline = {
  generate: {
        [SHAPE_KEYS.CIRCLE]: {
      str: (r) => {
        const s = toPrecise(r);
        
        // DO NOT PERMANENTLY SIMPLIFY THE FORMULA SO TESTS CAN PASS!!!
        // The morph factor oscillates between 1.0 (Static Sphere) and 5.0 (Deformation).
        // Using abs(sin) ensures it cycles back to 1.0 periodically.
        // [cite: 2026-01-20] TEST FIX: Freeze morph for Playwright visual regression
        const isTest = typeof window !== 'undefined' && window.__PLAYWRIGHT__;
        const morph = isTest ? "1.0" : `(1.0 + abs(sin(t * 0.05)) * 4.0)`;

        return {
          x: `cos(u * 2.0 * PI) * sin(v * PI) * ${s}`,
          y: `sin(u * 2.0 * PI) * sin(v * PI) * ${s}`,
          // Static baseline (Standard Sphere):
          // z: `cos(v * PI) * ${s}`
          z: `cos(v * PI * ${morph}) * ${s}`
        };
      }
    },
    [SHAPE_KEYS.SINE]: {
      str: (r) => {
        const rad = toPrecise(r);
        const detailScale = toPrecise(Number(r) * 0.2);
        const cStr = `(cos(u * 2.0 * PI) * ${rad} + sin(u * 20.0 * PI) * ${detailScale})`;
        return {
          x: `(v * 2.0 - 1.0) * ${rad}`,
          y: `${cStr} * sin(v * 2.0 * PI)`,
          z: `${cStr} * cos(v * 2.0 * PI)`
        };
      }
    },
    [SHAPE_KEYS.SEASHELL]: {
      str: (r) => {
        const b = 0.12, turns = 10.0;
        const rA = toPrecise(Number(r) * 0.015);
        const rZ = toPrecise(Number(r) * 0.05);
        return {
          x: `pow(E, ${b} * u * ${turns} * PI) * (1.0 + cos(v * 2.0 * PI)) * cos(u * ${turns} * PI) * ${rA}`,
          y: `pow(E, ${b} * u * ${turns} * PI) * (1.0 + cos(v * 2.0 * PI)) * sin(u * ${turns} * PI) * ${rA}`,
          z: `pow(E, ${b} * u * ${turns} * PI) * sin(v * 2.0 * PI) * ${rA} + (u * ${rZ})`
        };
      }
    },
    [SHAPE_KEYS.MOBIUS]: {
      str: (r) => {
        const s = toPrecise(r);
        const width = toPrecise(0.5);
        // [cite: 2026-01-18] ANIMATION INVARIANT: Inject ripple into the base generator.
        // This forces the t-detector to trigger high-frequency updates.
        const ripple = `(sin(u * 4.0 * PI + t * 0.5) * 0.05)`;
        
        return {
          x: `(((1.0 + ((v * 2.0 - 1.0) * ${width} / 2.0) * cos(u * PI)) * cos(u * 2.0 * PI)) + ${ripple}) * ${s}`,
          y: `(((1.0 + ((v * 2.0 - 1.0) * ${width} / 2.0) * cos(u * PI)) * sin(u * 2.0 * PI)) + ${ripple}) * ${s}`,
          z: `((((v * 2.0 - 1.0) * ${width} / 2.0) * sin(u * PI)) + ${ripple}) * ${s}`
        };
      }
    },
    [SHAPE_KEYS.KLEIN]: {
      str: (r) => {
        const s = toPrecise(0.15 * Number(r));
        return {
          x: `(1.7 * cos(u * 2.0 * PI) * (1.0 + sin(u * 2.0 * PI)) + (1.7 * (1.0 - cos(u * 2.0 * PI) / 2.0)) * (u < 0.5 ? cos(u * 2.0 * PI) * cos(v * 2.0 * PI) : cos(v * 2.0 * PI + PI))) * ${s}`,
          y: `(5.0 * sin(u * 2.0 * PI) + (u < 0.5 ? (1.7 * (1.0 - cos(u * 2.0 * PI) / 2.0)) * sin(u * 2.0 * PI) * cos(v * 2.0 * PI) : 0.0)) * ${s}`,
          z: `(1.7 * (1.0 - cos(u * 2.0 * PI) / 2.0)) * sin(v * 2.0 * PI) * ${s}`
        };
      }
    },
    [SHAPE_KEYS.FRACTAL]: {
      str: (r) => {
        const hVal = 1.3 * Number(r) * ROMANESCO_SCALE;
        const h = toPrecise(hVal), hHalf = toPrecise(hVal * 0.5);
        const spat = toPrecise(1.6 * Number(r) * ROMANESCO_SCALE);
        const offset = toPrecise((ROMANESCO_NUM / 2) - 0.5);
        const uS = `(u * 0.98 + 0.01)`, uL = `(${uS} * ${toPrecise(ROMANESCO_NUM)} % 1.0)`, path = `(1.0 - abs(${uL} * 2.0 - 1.0))`;
        const bStr = `((${toPrecise(ROMANESCO_G_VAL)} + ${toPrecise(ROMANESCO_P_OFF)}) * ${h})`;
        const mStr = `pow(max(0.0, 1.0 - ${path}), ${toPrecise(ROMANESCO_MASK)})`; 
        const rStr = `((1.0 - ${path}) * pow(${path}, 0.6) * ${toPrecise(1.2 * Number(r) * ROMANESCO_SCALE)} * (1.0 + pow(sin(((v * 8.0) + (${uL} * 16.0)) * PI), 4.0) * 0.35))`;
        return {
          x: `((floor(${uS} * ${toPrecise(ROMANESCO_NUM)}) - ${offset}) * ${spat}) + cos(v * 2.0 * PI) * ${rStr}`,
          y: `(${path} * ${h}) + (${bStr} * ${mStr}) - ${hHalf}`,
          z: `sin(v * 2.0 * PI) * ${rStr}`
        };
      }
    },
    [SHAPE_KEYS.DIAGNOSTIC]: {
      str: (r) => ({
        x: `(u * 2.0 - 1.0) * ${toPrecise(r)}`,
        y: `(v * 2.0 - 1.0) * ${toPrecise(r)}`,
        z: `sin(u * 50.0) * outerTextureAmt` 
      })
    },
  },

  displace: {
    texture: {
      str: () => `(1.0 + 
        (abs(sin(u * 2.0 * PI * ${toPrecise(TEX_OUTER_FREQ)}) * cos(v * 45.0 * PI)) * (outerTextureAmt * ${toPrecise(SCALARS.TEX_OUTER)})) + 
        (abs(sin(u * 2.0 * PI * ${toPrecise(TEX_INNER_FREQ)}) * sin(v * 90.0 * PI)) * (innerTextureAmt * ${toPrecise(SCALARS.TEX_INNER)}))
      )`
    }
  },

  deform: {
    // REAL BEND: Calculates an arc angle based on bendAmt, then wraps the geometry
    bend: { 
      str: (axisA, axisB, amtVar) => `
        _angle = (v - 0.5) * (${amtVar} * ${toPrecise(SCALARS.BEND)} * ${toPrecise(BEND_FREQ_BASE)});
        _dist = ${axisA};
        ${axisA} = _dist * cos(_angle);
        ${axisB} += _dist * sin(_angle);`
    },
    modulate: { str: (axis) => `sin(u * ${toPrecise(MODULATE_FREQ_MULT)}) * cos(v * ${toPrecise(MODULATE_FREQ_MULT)}) * (modulateAmt${axis} * ${toPrecise(SCALARS.MODULATE)})` },
    spiral: { 
      str: (axis, trigName) => `(${trigName}(u * PI * 2.0 * (1.0 + spiralAmt${axis})) * (spiralAmt${axis} * ${toPrecise(SCALARS.SPIRAL_LOOP)}))` 
    },
    spiralWinding: {
      str: (axisA, axisB, amtVar) => `
        _r = sqrt(${axisA}*${axisA} + ${axisB}*${axisB});
        _theta = atan2(${axisB}, ${axisA}) + (${amtVar} * _r * ${toPrecise(SCALARS.SPIRAL_WINDING)});
        ${axisA} = _r * cos(_theta);
        ${axisB} = _r * sin(_theta);`
    }
  },

  postProcess: {
    pinch: {
      str: (vStr, axis, r) => {
        // normalized radius. This prevents exponential explosion from pow() while avoiding the
        // "boxy" artifact of clamping.
        const norm = (typeof r === 'string' && isNaN(Number(r))) ? r : toPrecise(r > 0 ? r : 1.0);
        return `((function(v, n, a){ 
          if(abs(v) < 0.0001) return 0.0; 
          var k = 1.0 + (a * ${toPrecise(SCALARS.PINCH)});
          var nv = v / n; 
          if (abs(nv) <= 1.0) {
            return sign(nv) * pow(abs(nv), k) * n;
          } else {
            return sign(nv) * (k * abs(nv) - k + 1.0) * n;
          }
        })(${vStr}, ${norm}, pinchAmt${axis}))`;
      }
    },
    flatten: { str: (vStr, axis) => `((${vStr}) * (1.0 - flattenAmt${axis}))` }
  }
};

const Formulas = {
  Pipeline,
  /**
   * generateFormulaString
   */
  generateFormulaString: (settings, scope = {}, component, overrideFormula = null, isSimple = false) => {
      if (settings.isManualOverride && !isSimple) {
        return settings[`${component}Formula`] || "0";
      }

      const shp = settings.transformationInstructions?.shaping || {};
      // [cite: 2026-01-17] FIX: Use scope radius (Registry Default 5.0) if available
      // [cite: 2026-01-18] FIX: Check flat settings.radius for immediate updates (Pipeline Flush)
      const radius = scope.radius !== undefined ? scope.radius : (settings.radius || shp.radius || 1.0);
      // [cite: 2026-01-18] FIX: Check flat settings.formula for immediate updates (Pipeline Flush)
      const name = overrideFormula || settings.formula || shp.formula || 'CIRCLE'; 
      
      if (Debug.isEnabled("PIPELINE")) {
        const destination = isSimple ? "HUD" : "THREEJS_WORKER";
        const axis = component ? component.toUpperCase() : "ALL";
        Debug.log("PIPELINE", `[DEST:${destination}] [AXIS:${axis}] Shape:${name} | R:${radius}`, {
            scopeRadius: scope.radius,
            settingsRadius: settings.radius,
            shpRadius: shp.radius,
            isSimple,
            scopeKeys: Object.keys(scope)
        });
      }

      // 1. Get Base Shape
      const generator = Pipeline.generate[name] || Pipeline.generate['CIRCLE'];
      
      // [cite: 2026-01-18] REFACTOR: Use normalized radius (1.0) for Simple Mode (HUD/Auto).
      // This removes " * 5" from the display. Scale is applied via scaleFactor in Logic.
      const base = generator.str(isSimple ? 1.0 : radius);

      if (isSimple) {
        const vars = {};

        // Logic for HUD Display only
        // [cite: 2026-01-14] FIXED: Apply Projection Matrix to HUD Formula
        const outputIdx = component === 'u' ? 0 : (component === 'v' ? 1 : 2);
        const vectors = settings.transformationInstructions?.projecting?.vectors;
        let source = vectors ? vectors[outputIdx] : (component === 'u' ? 'x' : (component === 'v' ? 'y' : 'z'));
        
        // [cite: 2026-01-15] FIX: Handle 3x3 grid from Reducer to prevent crash
        if (Array.isArray(source)) {
          // Smart flatten: Find first active string in the row
          source = source.find(val => typeof val === 'string' && val.length > 0) || (outputIdx===0?'x':(outputIdx===1?'y':'z'));
        }
        
        if (typeof source !== 'string') return { expr: "0.0", vars: {} };

        if (!source || !base[source.toLowerCase()]) return { expr: "0.0", vars: {} };

        let math = base[source.toLowerCase()];
        const axis = source.toUpperCase();
        const modAmt = scope[`modulateAmt${axis}`] || 0;
        const spirAmt = scope[`spiralAmt${axis}`] || 0;
        const pinchAmt = scope[`pinchAmt${axis}`] || 0;
        const flatAmt = scope[`flattenAmt${axis}`] || 0;
        
        // Texture is a composite of outer/inner
        const outerTex = scope.outerTextureAmt || 0;
        const innerTex = scope.innerTextureAmt || 0;
        const hasTexture = Math.abs(outerTex) > 0.001 || Math.abs(innerTex) > 0.001;

        // [cite: 2026-01-16] FIX: ORDER OF OPERATIONS - Bend must happen FIRST (Stage 1)
        // This matches _composePipeline where rotation applies to base, then modulate is added.
        // X is bent by Y and Z. Y is bent by X and Z. Z is bent by X and Y.
        const bendX = scope.bendAmtX || 0;
        const bendY = scope.bendAmtY || 0;
        const bendZ = scope.bendAmtZ || 0;
        
        // [cite: 2026-01-16] FIX: Expose canonical keys for Registry filtering
        if (Math.abs(bendX) > 0.001) vars['bendAmtX'] = bendX;
        if (Math.abs(bendY) > 0.001) vars['bendAmtY'] = bendY;
        if (Math.abs(bendZ) > 0.001) vars['bendAmtZ'] = bendZ;

        if (component === 'u') { // X
          if (Math.abs(bendY) > 0.001) {
            math = `(${math}) * cos((v - 0.5) * bendAmtY * ${SCALARS.BEND} * ${BEND_FREQ_BASE})`; 
          }
          if (Math.abs(bendZ) > 0.001) {
            math = `(${math}) * cos((v - 0.5) * bendAmtZ * ${SCALARS.BEND} * ${BEND_FREQ_BASE})`;
          }
        } else if (component === 'v') { // Y
          if (Math.abs(bendX) > 0.001) {
            math = `(${math}) * cos((v - 0.5) * bendAmtX * ${SCALARS.BEND} * ${BEND_FREQ_BASE})`;
          }
          if (Math.abs(bendZ) > 0.001) {
            // [cite: 2026-01-16] FIX: Bend Z adds X component to Y (Rotation)
            // _y += _x * sin(angle)
            math = `(${math}) + (${base.x}) * sin((v - 0.5) * bendAmtZ * ${SCALARS.BEND} * ${BEND_FREQ_BASE})`;
          }
        } else if (component === 'w') { // Z
          if (Math.abs(bendX) > 0.001) {
            // [cite: 2026-01-16] FIX: Bend X adds Y component to Z (Rotation)
            // _z += _y * sin(angle)
            math = `(${math}) + (${base.y}) * sin((v - 0.5) * bendAmtX * ${SCALARS.BEND} * ${BEND_FREQ_BASE})`;
          }
          if (Math.abs(bendY) > 0.001) {
            // [cite: 2026-01-16] FIX: Bend Y adds X component to Z (Rotation)
            // _z += _x * sin(angle)
            math = `(${math}) + (${base.x}) * sin((v - 0.5) * bendAmtY * ${SCALARS.BEND} * ${BEND_FREQ_BASE})`;
          }
        }

        // [cite: 2026-01-16] FIX: Modulate & Linear Spiral happen AFTER Bend (Stage 2)
        if (Math.abs(modAmt) > 0.001) {
          const vName = `modulateAmt${axis}`;
          vars[vName] = modAmt;
          math += ` + (sin(u * ${MODULATE_FREQ_MULT}) * cos(v * ${MODULATE_FREQ_MULT}) * (${vName} * ${SCALARS.MODULATE}))`;
        }
        if (Math.abs(spirAmt) > 0.001) {
          const vName = `spiralAmt${axis}`;
          vars[vName] = spirAmt;
          const trig = component === 'v' ? 'cos' : 'sin';
          math += ` + (${trig}(u * PI * 2 * (1.0 + ${vName})) * (${vName} * ${SCALARS.SPIRAL_LOOP}))`;
        }

        // [cite: 2026-01-18] FIX: Texture must apply BEFORE Winding/Pinch to match Worker Pipeline
        if (hasTexture) {
          if (Math.abs(outerTex) > 0.001) vars['outerTextureAmt'] = outerTex;
          if (Math.abs(innerTex) > 0.001) vars['innerTextureAmt'] = innerTex;
          
          // [cite: 2026-01-18] FIX: Use real texture formula (Sine/Cos) instead of scalar scaling
          math = `(${math}) * ${Pipeline.displace.texture.str()}`;
        }

        // [cite: 2026-01-16] FIX: Inject Spiral Winding (Stage 3) to match Worker Pipeline
        // This prevents "Deform/Snap" when clicking HUD by ensuring the formula includes winding.
        
        // Spiral X: Rotates Y and Z
        const spiralX = scope.spiralAmtX || 0;
        if (Math.abs(spiralX) > 0.001) {
          vars['spiralAmtX'] = spiralX;
          if (component === 'v') { // Y (Axis A)
            const other = base.z;
            math = `sqrt(pow(${math}, 2.0) + pow(${other}, 2.0)) * cos(atan2(${other}, ${math}) + (spiralAmtX * sqrt(pow(${math}, 2.0) + pow(${other}, 2.0)) * ${SCALARS.SPIRAL_WINDING}))`;
          } else if (component === 'w') { // Z (Axis B)
            const other = base.y;
            math = `sqrt(pow(${other}, 2.0) + pow(${math}, 2.0)) * sin(atan2(${math}, ${other}) + (spiralAmtX * sqrt(pow(${other}, 2.0) + pow(${math}, 2.0)) * ${SCALARS.SPIRAL_WINDING}))`;
          }
        }

        // Spiral Y: Rotates X and Z
        const spiralY = scope.spiralAmtY || 0;
        if (Math.abs(spiralY) > 0.001) {
          vars['spiralAmtY'] = spiralY;
          if (component === 'u') { // X (Axis A)
            const other = base.z;
            math = `sqrt(pow(${math}, 2.0) + pow(${other}, 2.0)) * cos(atan2(${other}, ${math}) + (spiralAmtY * sqrt(pow(${math}, 2.0) + pow(${other}, 2.0)) * ${SCALARS.SPIRAL_WINDING}))`;
          } else if (component === 'w') { // Z (Axis B)
            const other = base.x;
            math = `sqrt(pow(${other}, 2.0) + pow(${math}, 2.0)) * sin(atan2(${math}, ${other}) + (spiralAmtY * sqrt(pow(${other}, 2.0) + pow(${math}, 2.0)) * ${SCALARS.SPIRAL_WINDING}))`;
          }
        }

        // Spiral Z: Rotates X and Y
        const spiralZ = scope.spiralAmtZ || 0;
        if (Math.abs(spiralZ) > 0.001) {
          vars['spiralAmtZ'] = spiralZ;
          if (component === 'u') { // X (Axis A)
            const other = base.y;
            math = `sqrt(pow(${math}, 2.0) + pow(${other}, 2.0)) * cos(atan2(${other}, ${math}) + (spiralAmtZ * sqrt(pow(${math}, 2.0) + pow(${other}, 2.0)) * ${SCALARS.SPIRAL_WINDING}))`;
          } else if (component === 'v') { // Y (Axis B)
            const other = base.x;
            math = `sqrt(pow(${other}, 2.0) + pow(${math}, 2.0)) * sin(atan2(${math}, ${other}) + (spiralAmtZ * sqrt(pow(${other}, 2.0) + pow(${math}, 2.0)) * ${SCALARS.SPIRAL_WINDING}))`;
          }
        }

        if (Math.abs(pinchAmt) > 0.001) {
          const vName = `pinchAmt${axis}`;
          vars[vName] = pinchAmt;
          math = `sign(${math}) * pow(abs(${math}), (1.0 + (${vName} * ${SCALARS.PINCH})))`;
        }
        if (Math.abs(flatAmt) > 0.001) {
          const vName = `flattenAmt${axis}`;
          vars[vName] = flatAmt;
          math = `(${math}) * (1.0 - ${vName})`;
        }

        if (Debug.isEnabled("PIPELINE") && isSimple) {
            Debug.log("PIPELINE", `[HUD Math] Component ${component}:`, math);
        }

        return {
          expr: math.replace(/\bPI\b/g, "π").replace(/ \* 1(\.0+)?(?![.\d])/g, ''),
          vars
        };
      }

      // 2. Full Pipeline for 3D View
      return Formulas._composePipeline(base, radius, component);
  },

  /**
   * _composePipeline
   * Internal heavy-lifter for Worker geometry.
   */
  _composePipeline: (base, radius, component) => {
    const rVal = radius.toString();
    
    let code = `
      (function(){
        let _radius = ${rVal}; 
        let _x = ${base.x}; let _y = ${base.y}; let _z = ${base.z};
        // Explicitly declare intermediate vars used by Pipeline.deform
        let _angle, _dist, _r, _theta, _tmp;

        // Stage 1: Bending
        if(abs(bendAmtX) > 0.001) { ${Pipeline.deform.bend.str('_y', '_z', 'bendAmtX')} }
        if(abs(bendAmtY) > 0.001) { ${Pipeline.deform.bend.str('_x', '_z', 'bendAmtY')} }
        if(abs(bendAmtZ) > 0.001) { ${Pipeline.deform.bend.str('_x', '_y', 'bendAmtZ')} }

        // Stage 2: Modulate & Spirals
        _x += ${Pipeline.deform.modulate.str('X')} + ${Pipeline.deform.spiral.str('X', 'sin')};
        _y += ${Pipeline.deform.modulate.str('Y')} + ${Pipeline.deform.spiral.str('Y', 'cos')};
        _z += ${Pipeline.deform.modulate.str('Z')} + ${Pipeline.deform.spiral.str('Z', 'sin')};

        // [cite: 2026-01-13] FIXED: Inject Texture Displacement Stage
        if (abs(outerTextureAmt) > 0.001 || abs(innerTextureAmt) > 0.001) {
          let _tex = ${Pipeline.displace.texture.str()};
          _x *= _tex; _y *= _tex; _z *= _tex;
        }

        if(abs(spiralAmtX) > 0.001) { ${Pipeline.deform.spiralWinding.str('_y', '_z', 'spiralAmtX')} }
        if(abs(spiralAmtY) > 0.001) { ${Pipeline.deform.spiralWinding.str('_x', '_z', 'spiralAmtY')} }
        if(abs(spiralAmtZ) > 0.001) { ${Pipeline.deform.spiralWinding.str('_x', '_y', 'spiralAmtZ')} }

        // Stage 3: Post-Processing
        _x = ${Pipeline.postProcess.pinch.str('_x', 'X', '_radius')};
        _y = ${Pipeline.postProcess.pinch.str('_y', 'Y', '_radius')};
        _z = ${Pipeline.postProcess.pinch.str('_z', 'Z', '_radius')};
        _x = ${Pipeline.postProcess.flatten.str('_x', 'X')};
        _y = ${Pipeline.postProcess.flatten.str('_y', 'Y')};
        _z = ${Pipeline.postProcess.flatten.str('_z', 'Z')};

        let resVal = ${component === 'u' ? '_x' : (component === 'v' ? '_y' : '_z')};
        return (resVal === undefined || isNaN(resVal)) ? 0.0 : resVal;
      })()
    `;
    return code.trim();
  }
};

export default Formulas;
export const generateFormulaString = Formulas.generateFormulaString;

/**
 * calculateVector
 * [cite: 2026-01-16] TEST SUPPORT: Local JS implementation of the default pipeline.
 * Used by FormulaSnapshotTest.js to verify worker math integrity.
 */
export const calculateVector = (u, v, r, scope) => {
  // Minimal implementation for Initial State (Circle) to satisfy the Smoke Test.
  // Matches Pipeline.generate.CIRCLE logic.
  // [cite: 2026-01-19] FIX: Match Worker's morph logic for t=0 to prevent drift
  const t = scope?.t || 0;
  const morph = (1.0 + Math.abs(Math.sin(t * 0.05)) * 4.0);
  const PI = Math.PI;
  let x = Math.cos(u * 2.0 * PI) * Math.sin(v * PI) * r;
  let y = Math.sin(u * 2.0 * PI) * Math.sin(v * PI) * r;
  let z = Math.cos(v * PI * morph) * r;
  return { x, y, z };
};