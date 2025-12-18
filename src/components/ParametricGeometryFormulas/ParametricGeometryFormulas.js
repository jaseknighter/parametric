import { create, all } from "mathjs/number";

const math = create(all);
const PI = math.evaluate('pi');
const DEG = 0.005555555555556;

// --- Helper Functions ---

const checkFlatten = (flattenAmt, valToFlatten) => {
  if (flattenAmt <= 0) return valToFlatten;
  
  // Clamping prevents the sine function from jumping at high values
  let currentVal = math.max(-1, math.min(1, valToFlatten));
  
  const stage = Math.floor(flattenAmt);
  const blend = flattenAmt - stage;

  for (let i = 0; i < stage; i++) {
    currentVal = math.sin(currentVal);
  }

  const nextVal = math.sin(currentVal);
  // Linear interpolation between stages for smooth transition
  return currentVal + (nextVal - currentVal) * blend;
};

const checkVectors = (vectors, vectorToCheck, formula, u, v, vectorParams) => {
  const vectorIndex = vectors ? vectors.findIndex(vector => vector === vectorToCheck) : null;

  // --- 1. FIXED TEXTURE BLENDING ---
  const isTex = !!vectorParams?.texture;
  const modAmt = vectorParams?.modulate ? vectorParams.modulateAmt : 1;
  const outer = isTex ? (vectorParams.outerTextureAmt || 1) : 1;
  const inner = isTex ? (vectorParams.innerTextureAmt || 0) : 0;
  
  // NORMALIZE: We treat 'inner' (texture intensity) as a percentage (0 to 1)
  // We cap it so the texture can never be more than 50% of the total radius, 
  // ensuring the base shape is always visible and the size stays constant.
  const texIntensity = math.max(0, math.min(0.5, inner * 0.1)); 
  const currentBaseWeight = 1.0 - texIntensity; 
  const currentTexWeight = texIntensity;

  // --- 2. MODULATORS ---
  const bendCos = vectorParams?.bendCos ? math.cos(v * (vectorParams.bendCosAmt || 0)) : 0;
  const bendSin = vectorParams?.bendSin ? math.sin(v * (vectorParams.bendSinAmt || 0)) : 0;
  
  const spiralCosAmt = vectorParams?.spiralCosAmt || 0;
  const spiralSinAmt = vectorParams?.spiralSinAmt || 0;
  const spiralCosFactor = (vectorParams?.spiralCos && Math.abs(spiralCosAmt) > 1) ? (1 / spiralCosAmt) : 1;
  const spiralSinFactor = (vectorParams?.spiralSin && Math.abs(spiralSinAmt) > 1) ? (1 / spiralSinAmt) : 1;

  const spiralCos = vectorParams?.spiralCos ? ((1 + u * spiralCosAmt) * math.cos(u * spiralCosAmt) * 0.25) : 0;
  const spiralSin = vectorParams?.spiralSin ? ((1 + u * spiralSinAmt) * math.sin(u * spiralSinAmt) * 0.25) : 0;

  const pinchAmt = vectorParams?.pinch ? math.max(0.1, vectorParams.pinchAmt) : 1;

  // --- 3. FORMULA SWITCH ---
  switch (formula) {
    case "line": 
      return (vectorIndex === 0) ? (u / PI) - 1 : 1;

    case "sin":
    case "cos":
      if (vectorIndex === 0) return checkFlatten(vectorParams?.flattenAmt1 || 0, (u / PI) - 1);
      if (vectorIndex === 1) {
        const isSin = formula === "sin";
        const trigU = isSin ? math.sin : math.cos;
        const fAmt = vectorParams?.flattenAmt2 || 0;

        const texPart = trigU(u * modAmt * outer) * currentTexWeight;
        const basePart = (trigU(u * modAmt) * currentBaseWeight) + (isSin ? bendSin : bendCos) + (isSin ? spiralSin : spiralCos);
        
        let val = math.pow(math.abs(texPart + basePart), pinchAmt);
        if ((texPart + basePart) < 0) val *= -1;
        val = checkFlatten(fAmt, val);
        
        const sFactor = isSin ? spiralSinFactor : spiralCosFactor;
        return (val * sFactor) * 0.5;
      }
      return 1;

    case "circle":
      if (vectorIndex === 0) {
        const tex = math.cos(u * modAmt * outer) * currentTexWeight;
        const base = (math.cos(u * modAmt) * currentBaseWeight) + bendCos + spiralCos;
        let val = math.pow(math.abs(tex + base), pinchAmt);
        if ((tex + base) < 0) val *= -1;
        return checkFlatten(vectorParams?.flattenAmt1 || 0, val) * spiralCosFactor;
      } 
      if (vectorIndex === 1) {
        const tex = math.sin(u * modAmt * outer) * currentTexWeight;
        const base = (math.sin(u * modAmt) * currentBaseWeight) + bendSin + spiralSin;
        let val = math.pow(math.abs(tex + base), pinchAmt);
        if ((tex + base) < 0) val *= -1;
        return checkFlatten(vectorParams?.flattenAmt2 || 0, val) * spiralSinFactor;
      }
      return 1;

    case "project2":
      if (vectorIndex === 0) return checkFlatten(vectorParams?.flattenAmt1 || 0, math.sin(v));
      if (vectorIndex === 1) return checkFlatten(vectorParams?.flattenAmt2 || 0, math.sin(v));
      if (vectorIndex === -1 || vectorIndex === 2) return checkFlatten(vectorParams?.flattenAmt3 || 0, math.cos(v));
      return 1;

    default: 
      return 1;
  }
};

