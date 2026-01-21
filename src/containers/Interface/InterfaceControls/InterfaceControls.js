/**
 * @fileoverview InterfaceControls.js
 * FIXED: Refactored to use unified ControlGrid_Base system for pixel-perfect alignment.
 * FIXED: Removed redundant wrapper divs that were breaking the grid flow.
 */
import React, { useCallback, useMemo } from "react";
import withInterfaceControls from './withInterfaceControls';
import { SHAPE_KEYS } from '../../../shared/ParametricConstants';
import { validateAxisSelection } from "../../Parametric/ParametricLogic";
import { getFeaturePath } from "../../../services/ParametricRegistry";

const AXES_LABELS = ['X', 'Y', 'Z'];
const AXES_VECTORS = ['x', 'y', 'z'];

/**
 * Evaluates the CSS classes for axis buttons based on active state.
 * @param {string} vector - 'x', 'y', or 'z'.
 * @param {number} row - Row index.
 * @param {number} col - Column index.
 * @param {Array<Array<string>>} currentVectors - Current 3x3 state matrix.
 * @returns {string} Combined CSS classes.
 */
const evalProjectingButtonClasses = (vector, row, col, currentVectors) => {
  const isActive = currentVectors[row] && currentVectors[row][col] === vector;
  return `IconButton___${vector} IconButton ${isActive ? "IconButton___Vector___Active" : ""}`;
};

/* --- ProjectingControl --- */
const ProjectingControlComponent = (props) => {
  const { parametricObj, handleUpdate, updateControlsRef } = props;
  const statePath = useMemo(() => getFeaturePath("PROJECTING"), []);
  
  // [cite: 2026-01-15] FIX: Read 3x3 grid from state, defaulting to sparse identity
  const vectors = useMemo(() => {
    const raw = parametricObj?.transformationInstructions?.projecting?.vectors;
    // Handle legacy flat array ['x','y','z'] by converting to 3x3 diagonal
    if (Array.isArray(raw) && raw.length === 3 && !Array.isArray(raw[0])) {
      return [
        [raw[0] || '', '', ''],
        ['', raw[1] || '', ''],
        ['', '', raw[2] || '']
      ];
    }
    return raw || [
      ['x', '', ''], 
      ['', 'y', ''], 
      ['', '', 'z']
    ];
  }, [parametricObj]);

  const handleProjectingChange = useCallback((e) => {
    const { vector, row, col } = e.currentTarget.dataset; 
    const r = parseInt(row, 10);
    const c = parseInt(col, 10);
    
    // [cite: 2026-01-15] FIX: Enforce Radio behavior per row (Mutual Exclusivity)
    const nextVectors = vectors.map(arr => [...arr]);
    const isSelected = nextVectors[r][c] === vector;

    // Clear the entire row first to ensure only one selection per output axis
    nextVectors[r] = ['', '', ''];

    // If it wasn't selected before, select it now. If it was, leave it cleared.
    if (!isSelected) nextVectors[r][c] = vector;

    handleUpdate([{ 
      paramToUpdate: "vectors", 
      newValue: nextVectors,
      category: 'project'
    }], { 
      type: 'axis_update',
      activeKey: vector 
    });
  }, [vectors, handleUpdate, statePath]);

  return (
    <>
      <button onClick={updateControlsRef} className="TAreaInterface___TitleButton">
        <h3 className="TAreaInterface___TitleButton_Label">Project</h3>
      </button>
      <div className="TAreaInterface_controlsContainer">
        {/* 🟢 FIXED: Used Unified Grid Class with 3-Column Modifier */}
        <div className="ControlGrid_Base Grid__3Col">
          {AXES_LABELS.map((label, rowIndex) => (
            <React.Fragment key={`axis-row-${label}`}>
              {/* 🟢 VectorLabel is now a direct child of the grid for easy alignment */}
              <label className="VectorLabel">{label}</label>
              {/* Buttons are mapped directly to the grid below the label via CSS */}
              {AXES_VECTORS.map((v, colIndex) => (
                <button
                  key={`${label}-${v}`}
                  data-vector={v}
                  data-row={rowIndex}
                  data-col={colIndex}
                  className={evalProjectingButtonClasses(v, rowIndex, colIndex, vectors)}
                  onClick={handleProjectingChange}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
};

/* --- ShapingControl --- */
const ShapingControlComponent = (props) => {
  const { parametricObj, handleUpdate, updateControlsRef } = props;
  const currentFormula = parametricObj?.transformationInstructions?.shaping?.formula || SHAPE_KEYS.CIRCLE;

  const getBtnClass = (id) => {
    const isActive = currentFormula?.toLowerCase() === id?.toLowerCase();
    const cssId = id === SHAPE_KEYS.SINE ? 'sin' : id.toLowerCase();
    return `IconButton___${cssId} IconButton${isActive ? " IconButton___Active" : ""}`;
  };

  const handleShapingFormulaChange = useCallback((e) => {
    const { shape } = e.currentTarget.dataset;
    if (!shape) return;

    handleUpdate([
      { objectStatePath: "transformationInstructions.shaping", paramToUpdate: "formula", newValue: shape },
      { objectStatePath: "", paramToUpdate: "formulaCode", newValue: null }
    ], { type: 'click', shiftKey: e.shiftKey });
  }, [handleUpdate]);

  return (
    <>
      <button onClick={updateControlsRef} className="TAreaInterface___TitleButton">
        <h3 className="TAreaInterface___TitleButton_Label">Shape</h3>
      </button>
      <div className="TAreaInterface_controlsContainer">
        {/* 🟢 FIXED: Used Unified Grid Class with 2-Column Modifier */}
        <div className="ControlGrid_Base Grid__2Col">
          {Object.values(SHAPE_KEYS)
            .filter(key => key !== 'DIAGNOSTIC' && key !== 'PLANE')
            .map(key => (
              <button
                key={key}
                data-shape={key}
                className={getBtnClass(key)}
                onClick={handleShapingFormulaChange}
                title={key}
              />
            ))}
        </div>
      </div>
    </>
  );
};

export const ProjectingControl = withInterfaceControls(React.memo(ProjectingControlComponent), "project", "TAreaInterface");
export const ShapingControl = withInterfaceControls(React.memo(ShapingControlComponent), "shape", "TAreaInterface");

export default {
    ProjectingControl,
    ShapingControl
};