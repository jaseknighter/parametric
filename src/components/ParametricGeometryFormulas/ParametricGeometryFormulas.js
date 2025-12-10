import { create, all } from "mathjs/number";

const math = create(all);
const PI = math.evaluate('pi')
const DEG = 0.005555555555556;

const checkU = (formula, u, uParams, vectors,vectorToCheck,vectorParams) =>
{
  switch(formula){
    case "none": 
      return 1;
    case "cutU": 
      return u*uParams;
    default:
      return null;
  }
}

const recursiveSin = (val,timesToRun) => {
  const result = math.sin(val)
  if (timesToRun > 1){
    return recursiveSin(result,timesToRun-1)
  } else {
    return result;
  }
}

//TODO: setting flattenAmt to 0 should undo the transformation
const checkFlatten = (flattenAmt, valToFlatten) => {
  if (flattenAmt>0) {
    const recursiveSinResult = recursiveSin(valToFlatten, flattenAmt)
    return recursiveSinResult;
  } else {
    return valToFlatten;
  }
}

const checkVectors = (vectors, vectorToCheck, formula, u, v, vectorParams, currentShape, currentVectors) =>
{
  const spiralCos = vectorParams && vectorParams.spiralCos 
    ? ((1+u*vectorParams.spiralCosAmt) * math.cos(u*vectorParams.spiralCosAmt))
    : 0;
   
  const spiralSin = vectorParams && vectorParams.spiralSin 
    ? ((1+u*vectorParams.spiralSinAmt) * math.sin(u*vectorParams.spiralSinAmt))
    : 0;
  const modulateAmt = vectorParams && vectorParams.modulate ? vectorParams.modulateAmt: 1;
  const outerTextureAmt = vectorParams && vectorParams.texture ? vectorParams.outerTextureAmt: 1;
  const innerTextureAmt = vectorParams && vectorParams.texture ? vectorParams.innerTextureAmt: 1;
  const bendCos = vectorParams && vectorParams.bendCos ? math.cos(v*vectorParams.bendCosAmt): 0;
  const bendSin = vectorParams && vectorParams.bendSin ? math.sin(v*vectorParams.bendSinAmt): 0;
  const pinchAmt = vectorParams && vectorParams.pinch ? vectorParams.pinchAmt : 1;
  const flatten1 = vectorParams && vectorParams.flatten ? vectorParams.flattenAmt1 : 0;
  const flatten2 = vectorParams && vectorParams.flatten ? vectorParams.flattenAmt2 : 0;
  const flatten3 = vectorParams && vectorParams.flatten ? vectorParams.flattenAmt3 : 0;
  const vectorIndex = vectors ? vectors.findIndex(vector=> vector === vectorToCheck ) : null;
    
  switch(formula){
    case "none": 
      return 1;
    // shaping formulas
    case "line":
      return vectors[0] === vectorToCheck ? u: 1;
    case "sin":  
      if (vectorIndex === 0) { 
          return u;
      } else if (vectorIndex === 1){
        if (vectorParams.texture){
          const val = checkFlatten(flatten1, math.pow(math.sin(u*modulateAmt*outerTextureAmt)/(outerTextureAmt/innerTextureAmt) + math.sin(u*modulateAmt)+ bendSin + spiralSin, pinchAmt));
          return vectorParams.spiralSin ? val*(1/(vectorParams.spiralSinAmt)): val;
        } else {
          const val = checkFlatten(flatten1, math.pow(math.sin(u*modulateAmt)+ bendSin + spiralSin, pinchAmt));
          return vectorParams.spiralSin ? val*(1/(vectorParams.spiralSinAmt)): val;
        }
      }
    case "cos":  
      if (vectorIndex === 0) { 
        return u;
      } else if (vectorIndex === 1){
        if (vectorParams.texture){
          const val = checkFlatten(flatten1, math.pow(math.cos(u*modulateAmt*outerTextureAmt)/(outerTextureAmt/innerTextureAmt)+math.cos(u)+ bendCos + spiralCos, pinchAmt));
          return vectorParams.spiralCos ? val*(1/(vectorParams.spiralCosAmt)): val;
        } else {
          const val = checkFlatten(flatten1, math.pow(math.cos(u*modulateAmt)+ bendCos + spiralCos, pinchAmt));
          return vectorParams.spiralCos ? val*(1/(vectorParams.spiralCosAmt)): val;
        }
      }
    case "circle":
      if (vectorIndex === 0) { 
        if (vectorParams.texture){
          const val = checkFlatten(flatten1, math.pow(math.cos(u*modulateAmt*outerTextureAmt)/(outerTextureAmt/innerTextureAmt)+math.cos(u)+ bendCos + spiralCos, pinchAmt));
          // console.log("1",val=="Infinity")
          const returnVal = vectorParams.spiralCos ? val*(1/(vectorParams.spiralCosAmt)): val;
          return returnVal;
        } else {
          const val = checkFlatten(flatten1, math.pow(math.cos(u*modulateAmt) + bendCos + spiralCos, pinchAmt));
          // console.log("2",val=="Infinity")
          const returnVal = vectorParams.spiralCos ? val*(1/(vectorParams.spiralCosAmt)): val//*(1/20);
          return returnVal;
        }
      } else if (vectorIndex === 1){
        if (vectorParams.texture){
          const val = checkFlatten(flatten2, math.pow(math.sin(u*modulateAmt*outerTextureAmt)/(outerTextureAmt/innerTextureAmt) + math.sin(u*modulateAmt) + bendSin + spiralSin, pinchAmt));
          // console.log("texture1", val);
          return vectorParams.spiralSin ? val*(1/(vectorParams.spiralSinAmt)): val;
        } else {
          const val = checkFlatten(flatten2, math.pow(math.sin(u*modulateAmt) + bendSin + spiralSin, pinchAmt));
          return vectorParams.spiralSin ? val*(1/(vectorParams.spiralSinAmt)): val//*(1/20);
        }
        
      }
    // projecting formulas
    case "project1":
      if (vectorIndex === 0) { 
        return v;
      } else {
        return 1;
      }
    case "project2":
      if (vectorIndex === 0 && vectors[0] === vectorToCheck) { 
        // console.log("flattenx", flatten1)
        return checkFlatten(flatten1, math.sin(v));
      } else if (vectorIndex === 1 && vectors[1] === vectorToCheck){
        // console.log("flatteny", flatten2)
        return checkFlatten(flatten2, math.sin(v));
      } else if (vectorIndex === -1){
        // console.log("flattenz", flatten3)
        return checkFlatten(flatten3, math.cos(v));
      }
    // sutting formula
    case "cutU": 
      return 1;
    // scaling formulas
    case "scale1": 
    if (vectorIndex === 0) { 
      return vectorParams;
    } else {
      return 1;
    }
    case "scale2": 
      if (vectorIndex === 0) { 
        return vectorParams;
      } else if (vectorIndex === 1) { 
        return vectorParams;
      } else {
        return 1;
      }
    case "scale3": 
    if (vectorIndex === 0) { 
      return vectorParams;
    } else if (vectorIndex === 1) { 
      return vectorParams;
    } else if (vectorIndex === 2) { 
      return vectorParams;
    }
    // scaling formulas
    case "translate1": 
    if (vectorIndex === 0) { 
      return vectorParams;
    } else {
      return 1;
    }
    case "translate2": 
      if (vectorIndex === 0) { 
        return vectorParams;
      } else if (vectorIndex === 1) { 
        return vectorParams;
      } else {
        return 1;
      }
    case "translate3": 
    if (vectorIndex === 0) { 
      return vectorParams;
    } else if (vectorIndex === 1) { 
      return vectorParams;
    } else if (vectorIndex === 2) { 
      return vectorParams;
    }
    // ascending formulas
    case "ascend1": 
    if (vectorIndex === 0) { 
      return u * vectorParams;
    } else {
      return 1;
    }
    case "ascend2": 
      if (vectorIndex === 0) { 
        return u * vectorParams;
      } else if (vectorIndex === 1) { 
        return u * vectorParams;
      } else {
        return 1;
      }
    case "ascend3": 
    if (vectorIndex === 0) { 
      return u * vectorParams;
    } else if (vectorIndex === 1) { 
      return u * vectorParams;
    } else if (vectorIndex === 2) { 
      return u * vectorParams;
    }
    
    
    // default
    default:
      console.log("Formula not found!!!",formula)
      return 1;
  }
}