// ... [rest of your export / rotateObj / reflectObj code] ...
// ... [Keep rotateObj and reflectObj exactly as you had them] ...

const rotateObj = (pitch, roll, yaw, points) => {
  const cosA = math.cos((yaw * DEG) * (PI));
  const sinA = math.sin((yaw * DEG) * (PI));
  const cosB = math.cos((pitch * DEG) * (PI));
  const sinB = math.sin((pitch * DEG) * (PI));
  const cosC = math.cos((roll * DEG) * (PI));
  const sinC = math.sin((roll * DEG) * (PI));
  const aXX = cosA * cosB;
  const aXY = cosA * sinB * sinC - sinA * cosC;
  const aXz = cosA * sinB * cosC + sinA * sinC;
  const aYX = sinA * cosB;
  const aYY = sinA * sinB * sinC + cosA * cosC;
  const aYZ = sinA * sinB * cosC - cosA * sinC;
  const aZX = -sinB;
  const aZY = cosB * sinC;
  const aZZ = cosB * cosC;
  const px = points.xC; const py = points.yC; const pz = points.zC;
  points.x = aXX * px + aXY * py + aXz * pz;
  points.y = aYX * px + aYY * py + aYZ * pz;
  points.z = aZX * px + aZY * py + aZZ * pz;
  return points;
};

const reflectObj = (pitch, roll, yaw, points) => {
  const cosA = math.cos((yaw * DEG) * (PI));
  const sinA = math.sin((yaw * DEG) * (PI));
  const cosB = math.cos((pitch * DEG) * (PI));
  const sinB = math.sin((pitch * DEG) * (PI));
  const cosC = math.cos((roll * DEG) * (PI));
  const sinC = math.sin((roll * DEG) * (PI));
  const aXX = cosA * cosB;
  const aXY = sinA * cosC - cosA * sinB * sinC;
  const aXz = sinA * sinC + cosA * sinB * cosC;
  const aYX = sinA * cosB;
  const aYY = cosA * cosC + sinA * sinB * sinC;
  const aYZ = cosA * sinC - sinA * sinB * cosC;
  const aZX = sinB;
  const aZY = cosB * sinC;
  const aZZ = cosB * cosC;
  const px = points.xC; const py = points.yC; const pz = points.zC;
  points.x = aXX * px + aXY * py + aXz * pz;
  points.y = aYX * px + aYY * py + aYZ * pz;
  points.z = aZX * px + aZY * py + aZZ * pz;
  return points;
};

