import React, { useCallback, useMemo } from "react";
import withInterfaceControls from './withInterfaceControls'

const evalShapingButtonClasses = (vector, vID, vectors) => {
  const vectorToUpdate = vectors[vID - 1];
  return `IconButton___${vector} IconButton ${vectorToUpdate === vector ? "IconButton___Vector___Active" : ""}`;
};

const ShapingControl = ((props) => {
  const { parametricObj, handleUpdate, updateControlsRef } = props;

  const shaping = parametricObj?.transformationInstructions?.shaping;
  const vectors = shaping?.vectors || [];
  const formula = shaping?.formula || "circle";

  const shapingUI = useMemo(() => {
    return {
        // lineButtonClasses: `IconButton___line IconButton ${formula === "line" ? " IconButton___Active" : ""}`,
        sinButtonClasses: `IconButton___sin IconButton ${formula === "sin" ? " IconButton___Active" : ""}`,
        cosButtonClasses: `IconButton___cos IconButton ${formula === "cos" ? " IconButton___Active" : ""}`,
        circleButtonClasses: `IconButton___circle IconButton ${formula === "circle" ? " IconButton___Active" : ""}`,

        // Calculate vector button classes using the utility function and current props
        x1ButtonClasses: evalShapingButtonClasses("x", 1, vectors),
        y1ButtonClasses: evalShapingButtonClasses("y", 1, vectors),
        z1ButtonClasses: evalShapingButtonClasses("z", 1, vectors),
        x2ButtonClasses: evalShapingButtonClasses("x", 2, vectors),
        y2ButtonClasses: evalShapingButtonClasses("y", 2, vectors),
        z2ButtonClasses: evalShapingButtonClasses("z", 2, vectors)
      }
  }, [formula, vectors]); 

  const handleShapingFormulaChange = useCallback((e) => {
    const { shape } = e.target.dataset;
    const statePath = "parametricObj.transformationInstructions.shaping";
    
    handleUpdate([
      { objectStatePath: statePath, paramToUpdate: "formula", newValue: shape }
    ]);
  },[handleUpdate]); 

  const handleShapingVectorChange = useCallback((e) => {
    const { vector, group } = e.target.dataset;
    const groupNum = parseInt(group);

    const statePath = "parametricObj.transformationInstructions.shaping";

    const updatedVectors = vectors.map((v, index) => {
      return (index + 1 === groupNum) ? vector : v;
    });
    handleUpdate([
      {
        objectStatePath: statePath,
        paramToUpdate: "vectors",
        newValue: updatedVectors
      }
    ]);
  }, [vectors, handleUpdate]); 

  // --- Render ---
  return (
      <>
        <button 
          onClick={updateControlsRef}
          className="TAreaInterface___TitleButton">
          <h3 className="TAreaInterface___TitleButton_Label">Shape</h3>
        </button>
        <div className="TAreaInterface_controlsContainer">
          {/* <button
            id="iconButton___line"
            className={shapingUI.lineButtonClasses}
            onClick={handleShapingFormulaChange}
          ></button> */}
          <label className="VectorLabel"></label>

          <button
            id="iconButton___sin"
            data-shape="sin"
            className={shapingUI.sinButtonClasses}
            onClick={handleShapingFormulaChange}
          ></button>
          <button
            id="iconButton___cos"
            data-shape="cos"
            className={shapingUI.cosButtonClasses}
            onClick={handleShapingFormulaChange}
          ></button>
          <button
            id="iconButton___circle"
            data-shape="circle"
            className={shapingUI.circleButtonClasses}
            type="button"
            onClick={handleShapingFormulaChange}
          ></button>
          <label className="VectorLabel">Vector 1</label>
          <button
            id="iconButton___shaping_x_v1"
            data-vector="x"
            data-group="1"
            className={shapingUI.x1ButtonClasses}
            onClick={handleShapingVectorChange}
          ></button>
          <button
            id="iconButton___shaping_y_v1"
            data-vector="y"
            data-group="1"
            className={shapingUI.y1ButtonClasses}
            onClick={handleShapingVectorChange}
          ></button>
          <button
            id="iconButton___shaping_z_v1"
            data-vector="z"
            data-group="1"
            className={shapingUI.z1ButtonClasses}
            onClick={handleShapingVectorChange}
          ></button>
          <label className="VectorLabel">Vector 2</label>
          <button
            id="iconButton___shaping_x_v2"            
            data-vector="x"
            data-group="2"
            className={shapingUI.x2ButtonClasses}
            onClick={handleShapingVectorChange}
          ></button>
          <button
            id="iconButton___shaping_y_v2"
            data-vector="y"
            data-group="2"
            className={shapingUI.y2ButtonClasses}
            onClick={handleShapingVectorChange}
          ></button>
          <button
            id="iconButton___shaping_z_v2"          
            data-vector="z"
            data-group="2"
            className={shapingUI.z2ButtonClasses}
            onClick={handleShapingVectorChange}
          ></button>
        </div>
      </>
  );
});

// Use React.memo as the HOC for shallow prop comparison memoization
export default React.memo(withInterfaceControls(ShapingControl, "shape", "TAreaInterface"));