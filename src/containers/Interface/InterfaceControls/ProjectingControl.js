import React, { useState, useEffect, useCallback, useMemo } from "react";
import withInterfaceControls from "./withInterfaceControls";
import Aux from '../../../hoc/Aux/Aux';

// Note: code has been refactored into a functional component to 
//        address depreciated `componentWillReceiveProps`
const evalProjectingButtonClasses = (vector, vID, parametricObj) => {
  const currentVectors = parametricObj.transformationInstructions.projecting.vectors
  const vectorToUpdate = vID === 1 ? currentVectors[0] : currentVectors[1];
  const projectionFactor = parametricObj.transformationInstructions.projecting.formula;

  // Check if vID is 2 and the projection factor is 'project1' (meaning vector 2 is disabled/null)
  const project1Check = vID === 2 && projectionFactor === "project1";

  // Also handle null vectors gracefully, which can happen if a vector is turned off
  const vectorIsActive = vectorToUpdate === vector && vectorToUpdate !== null;

  return (
    "IconButton___" +
    vector +
    " IconButton" +
    (vectorIsActive && !project1Check
      ? " IconButton___Vector___Active"
      : "")
  );
};

const ProjectingControl = React.memo((props) => {
  const { parametricObj, handleUpdate } = props;

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
  const projectingUI = useMemo(() => {
    // This replaces the constructor/componentWillReceiveProps logic for setting UI state.
    return {
      x1ButtonClasses: evalProjectingButtonClasses("x", 1, parametricObj),
      y1ButtonClasses: evalProjectingButtonClasses("y", 1, parametricObj),
      z1ButtonClasses: evalProjectingButtonClasses("z", 1, parametricObj),
      x2ButtonClasses: evalProjectingButtonClasses("x", 2, parametricObj),
      y2ButtonClasses: evalProjectingButtonClasses("y", 2, parametricObj),
      z2ButtonClasses: evalProjectingButtonClasses("z", 2, parametricObj)
    };
  }, [parametricObj]); // Dependency: recalculate only when parametricObj changes

  // MEMOIZATION: Memoize the complex event handler using useCallback
  const handleProjectingChange = useCallback((data) => {
    const currentProjectingFormula = parametricObj
      .transformationInstructions.projecting.formula;

    const id = data.target.id;

    // Extract projectionArea, newVector, and vectorArea from the button ID string (e.g., "iconButton___projecting_x_v1")
    const projectionArea = id.substring(13, id.length - 5);
    const newVector = id.substring(14 + projectionArea.length, 15 + projectionArea.length);
    const vectorArea = id.substring(id.length - 1, id.length); // "1" or "2"
    const vectorIndex = parseInt(vectorArea) - 1; // 0 or 1

    const currentVectors =
      projectionArea === "shaping"
        ? parametricObj.transformationInstructions.shaping.vectors
        : parametricObj.transformationInstructions.projecting.vectors;

    const statePath =
      projectionArea === "shaping"
        ? "parametricObj.transformationInstructions.shaping"
        : "parametricObj.transformationInstructions.projecting";

    let projectionFormula;
    let updatedVectors = [...currentVectors];

    // --- Determine new state for projectionFormula and updatedVectors ---
    // Logic for updating vectors
    if (projectionArea === "projecting") {
      // Logic for Vector 2 (v2)
      if (vectorArea === "2") {
        if (newVector === currentVectors[vectorIndex]) {
          // Case 1: Active v2 was clicked -> Turn it off (set to null), formula becomes 'project1'
          updatedVectors[vectorIndex] = null;
          projectionFormula = "project1";
        } else {
          // Case 2: New vector selected for v2 (or v2 was off) -> Set new vector, formula becomes 'project2'
          updatedVectors[vectorIndex] = newVector;
          projectionFormula = "project2";
        }
      } 
      // Logic for Vector 1 (v1)
      else if (vectorArea === "1") {
        if (newVector === currentVectors[vectorIndex] && currentProjectingFormula !== "project2") {
          // Case 3: Active v1 was clicked (and v2 is not active) -> Turn it off (set to null), formula becomes 'none'
          updatedVectors[vectorIndex] = null;
          projectionFormula = "none";
        } else {
          // Case 4: New vector selected for v1 (or v1 was off) -> Set new vector, formula becomes 'project1' (or stays 'project2' if v2 is on)
          updatedVectors[vectorIndex] = newVector;
          // Determine projection formula based on v2 state
          projectionFormula = currentVectors[1] !== null && currentVectors[1] !== undefined ? "project2" : "project1";
        }
      }
    } else {
      // Shaping area logic (mostly unchanged)
      // Note: Original shaping logic was complex; assuming simplified update for this area
      updatedVectors = currentVectors.map((vector, index) => {
          if (index + 1 === parseInt(vectorArea)) {
            if (newVector === vector && vectorArea === "2") {
              return null;
            } else {
              return newVector;
            }
          } else {
            return vector;
          }
        });
        projectionFormula = parametricObj.transformationInstructions.shaping.formula; // Keep current shaping formula
    }


    // --- Execute Updates ---
    if (projectionArea === "shaping") {
      // Execute shaping update
      const updateArray = [{ objectStatePath: statePath, paramToUpdate: "vectors", newValue: updatedVectors }];
      handleUpdate(updateArray);

    } else if (projectionArea === "projecting") {
      // Execute projecting update
      const updateArray = [
        { objectStatePath: statePath, paramToUpdate: "formula", newValue: projectionFormula },
        { objectStatePath: statePath, paramToUpdate: "vectors", newValue: updatedVectors },
        { objectStatePath: statePath, paramToUpdate: "visible", visible: true }
      ];

      // Handle the complex V1/V2 interaction (original logic)
      if (
          projectionFormula === "project1" && 
          currentVectors[0] !== null && // V1 was active
          updatedVectors[1] !== null && // V2 is still active in the logic above
          vectorArea === "1" // V1 was the trigger
      ) {
          // V1 was clicked, V2 is still active -> This is the V1 turn-off/change case that requires V2 to be cleared and restored.
          const clearUpdateArray = structuredClone(updateArray);
          clearUpdateArray[1].newValue[1] = null;
          clearUpdateArray[2].visible = false; 
          handleUpdate(clearUpdateArray);

          setTimeout(() => {
              // Restore V2 projection
              updateArray[0].newValue = "project2";
              handleUpdate(updateArray);
          }, 10);
      } else {
          handleUpdate(updateArray);
      }
    }
  }, [parametricObj, handleUpdate]); // Dependencies: parametricObj and handleUpdate (assuming handleUpdate is stable)


  // --- Render ---
  return (
    <Aux>
      <button
        onClick={props.updateControlsRef}
        className="TAreaInterface___TitleButton"
      >
        <h3 className="TAreaInterface___TitleButton_Label">Project</h3>
      </button>
      <div className="TAreaInterface_controlsContainer">
        <label className="VectorLabel">Vector 1</label>
        <button
          id="iconButton___projecting_x_v1"
          alt="x shape"
          className={projectingUI.x1ButtonClasses}
          onClick={handleProjectingChange}
        ></button>
        <button
          id="iconButton___projecting_y_v1"
          alt="y shape"
          className={projectingUI.y1ButtonClasses}
          onClick={handleProjectingChange}
        ></button>
        <button
          id="iconButton___projecting_z_v1"
          alt="z shape"
          className={projectingUI.z1ButtonClasses}
          onClick={handleProjectingChange}
        ></button>
        <label className="VectorLabel">Vector 2</label>
        <button
          id="iconButton___projecting_x_v2"
          alt="x shape"
          className={projectingUI.x2ButtonClasses}
          onClick={handleProjectingChange}
        ></button>
        <button
          id="iconButton___projecting_y_v2"
          alt="y shape"
          className={projectingUI.y2ButtonClasses}
          onClick={handleProjectingChange}
        ></button>
        <button
          id="iconButton___projecting_z_v2"
          alt="z shape"
          className={projectingUI.z2ButtonClasses}
          onClick={handleProjectingChange}
        ></button>
      </div>
    </Aux>
  );
});

// Use React.memo as the HOC for shallow prop comparison memoization
export default React.memo(withInterfaceControls(ProjectingControl, "project", "TAreaInterface"));