const rotateObj = (pitch, roll, yaw,points) => {
  // console.log("pitch, roll, yaw,points",pitch, roll, yaw,points)
  const cosA = math.cos((yaw*DEG)*(PI));
  const sinA = math.sin((yaw*DEG)*(PI));
 
  const cosB = math.cos((pitch*DEG)*(PI));
  const sinB = math.sin((pitch*DEG)*(PI));

  const cosC = math.cos((roll*DEG)*(PI));
  const sinC = math.sin((roll*DEG)*(PI));

  const aXX = cosA*cosB;
  const aXY = cosA*sinB*sinC - sinA*cosC;
  const aXz = cosA*sinB*cosC + sinA*sinC;

  const aYX = sinA*cosB;
  const aYY = sinA*sinB*sinC + cosA*cosC;
  const aYZ = sinA*sinB*cosC - cosA*sinC;

  const aZX = -sinB;
  const aZY = cosB*sinC;
  const aZZ = cosB*cosC;

  const px = points.xC;
  const py = points.yC;
  const pz = points.zC;

  points.x = aXX*px + aXY*py + aXz*pz;
  points.y = aYX*px + aYY*py + aYZ*pz;
  points.z = aZX*px + aZY*py + aZZ*pz;

  return points; 
}

const reflectObj = (pitch, roll, yaw,points) => {
  // console.log(" reflect pitch, roll, yaw,points",pitch, roll, yaw,points)
  const cosA = math.cos((yaw*DEG)*(PI));
  const sinA = math.sin((yaw*DEG)*(PI));
 
  const cosB = math.cos((pitch*DEG)*(PI));
  const sinB = math.sin((pitch*DEG)*(PI));

  const cosC = math.cos((roll*DEG)*(PI));
  const sinC = math.sin((roll*DEG)*(PI));

  const aXX = cosA*cosB;
  const aXY = sinA*cosC - cosA*sinB*sinC;
  const aXz = sinA*sinC + cosA*sinB*cosC;

  const aYX = sinA*cosB;
  const aYY = cosA*cosC + sinA*sinB*sinC;
  const aYZ = cosA*sinC - sinA*sinB*cosC;

  const aZX = sinB;
  const aZY = cosB*sinC;
  const aZZ = cosB*cosC;

  const px = points.xC;
  const py = points.yC;
  const pz = points.zC;

  points.x = aXX*px + aXY*py + aXz*pz;
  points.y = aYX*px + aYY*py + aYZ*pz;
  points.z = aZX*px + aZY*py + aZZ*pz;

  return points;  
}