export const parametricGeometryFormulas = {
  reflecting: {
    none: { calcU: u => u, calcV: v => v, calcX: (u,v,c) => c, calcY: (u,v,c) => c, calcZ: (u,v,c) => c },
    reflect: { doReflection: (uC, vC, pts, vp) => reflectObj(vp.pitch, vp.roll, vp.yaw, pts) }
  },
  rotating: {
    none: { calcU: u => u, calcV: v => v, calcX: (u,v,c) => c, calcY: (u,v,c) => c, calcZ: (u,v,c) => c },
    rotate: { doRotation: (uC, vC, pts, vp) => rotateObj(vp.pitch, vp.roll, vp.yaw, pts) }
  },
  shaping: {
    none: { calcU: u => u, calcV: v => v, calcX: (u,v,c) => c, calcY: (u,v,c) => c, calcZ: (u,v,c) => c },
    line: {
      calcU: u => u * 2 * PI, calcV: v => v,
      calcX: (u,v,c,vct,vp) => c * checkVectors(vct,"x","line",u,v,vp),
      calcY: (u,v,c,vct,vp) => c * checkVectors(vct,"y","line",u,v,vp),
      calcZ: (u,v,c,vct,vp) => c * checkVectors(vct,"z","line",u,v,vp),
    },
    sin: {
      calcU: u => u * 2 * PI, calcV: v => v,
      calcX: (u,v,c,vct,vp) => c * checkVectors(vct,"x","sin",u,v,vp),
      calcY: (u,v,c,vct,vp) => c * checkVectors(vct,"y","sin",u,v,vp),
      calcZ: (u,v,c,vct,vp) => c * checkVectors(vct,"z","sin",u,v,vp),
    },
    cos: {
      calcU: u => u * 2 * PI, calcV: v => v,
      calcX: (u,v,c,vct,vp) => c * checkVectors(vct,"x","cos",u,v,vp),
      calcY: (u,v,c,vct,vp) => c * checkVectors(vct,"y","cos",u,v,vp),
      calcZ: (u,v,c,vct,vp) => c * checkVectors(vct,"z","cos",u,v,vp),
    },
    circle: {
      calcU: u => u * 2 * PI, calcV: v => v,
      calcX: (u,v,c,vct,vp) => c * checkVectors(vct,"x","circle",u,v,vp),
      calcY: (u,v,c,vct,vp) => c * checkVectors(vct,"y","circle",u,v,vp),
      calcZ: (u,v,c,vct,vp) => c * checkVectors(vct,"z","circle",u,v,vp),
    }
  },
  projecting: {
    none: { calcU: u => u, calcV: v => v, calcX: (u,v,c) => c, calcY: (u,v,c) => c, calcZ: (u,v,c) => c },
    project1: {
      calcU: u => u, calcV: v => v * PI,
      calcX: (u,v,c,vct,vp) => c * checkVectors(vct,"x","project1",u,v,vp),
      calcY: (u,v,c,vct,vp) => c * checkVectors(vct,"y","project1",u,v,vp),
      calcZ: (u,v,c,vct,vp) => c * checkVectors(vct,"z","project1",u,v,vp),
    },
    project2: {
      calcU: u => u, calcV: v => v * PI,
      calcX: (u,v,c,vct,vp) => c * checkVectors(vct,"x","project2",u,v,vp),
      calcY: (u,v,c,vct,vp) => c * checkVectors(vct,"y","project2",u,v,vp),
      calcZ: (u,v,c,vct,vp) => c * checkVectors(vct,"z","project2",u,v,vp),
    }
  },
  cutting: {
    none: { calcU: u => u, calcV: v => v, calcX: (u,v,c) => c, calcY: (u,v,c) => c, calcZ: (u,v,c) => c },
    cutU: { 
      calcU: (u, p) => u * (p || 1), calcV: v => v,
      calcX: (u,v,c,vct,vp) => c, calcY: (u,v,c,vct,vp) => c, calcZ: (u,v,c,vct,vp) => c 
    }
  },
  scaling: {
    none: { calcU: u => u, calcV: v => v, calcX: (u,v,c) => c, calcY: (u,v,c) => c, calcZ: (u,v,c) => c },
    scale1: {
      calcU: u => u, calcV: v => v,
      calcX: (u,v,c,vct,vp) => c * checkVectors(vct,"x","scale1",u,v,vp.x),
      calcY: (u,v,c,vct,vp) => c * checkVectors(vct,"y","scale1",u,v,vp.y),
      calcZ: (u,v,c,vct,vp) => c * checkVectors(vct,"z","scale1",u,v,vp.z),
    },
    scale2: {
      calcU: u => u, calcV: v => v,
      calcX: (u,v,c,vct,vp) => c * checkVectors(vct,"x","scale2",u,v,vp.x),
      calcY: (u,v,c,vct,vp) => c * checkVectors(vct,"y","scale2",u,v,vp.y),
      calcZ: (u,v,c,vct,vp) => c * checkVectors(vct,"z","scale2",u,v,vp.z),
    },
    scale3: {
      calcU: u => u, calcV: v => v,
      calcX: (u,v,c,vct,vp) => c * checkVectors(vct,"x","scale3",u,v,vp.x),
      calcY: (u,v,c,vct,vp) => c * checkVectors(vct,"y","scale3",u,v,vp.y),
      calcZ: (u,v,c,vct,vp) => c * checkVectors(vct,"z","scale3",u,v,vp.z),
    }
  },
  translating: {
    none: { calcU: u => u, calcV: v => v, calcX: (u,v,c) => c, calcY: (u,v,c) => c, calcZ: (u,v,c) => c },
    translate1: {
      calcU: u => u, calcV: v => v,
      calcX: (u,v,c,vct,vp) => c + checkVectors(vct,"x","translate1",u,v,vp.x),
      calcY: (u,v,c,vct,vp) => c + checkVectors(vct,"y","translate1",u,v,vp.y),
      calcZ: (u,v,c,vct,vp) => c + checkVectors(vct,"z","translate1",u,v,vp.z),
    }
    // ... rest of translation/spiraling blocks ...
  }
};

export default parametricGeometryFormulas;