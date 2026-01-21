/* eslint-env worker */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-new-func */

/**
 * @fileoverview Reconciled Parametric Worker
 * [cite: 2026-01-13] AUTHORITY: Authoritative execution path for geometry generation.
 * FIXED: Included pinch/flatten variables in destructure to prevent ReferenceErrors.
 * FIXED: Synchronized kernel call signature (u, v, t, scope) to match loop execution.
 */
import { Debug } from "../../utilities/debug";

let lastFormula = null;
let isLockedToManual = false;

/**
 * Worker Message Handler
 * Entry point for "PING" and "CALCULATE" events.
 */
self.onmessage = function(e) {
  if (e.data === "PING") return self.postMessage("ALIVE");

  // [cite: 2026-01-16] TEST HANDSHAKE: Direct channel for Playwright verification
  // Bypasses application state/manager logic to prove worker liveness and transfer capability.
  if (e.data.type === 'TEST_HANDSHAKE') {
    const positions = new Float32Array([0, 0, 0, 1, 1, 1]);
    const indices = new Uint32Array([0, 1, 2]);
    self.postMessage({
      type: 'TEST_HANDSHAKE_OK',
      rid: e.data.rid,
      positions,
      indices
    }, [positions.buffer, indices.buffer]);
    return;
  }

  if (e.data.type === 'RESET_AUTHORITY') {
    isLockedToManual = false;
    // [cite: 2026-01-18] FIX: Purge cached formula state to prevent "Ghost Math"
    // This ensures the next Auto packet starts fresh, without leaking manual variable logic.
    if (e.data.purge) {
      lastFormula = null;
    }
    return;
  }

  const { 
    type, rid, uFormula, vFormula, wFormula, manualFormula, 
    scope = {}, resolution = 50, t: incomingT, projecting, scaleFactor 
  } = e.data;
  
  if (type !== 'CALCULATE') return;

  // [cite: 2026-01-16] FIREWALL: Block stale automatic packets after manual override
  if (!!manualFormula) {
    isLockedToManual = true;
  } else if (isLockedToManual) {
    // If we are in manual mode, drop any automatic packet that slipped through
    if (Debug.isEnabled("WORKER")) Debug.log("WORKER", `Dropped stale automatic packet RID:${rid}`);
    return;
  }

  // [cite: 2026-01-15] AUTHORITY: If 't' is present, we cannot skip math execution
  const isTimeDependent = /\bt\b/.test(manualFormula || uFormula + vFormula + wFormula);
  const hasFormulaChanged = (manualFormula || uFormula + vFormula + wFormula) !== lastFormula;

  // [cite: 2026-01-13] DEBUG: Trace Worker Reception
  if (Debug.isEnabled("WORKER")) {
    Debug.log("WORKER", `[Worker] Calculating RID: ${rid}`, { 
      scope, 
      pinchAmtX: scope.pinchAmtX,
      t: incomingT,
      scaleFactor,
      bendAmtX: scope.bendAmtX, // [cite: 2026-01-18] DEBUG: Trace specific variable for unit mismatch
      radius: scope.radius 
    });
  }

  // 1. Context Stabilization
  // [cite: 2026-01-06] "Real" solution: Defaulting values to prevent NaN propagation.
  const t = typeof incomingT === 'number' ? incomingT : 0;
  const res = resolution || 50;
  const SCALE_FACTOR = (typeof scaleFactor === 'number' && !Number.isNaN(scaleFactor)) ? scaleFactor : 1.0;
  const mathEnv = `const { sin, cos, abs, sqrt, pow, PI, E, tan, exp, atan2, log, min, max, sign, floor, ceil, round } = Math; const π = Math.PI;`;
  
  // 2. Robust Kernel Injection
  // This destructuring block maps flattened scope keys to local variables.
  // [cite: 2026-01-13] Added pinch/flatten variables to resolve ReferenceErrors.
  // [cite: 2026-01-16] FIX: Use 'let' to allow Manual Mode to override/reassign these values.
  const destructure = `
    let { 
      bendAmtX=0, bendAmtY=0, bendAmtZ=0, 
      modulateAmtX=0, modulateAmtY=0, modulateAmtZ=0,
      spiralAmtX=0, spiralAmtY=0, spiralAmtZ=0,
      pinchAmtX=0, pinchAmtY=0, pinchAmtZ=0,
      flattenAmtX=0, flattenAmtY=0, flattenAmtZ=0,
      outerTextureAmt=0, innerTextureAmt=0 
    } = scope;
  `;

  // [cite: 2026-01-19] FIX: Manual Authority - Ensure manualFormula executes AFTER destructuring.
  // This allows user-typed assignments (e.g. "pinchAmtX = 12.34") to override slider values.
  const body = manualFormula 
    ? `${mathEnv}\n${destructure}\nlet x=0, y=0, z=0;\n// User Code Start\n${manualFormula}\n// User Code End\nreturn [x, y, z];`
    : `${mathEnv}\n${destructure}\nreturn [${uFormula}, ${vFormula}, ${wFormula}];`;

  try {
    // [cite: 2026-01-18] SECURITY: Basic Sanitization / Input Signal Clipping
    // Prevent access to Worker globals, network APIs, or breakout attempts.
    // This is a heuristic filter, not a cryptographic sandbox.
    const forbidden = /\b(importScripts|fetch|XMLHttpRequest|Worker|eval|setTimeout|setInterval|self|globalThis|window|document|Function)\b/;
    if (manualFormula && forbidden.test(manualFormula)) {
      throw new Error("Security Violation: Formula may only contain pure math expressions.");
    }

    lastFormula = manualFormula || uFormula + vFormula + wFormula;

    // 3. Kernel Compilation
    // [cite: 2026-01-04] JSDoc: kernel(u, v, t, scope) -> [x, y, z]
    const kernel = new Function('u', 'v', 't', 'scope', body);

    // 4. Buffer Initialization
    const rowLen = res + 1;
    const totalVertices = rowLen * rowLen;
    const positions = new Float32Array(totalVertices * 3);
    const normals = new Float32Array(totalVertices * 3);
    const uvs = new Float32Array(totalVertices * 2);
    const indices = new Uint32Array(res * res * 6);

    let ptr = 0, uvPtr = 0, nanDetected = false;
    const vecs = projecting?.vectors || ['x', 'y', 'z'];

    // 5. Geometry Generation Loop
    for (let i = 0; i <= res; i++) {
      const uValue = i / res;
      for (let j = 0; j <= res; j++) {
        const vValue = j / res;
        uvs[uvPtr++] = uValue;
        uvs[uvPtr++] = vValue;

        // [cite: 2026-01-13] Kernel call signature must match constructor (4 args).
        const [rx, ry, rz] = kernel(uValue, vValue, t, scope);
        const results = { x: rx, y: ry, z: rz };

        // [cite: 2026-01-18] DEBUG: Trace first vertex calculation to catch unit conversion
        if (i === 0 && j === 0 && Debug.isEnabled("WORKER")) {
           Debug.log("WORKER", `[Kernel Output] Vertex[0,0]`, { 
             raw: results, scaled: { x: rx * SCALE_FACTOR, y: ry * SCALE_FACTOR, z: rz * SCALE_FACTOR } 
           });
        }

        if (!Number.isFinite(rx) || !Number.isFinite(ry) || !Number.isFinite(rz)) {
          nanDetected = true;
        }

        // Apply scaleFactor and vector projection (X, Y, Z mapping)
        positions[ptr++] = (results[vecs[0]] || 0) * SCALE_FACTOR;
        positions[ptr++] = (results[vecs[1]] || 0) * SCALE_FACTOR;
        positions[ptr++] = (results[vecs[2]] || 0) * SCALE_FACTOR;
      }
    }

    if (nanDetected) self.postMessage({ type: 'WARN', message: "Geometry contains Non-Finite values." });

    // 6. Normal Calculation (Central Differences)
    for (let i = 0; i < totalVertices; i++) {
      const idx = i * 3;
      const u1 = (i < totalVertices - rowLen) ? idx + (rowLen * 3) : idx;
      const u2 = (i >= rowLen) ? idx - (rowLen * 3) : idx;
      const v1 = (i % rowLen < rowLen - 1) ? idx + 3 : idx;
      const v2 = (i % rowLen > 0) ? idx - 3 : idx;
      
      const tx = positions[u1]-positions[u2], ty = positions[u1+1]-positions[u2+1], tz = positions[u1+2]-positions[u2+2];
      const vx = positions[v1]-positions[v2], vy = positions[v1+1]-positions[v2+1], vz = positions[v1+2]-positions[v2+2];
      
      let nx = ty * vz - tz * vy, ny = tz * vx - tx * vz, nz = tx * vy - ty * vx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      
      normals[idx] = nx / len; 
      normals[idx+1] = ny / len; 
      normals[idx+2] = nz / len;
    }

    // 7. Index Calculation
    let iIdx = 0;
    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const a = i * rowLen + j, b = (i + 1) * rowLen + j, c = (i + 1) * rowLen + (j + 1), d = i * rowLen + (j + 1);
        indices[iIdx++] = a; indices[iIdx++] = b; indices[iIdx++] = d;
        indices[iIdx++] = b; indices[iIdx++] = c; indices[iIdx++] = d;
      }
    }

    // 8. Transferable Result Delivery
    self.postMessage({ 
      type: 'RESULT', 
      rid, 
      isManual: !!manualFormula,
      positions, 
      normals, 
      indices, 
      uvs 
    }, 
    [positions.buffer, normals.buffer, indices.buffer, uvs.buffer]
    );

  } catch (err) {
    self.postMessage({ 
      type: 'ERROR', 
      rid, 
      error: `Kernel Failure: ${err.message}`, 
      failedSource: body 
    });
  }
};