////////////////////////
// TODO: add check if too many vectors are requested for each formula
//  ALSO: "v" is not needed in shaping formulas
////////////////////////
export const parametricGeometryFormulas =  {
  reflecting: {
    none: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors) { return currentVector },
      calcY(u,v,currentVector,vectors) { return currentVector },
      calcZ(u,v,currentVector,vectors) { return currentVector },
    },
    reflect: {
      //TODO: return u & v
      doReflection(uC, vC, currentVectors,vectorParams) { return reflectObj(vectorParams.pitch,vectorParams.roll,vectorParams.yaw,currentVectors) },
    }
  },
  rotating: {
    none: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors) { return currentVector },
      calcY(u,v,currentVector,vectors) { return currentVector },
      calcZ(u,v,currentVector,vectors) { return currentVector },
    },
    rotate: {
      //TODO: return u & v
      doRotation(uC, vC, currentVectors,vectorParams) { return rotateObj(vectorParams.pitch,vectorParams.roll,vectorParams.yaw,currentVectors) },
    }
  },
  ////// TODO: Move code to the top of the formulas object starting here
  shaping: {
    none: {
      calcU(u,v){ return u },
      calcV(u,v) { return v },
      calcX(u,v,currentVector,vectors) { return currentVector },
      calcY(u,v,currentVector,vectors) { return currentVector },
      calcZ(u,v,currentVector,vectors) { return currentVector },
    },
    line: {
        calcU(u){ return u * 2*PI },
        calcV(v){ return v },
        calcX(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"x","line",u,v,vectorParams) },
        calcY(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"y","line",u,v,vectorParams) },
        calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"z","line",u,v,vectorParams) },
    },
    sin: {
      calcU(u){ return u * 2 *PI },
      calcV(v){ return v },
      calcX(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"x","sin",u,v,vectorParams) },
      calcY(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"y","sin",u,v,vectorParams) },
      calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"z","sin",u,v,vectorParams) },
    },
    cos: {
      calcU(u){ return u * 2*PI },
      calcV(v){ return v },
      calcX(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"x","cos",u,v,vectorParams) },
      calcY(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"y","cos",u,v,vectorParams) },
      calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"z","cos",u,v,vectorParams) },
    },
    circle: {
      calcU(u){ return u * 2 *PI },
      calcV(v){ return v },
      calcX(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"x","circle",u,v,vectorParams) },
      calcY(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"y","circle",u,v,vectorParams) },
      calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"z","circle",u,v,vectorParams) },
    }
  },
  projecting: {
    none: {
      calcU(u){ return u },
      calcV(v){ return v },
      calcX(u,v,currentVector,vectors) { return currentVector },
      calcY(u,v,currentVector,vectors) { return currentVector },
      calcZ(u,v,currentVector,vectors) { return currentVector },
    },
    project1: {
      calcU(u){ return u },
      calcV(v){ return v * 1*PI },
      calcX(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"x","project1",u,v,vectorParams) },
      calcY(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"y","project1",u,v,vectorParams) },
      calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"z","project1",u,v,vectorParams) },
    },
    project2: {
      calcU(u){ return u },
      calcV(v){ return v * 1*PI },
      calcX(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"x","project2",u,v,vectorParams) },
      calcY(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"y","project2",u,v,vectorParams) },
      calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"z","project2",u,v,vectorParams) },
    },
  },
  cutting: {
    none: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors) { return currentVector },
      calcY(u,v,currentVector,vectors) { return currentVector },
      calcZ(u,v,currentVector,vectors) { return currentVector },
    },
    cutU: {
      calcU(u, params){ return u * checkU("cutU", u, params) },
      calcV(v){ return v },
      calcX(u,v,currentVector,vectors) { return currentVector * checkVectors(vectors,"x","cutU",u,v) },
      calcY(u,v,currentVector,vectors) { return currentVector * checkVectors(vectors,"y","cutU",u,v) },
      calcZ(u,v,currentVector,vectors) { return currentVector * checkVectors(vectors,"z","cutU",u,v) },
    }
  },
  scaling: {
    none: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors) { return currentVector },
      calcY(u,v,currentVector,vectors) { return currentVector },
      calcZ(u,v,currentVector,vectors) { return currentVector },
    },
    scale1: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"x","scale1",u,v,vectorParams.x) },
      calcY(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"y","scale1",u,v,vectorParams.y) },
      calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"z","scale1",u,v,vectorParams.z) },
    },
    scale2: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"x","scale2",u,v,vectorParams.x) },
      calcY(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"y","scale2",u,v,vectorParams.y) },
      calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"z","scale2",u,v,vectorParams.z) },
    },
    scale3: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"x","scale3",u,v,vectorParams.x) },
      calcY(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"y","scale3",u,v,vectorParams.y) },
      calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"z","scale3",u,v,vectorParams.z) },
    }
  },
  translating: {
    none: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors) { return currentVector },
      calcY(u,v,currentVector,vectors) { return currentVector },
      calcZ(u,v,currentVector,vectors) { return currentVector },
    },
    translate1: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"x","translate1",u,v,vectorParams.x) },
      calcY(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"y","translate1",u,v,vectorParams.y) },
      calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"z","translate1",u,v,vectorParams.z) },
    },
    translate2: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"x","translate2",u,v,vectorParams.x) },
      calcY(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"y","translate2",u,v,vectorParams.y) },
      calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"z","translate2",u,v,vectorParams.z) },
    },
    translate3: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"x","translate3",u,v,vectorParams.x) },
      calcY(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"y","translate3",u,v,vectorParams.y) },
      calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"z","translate3",u,v,vectorParams.z) },
    }
  },
  spiraling: {
    none: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors) { return currentVector },
      calcY(u,v,currentVector,vectors) { return currentVector },
      calcZ(u,v,currentVector,vectors) { return currentVector },
    },
    spiral1: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"x","spiral1",u,v,vectorParams.x) },
      calcY(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"y","spiral1",u,v,vectorParams.y) },
      calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"z","spiral1",u,v,vectorParams.z) },
    },
    spiral2: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"x","spiral2",u,v,vectorParams.x) },
      calcY(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"y","spiral2",u,v,vectorParams.y) },
      calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"z","spiral2",u,v,vectorParams.z) },
    },
    spiral3: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"x","spiral3",u,v,vectorParams.x) },
      calcY(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"y","spiral3",u,v,vectorParams.y) },
      calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector * checkVectors(vectors,"x","spiral3",u,v,vectorParams.z) },
    }
  },
  ascending: {
    none: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors) { return currentVector },
      calcY(u,v,currentVector,vectors) { return currentVector },
      calcZ(u,v,currentVector,vectors) { return currentVector },
    },
    ascend1: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"x","ascend1",u,v,vectorParams.x) },
      calcY(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"y","ascend1",u,v,vectorParams.y) },
      calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"z","ascend1",u,v,vectorParams.z) },
    },
    ascend2: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"x","ascend2",u,v,vectorParams.x) },
      calcY(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"y","ascend2",u,v,vectorParams.y) },
      calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"z","ascend2",u,v,vectorParams.z) },
    },
    ascend3: {
      calcV(v){ return v },
      calcU(u){ return u },
      calcX(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"x","ascend3",u,v,vectorParams.x) },
      calcY(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"y","ascend3",u,v,vectorParams.y) },
      calcZ(u,v,currentVector,vectors,vectorParams) { return currentVector + checkVectors(vectors,"z","ascend3",u,v,vectorParams.z) },
    }
  }  
}
export default parametricGeometryFormulas;
