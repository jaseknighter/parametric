import { parametricGeometryFormulas } from "../ParametricGeometryFormulas/ParametricGeometryFormulas";
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';


export const parameterizeGeometry = tParametricObjStates => {
  const pArray = [];
  const slices = tParametricObjStates.slices;
  const stacks = tParametricObjStates.stacks,
    
  parameterizedGeometry = (u, v, target) => {
    const doTransform = (
      parametricGeometryFormulas,
      tInstructionArea,
      tInstructionName,
      uC,
      vC,
      xC,
      yC,
      zC,
      tVectors,
      tUParams,
      tVParams,
      tVectorParams
    ) => {
      const formula =
        parametricGeometryFormulas[tInstructionArea][tInstructionName];
      if (tInstructionName !== "rotate" && tInstructionName !== "reflect") {
        const uT = formula.calcU(uC, tUParams, tVectors, tVectorParams);
        const vT = formula.calcV(vC, tVParams, tVectors, tVectorParams);

        const xT = formula.calcX(uT, vT, xC, tVectors, tVectorParams);
        const yT = formula.calcY(uT, vT, yC, tVectors, tVectorParams);
        const zT = formula.calcZ(uT, vT, zC, tVectors, tVectorParams);
        return { xT, yT, zT, uT, vT };
      } else if (tInstructionName === "rotate") {
        const rotation = formula.doRotation(
          uC,
          vC,
          { xC, yC, zC },
          tVectorParams
        );
        const xT = rotation.x;
        const yT = rotation.y;
        const zT = rotation.z;
        return { xT, yT, zT, uC, vC };
      } else if (tInstructionName === "reflect") {
        const reflection = formula.doReflection(
          uC,
          vC,
          { xC, yC, zC },
          tVectorParams
        );
        const xT = reflection.x;
        const yT = reflection.y;
        const zT = reflection.z;
        return { xT, yT, zT, uC, vC };
      }
    };

    //TODO: figure out why x,y,z can't be 0 by default
    let x = 1;
    let y = 1;
    let z = 1;

    //TODO: make these real getters/setters
    const getCurrentUV = () => {
      return { u, v };
    };

    const setUV = (newU, newV) => {
      u = newU;
      v = newV;
    };

    const getCurrentXYZ = () => {
      return { x, y, z };
    };

    const setXYZ = (newX, newY, newZ) => {
      x = newX;
      y = newY;
      z = newZ;
    };

    //TODO: this function creates side effects. Is that ok?
    const applyTransform = (transformObj, transformName) => {
      const currentUV = getCurrentUV();
      currentUV.u *= transformObj.uT;
      currentUV.v *= transformObj.vT;
      setUV(currentUV.u, currentUV.v);

      const currentXYZ = getCurrentXYZ();

      currentXYZ.x = transformObj.xT;
      currentXYZ.y = transformObj.yT;
      currentXYZ.z = transformObj.zT;

      setXYZ(currentXYZ.x, currentXYZ.y, currentXYZ.z);
    };


    const doTransformations = (
      currentUV,
      tInstructionAreas,
      tParametricObjStates
    ) => {
      tInstructionAreas.forEach(tInstructionArea => {
        currentUV = getCurrentUV();

        //Get the formula object for the requested transformation
        const tInstruction =
          tParametricObjStates.transformationInstructions[tInstructionArea];
        const tName = tInstruction.formula;
        const tVectors = tInstruction.vectors;
        const tUParams = tInstruction.uParams;
        const tVParams = tInstruction.uParams;
        const tVectorParams = tInstruction.vectorParams;

        const tObj = doTransform(
          parametricGeometryFormulas,
          tInstructionArea,
          tName,
          currentUV.u,
          currentUV.v,
          x,
          y,
          z,
          tVectors,
          tUParams,
          tVParams,
          tVectorParams
        );

        pArray.push(tObj.xT);

        applyTransform(tObj, tName);
      });
    };

    ////////////////////////////////////
    // trigger the transformations
    // TODO: the transformationArray array can be set outside the parameterizedGeometry function
    ////////////////////////////////////
    const tInstructionAreas = Object.keys(
      tParametricObjStates.transformationInstructions
    );

    doTransformations(getCurrentUV, tInstructionAreas, tParametricObjStates);

    target.set(x, y, z);
  };

  const parametricGeometry = new ParametricGeometry(
    parameterizedGeometry,
    slices,
    stacks,
    tParametricObjStates
  );

  return parametricGeometry;
};

export default parameterizeGeometry;
