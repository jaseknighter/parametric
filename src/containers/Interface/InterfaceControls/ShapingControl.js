import React, { useState, useEffect, useCallback, useMemo } from "react";

import withInterfaceControls from './withInterfaceControls'
import Aux from '../../../hoc/Aux/Aux';

// Note: code has been refactored into a functional component to 
//        address depreciated `componentWillReceiveProps`
const evalShapingButtonClasses = (vector, vID, parametricObj) => {
  // Get vectors from the parametricObj structure
  const currentVectors = parametricObj.transformationInstructions.shaping.vectors
  
  // Determine which vector (v1 or v2) we are checking
  const vectorToUpdate = vID === 1 ? currentVectors[0] : currentVectors[1];

  return(
    "IconButton___" +
    vector +
    " IconButton" +
    (vectorToUpdate === vector 
      ? " IconButton___Vector___Active" 
      : "")
    );
};

const ShapingControl = React.memo((props) => {
  const { parametricObj, handleUpdate, updateControlsRef } = props;

  // Use state only for tracking initialization if necessary for effects, 
  // but most logic is now derived from props.
  const [initedInterface, setInitedInterface] = useState(false);

  // Equivalent to componentDidMount logic
  useEffect(() => {
    // console.log("ProjectingControl mounted");
    setInitedInterface(true);
  }, []);


  // MEMOIZATION: Calculate the UI button classes using useMemo
  // This calculation only runs if `parametricObj` has changed, preventing re-calculation
  // when other props (like `updateControlsRef`) change.
  const shapingUI = useMemo(() => {
    // This replaces the constructor/componentWillReceiveProps logic for setting UI state.
    const newFormula = parametricObj.transformationInstructions.shaping.formula;
    return {
        lineButtonClasses:
          "IconButton___line IconButton" +
          (newFormula === "line" ? " IconButton___Active" : " "),
        sinButtonClasses:
          "IconButton___sin IconButton" +
          (newFormula === "sin" ? " IconButton___Active" : " "),
        cosButtonClasses:
          "IconButton___cos IconButton" +
          (newFormula === "cos" ? " IconButton___Active" : " "),
        circleButtonClasses:
          "IconButton___circle IconButton" +
          (newFormula === "circle" ? " IconButton___Active" : ""),

        // Calculate vector button classes using the utility function and current props
        x1ButtonClasses: evalShapingButtonClasses("x", 1, parametricObj),
        y1ButtonClasses: evalShapingButtonClasses("y", 1, parametricObj),
        z1ButtonClasses: evalShapingButtonClasses("z", 1, parametricObj),
        x2ButtonClasses: evalShapingButtonClasses("x", 2, parametricObj),
        y2ButtonClasses: evalShapingButtonClasses("y", 2, parametricObj),
        z2ButtonClasses: evalShapingButtonClasses("z", 2, parametricObj)
      }
  }, [parametricObj]); // Dependency: recalculate only when parametricObj changes

  // MEMOIZATION: Memoize the complex event handler using useCallback
  const handleShapingFormulaChange = useCallback((data) => {
    const newType = data.target.id.substring(13);
    const statePath = "parametricObj.transformationInstructions.shaping";
    const updateArray = [
      {
        objectStatePath: statePath,
        paramToUpdate: "formula",
        newValue: newType
      }
    ];
    handleUpdate(updateArray);
  },[handleUpdate]); // Dependency on handleUpdate

  // MEMOIZATION: Memoize the complex event handler using useCallback
  const handleShapingVectorChange = useCallback((data) => {
    //Get the projection area ("shaping" or "projecting" from the button ID, e.g. "iconButton___projecting_x_v1"
    const projectionArea = data.target.id.substring(
      13,
      data.target.id.length - 5
    );

    //Get the newVector ("x", "y", or "z") from the button ID, e.g. "iconButton___projecting_x_v1"
    const newVector = data.target.id.substring(
      14 + projectionArea.length,
      15 + projectionArea.length
    );

    //Determine whether vector1 or vector2 is being updated
    const vectorArea = data.target.id.substring(
      data.target.id.length - 1,
      data.target.id.length
    );

    const currentVectors =
      projectionArea === "shaping"
        ? parametricObj.transformationInstructions.shaping.vectors
        : parametricObj.transformationInstructions.projecting
            .vectors;

    const statePath =
      projectionArea === "shaping"
        ? "parametricObj.transformationInstructions.shaping"
        : "parametricObj.transformationInstructions.projecting";

    const updatedVectors = currentVectors.map((vector, index) => {
      if (index + 1 === parseInt(vectorArea)) {
        return newVector;
      } else {
        return vector;
      }
    });

    if (projectionArea === "shaping") {
      const updateArray = [
        {
          objectStatePath: statePath,
          paramToUpdate: "vectors",
          newValue: updatedVectors
        }
      ];
      handleUpdate(updateArray);
    }
  }, [parametricObj, handleUpdate]); // Dependencies on parametricObj and handleUpdate

  // --- Render ---
  return (
      <Aux>
        <button 
          onClick={updateControlsRef}
          className="TAreaInterface___TitleButton">
          <h3 className="TAreaInterface___TitleButton_Label">Shape</h3>
        </button>
        <div className="TAreaInterface_controlsContainer">
          {/* <button
            id="iconButton___line"
            alt="line shape"
            className={shapingUI.lineButtonClasses}
            onClick={handleShapingFormulaChange}
          ></button> */}
          <label className="VectorLabel"></label>

          <button
            id="iconButton___sin"
            alt="sine shape"
            className={shapingUI.sinButtonClasses}
            onClick={handleShapingFormulaChange}
          ></button>
          <button
            id="iconButton___cos"
            alt="cos shape"
            className={shapingUI.cosButtonClasses}
            onClick={handleShapingFormulaChange}
          ></button>
          <button
            id="iconButton___circle"
            alt="circle shape"
            className={shapingUI.circleButtonClasses}
            type="button"
            onClick={handleShapingFormulaChange}
          ></button>
          <label className="VectorLabel">Vector 1</label>
          <button
            id="iconButton___shaping_x_v1"
            alt="x shape"
            className={shapingUI.x1ButtonClasses}
            onClick={handleShapingVectorChange}
          ></button>
          <button
            id="iconButton___shaping_y_v1"
            alt="y shape"
            className={shapingUI.y1ButtonClasses}
            onClick={handleShapingVectorChange}
          ></button>
          <button
            id="iconButton___shaping_z_v1"
            alt="z shape"
            className={shapingUI.z1ButtonClasses}
            onClick={handleShapingVectorChange}
          ></button>
          <label className="VectorLabel">Vector 2</label>
          <button
            id="iconButton___shaping_x_v2"
            alt="x shape"
            className={shapingUI.x2ButtonClasses}
            onClick={handleShapingVectorChange}
          ></button>
          <button
            id="iconButton___shaping_y_v2"
            alt="y shape"
            className={shapingUI.y2ButtonClasses}
            onClick={handleShapingVectorChange}
          ></button>
          <button
            id="iconButton___shaping_z_v2"
            alt="z shape"
            className={shapingUI.z2ButtonClasses}
            onClick={handleShapingVectorChange}
          ></button>
        </div>
      </Aux>
  );
});

// Use React.memo as the HOC for shallow prop comparison memoization
export default React.memo(withInterfaceControls(ShapingControl, "shape", "TAreaInterface"));