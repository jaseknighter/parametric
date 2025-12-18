import React, { useState, useEffect, useCallback, useMemo } from "react";
import withInterfaceControls from "./withInterfaceControls";

const evalProjectingButtonClasses = (vector, vID, vectors, formula) => {
  const vectorToUpdate = vectors[vID - 1];
  const project1Check = vID === 2 && formula === "project1";
  const vectorIsActive = vectorToUpdate === vector && vectorToUpdate !== null;

  return `IconButton___${vector} IconButton ${vectorIsActive && !project1Check ? "IconButton___Vector___Active" : ""}`;
};

// Helper to determine the new formula and vector state
const calculateProjectingUpdate = (currentVectors, currentFormula, clickedVector, clickedGroup) => {
  const vectorIndex = clickedGroup - 1;
  const updatedVectors = [...currentVectors];
  let newFormula = currentFormula;

  if (clickedGroup === 2) {
    if (clickedVector === currentVectors[1]) {
      updatedVectors[1] = null;
      newFormula = "project1";
    } else {
      updatedVectors[1] = clickedVector;
      newFormula = "project2";
    }
  } else if (clickedGroup === 1) {
    if (clickedVector === currentVectors[0] && currentFormula !== "project2") {
      updatedVectors[0] = null;
      newFormula = "none";
    } else {
      updatedVectors[0] = clickedVector;
      newFormula = currentVectors[1] ? "project2" : "project1";
    }
  }

  return { updatedVectors, newFormula };
};

const ProjectingControl = ((props) => {
  const { parametricObj, handleUpdate, updateControlsRef } = props;

  const projecting = parametricObj?.transformationInstructions?.projecting;
  const vectors = projecting?.vectors || [null, null];
  const formula = projecting?.formula;

  const projectingUI = useMemo(() => {
    // This replaces the constructor/componentWillReceiveProps logic for setting UI state.
    return {
      x1ButtonClasses: evalProjectingButtonClasses("x", 1, vectors, formula),
      y1ButtonClasses: evalProjectingButtonClasses("y", 1, vectors, formula),
      z1ButtonClasses: evalProjectingButtonClasses("z", 1, vectors, formula),
      x2ButtonClasses: evalProjectingButtonClasses("x", 2, vectors, formula),
      y2ButtonClasses: evalProjectingButtonClasses("y", 2, vectors, formula),
      z2ButtonClasses: evalProjectingButtonClasses("z", 2, vectors, formula)
    };
  }, [vectors, formula]); // Dependency: recalculate only when parametricObj changes

  const handleProjectingChange = useCallback((e) => {
    const { vector, group } = e.target.dataset; // No substrings!
    const groupNum = parseInt(group);
    const { updatedVectors, newFormula } = calculateProjectingUpdate(
      vectors, 
      formula, 
      vector, 
      groupNum
    );

    const statePath = "parametricObj.transformationInstructions.projecting";

    // SINGLE ATOMIC UPDATE: No setTimeout needed
    // We send both the formula and the vector array simultaneously.
    const updateArray = [
      { objectStatePath: statePath, paramToUpdate: "formula", newValue: newFormula },
      { objectStatePath: statePath, paramToUpdate: "vectors", newValue: updatedVectors },
    ];

    handleUpdate(updateArray);
  }, [vectors, formula, handleUpdate]);

  // --- Render ---
  return (
    <>
      <button onClick={updateControlsRef} className="TAreaInterface___TitleButton">
        <h3 className="TAreaInterface___TitleButton_Label">Project</h3>
      </button>
      <div className="TAreaInterface_controlsContainer">
        <label className="VectorLabel">Vector 1</label>
        <button
          id="iconButton___projecting_x_v1"
          data-vector="x"
          data-group="1"
          alt="x shape"
          className={projectingUI.x1ButtonClasses}
          onClick={handleProjectingChange}
        ></button>
        <button
          id="iconButton___projecting_y_v1"
          data-vector="y"
          data-group="1"
          alt="y shape"
          className={projectingUI.y1ButtonClasses}
          onClick={handleProjectingChange}
        ></button>
        <button
          id="iconButton___projecting_z_v1"
          data-vector="z"
          data-group="1"
          alt="z shape"
          className={projectingUI.z1ButtonClasses}
          onClick={handleProjectingChange}
        ></button>
        <label className="VectorLabel">Vector 2</label>
        <button
          id="iconButton___projecting_x_v2"
          data-vector="x"
          data-group="2"
          alt="x shape"
          className={projectingUI.x2ButtonClasses}
          onClick={handleProjectingChange}
        ></button>
        <button
          id="iconButton___projecting_y_v2"
          data-vector="y"
          data-group="2"
          alt="y shape"
          className={projectingUI.y2ButtonClasses}
          onClick={handleProjectingChange}
        ></button>
        <button
          id="iconButton___projecting_z_v2"
          data-vector="z"
          data-group="2"
          alt="z shape"
          className={projectingUI.z2ButtonClasses}
          onClick={handleProjectingChange}
        ></button>
      </div>
    </>
  );
});

// Use React.memo as the HOC for shallow prop comparison memoization
export default React.memo(withInterfaceControls(ProjectingControl, "project", "TAreaInterface"));