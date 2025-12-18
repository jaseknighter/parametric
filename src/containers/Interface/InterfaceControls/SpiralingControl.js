import React, { useCallback, useMemo } from "react";
import withInterfaceControls from './withInterfaceControls'

import MySlider from "../../../components/UI/MySlider/MySlider";

import "../../Interface/Interface.css";

// Note: code has been refactored into a functional component to 
//        address depreciated `componentWillReceiveProps`
const SpiralingControl = ((props) => {
  const { parametricObj, handleUpdate, updateControlsRef } = props;

  const shaping = parametricObj?.transformationInstructions?.shaping;
  
  const spiralingUI = useMemo(() => {
    const formula = shaping?.formula;
    return {
      v1SliderClass: `UISliderContainer ${formula !== "sin" ? "UISliderContainer__1" : "UISliderContainer__1_opaque"}`,
      v2SliderClass: `UISliderContainer ${formula !== "cos" ? "UISliderContainer__2" : "UISliderContainer__2_opaque"}`
    };
  }, [shaping?.formula]);
  
  const handleSpiralingChange = useCallback((data, vector) => {
    const spiral = data > 0;
    const statePath = "parametricObj.transformationInstructions.shaping.vectorParams";
    
    const vectorMap = {
      v1: { p: "spiralCosAmt", t: "spiralCos" },
      v2: { p: "spiralSinAmt", t: "spiralSin" }
    };

    const { p: spiralParam, t: paramToUpdate } = vectorMap[vector];

    handleUpdate([
      { objectStatePath: statePath, paramToUpdate, newValue: spiral },
      { objectStatePath: statePath, paramToUpdate: spiralParam, newValue: data }
    ]);
  }, [handleUpdate]);

  // MEMOIZATION: Memoize the complex event handler using useCallback
  const handleSpiraling1Change = useCallback((data) => {
    const val = data[data.length - 1]; 
    handleSpiralingChange(val, "v1");
  }, [handleSpiralingChange]); // Dependencies: parametricObj and handleUpdate (assuming handleUpdate is stable)

  const handleSpiraling2Change = useCallback((data) => {
    const val = data[data.length - 1]; 
    handleSpiralingChange(val, "v2");
  }, [handleSpiralingChange]); // Dependencies: parametricObj and handleUpdate (assuming handleUpdate is stable)

  return (
      <>
        <button
          onClick={updateControlsRef}
          className="TAreaInterface___TitleButton"
        >
          <h3 className="TAreaInterface___TitleButton_Label">Spiral</h3>
        </button>
        <div className="TAreaInterface_controlsContainer">
          <div className={spiralingUI.v1SliderClass}>
            <label className="SliderLabel">1</label>
            <MySlider
              defaultValues={[0]}
              domain={[0, 10]}
              update={handleSpiraling1Change}
            />
          </div>
          <div className={spiralingUI.v2SliderClass}>
            <label className="SliderLabel">2</label>
            <MySlider
              defaultValues={[0]}
              domain={[0, 10]}
              update={handleSpiraling2Change}
            />
          </div>
        </div>
      </>
  );
});

// Use React.memo as the HOC for shallow prop comparison memoization
export default React.memo(withInterfaceControls(SpiralingControl, "spiral", "TAreaInterface"));