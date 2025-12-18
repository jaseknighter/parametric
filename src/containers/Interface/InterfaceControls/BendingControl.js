import React, { useCallback, useMemo } from "react";
import withInterfaceControls from './withInterfaceControls'
import MySlider from "../../../components/UI/MySlider/MySlider";

import "../../Interface/Interface.css";

// Note: code has been refactored into a functional component to 
//        address depreciated `componentWillReceiveProps`
const BendingControl = ((props) => {
  const { parametricObj, handleUpdate, updateControlsRef } = props;
  
  // MEMOIZATION
  // This calculation only runs if `parametricObj` has changed, preventing re-calculation
  // when other props (like `updateControlsRef`) change.
  const bendingUI = useMemo(() => {
    const shape = parametricObj.transformationInstructions.shaping.formula;
    const sliderClasses = {
      v1SliderClass:
      "UISliderContainer " +
      (shape !== "sin" ? "UISliderContainer__1" : "UISliderContainer__1_opaque"),
      v2SliderClass:
      "UISliderContainer " +
      (shape !== "cos" ? "UISliderContainer__2" : "UISliderContainer__2_opaque")
    };
    return sliderClasses;

  }, [parametricObj.transformationInstructions.shaping.formula]); // Dependency: recalculate only when shaping formula changes

  // MEMOIZATION: Memoize the complex event handler using useCallback
  const handleBending1Change = useCallback((data) => {
    handleBendingChange(data.pop(), "v1");
  }, [handleUpdate]); // Dependencies: parametricObj and handleUpdate (assuming handleUpdate is stable)

  const handleBending2Change = useCallback((data) => {
    handleBendingChange(data.pop(), "v2");
  }, [handleUpdate]); // Dependencies: parametricObj and handleUpdate (assuming handleUpdate is stable)

  const handleBendingChange = useCallback((data,vector) => {
    
    //////////////////////////////////////////////////////
    //TODO: bend should only turn to false if all vectors are < 1
    //////////////////////////////////////////////////////
    const bend = data > 0 ? true : false;
    
    let bendParam = "";
    let paramToUpdate = "";
    switch (vector) {
      case "v1":
        bendParam = "bendCosAmt";
        paramToUpdate = "bendCos"
        break;
      case "v2":
        bendParam = "bendSinAmt";
        paramToUpdate = "bendSin"
        break;
      default:
        return;
    }

    //TODO: Fix bug where bendz only works if project1/project2 values are set
    const statePath = "parametricObj.transformationInstructions.shaping.vectorParams" ;

    const updateArray = [
      {
        objectStatePath: statePath,
        paramToUpdate: paramToUpdate,
        newValue: bend
      },
      { objectStatePath: statePath, paramToUpdate: bendParam, newValue: data }
    ];

    handleUpdate(updateArray);
  }, [handleUpdate]); // Dependency on handleUpdate (assuming it is stable)

  return (
    <>
      <button
        onClick={updateControlsRef}
        className="TAreaInterface___TitleButton"
      >
        <h3 className="TAreaInterface___TitleButton_Label">Bend</h3>
      </button>
      <div className="TAreaInterface_controlsContainer">
        <div className={bendingUI.v1SliderClass}>
          <label className="SliderLabel">1</label>
          <MySlider
            defaultValues={[0]}
            domain={[0, 15]}
            update={handleBending1Change}
          />
        </div>
        <div className={bendingUI.v2SliderClass}>
          <label className="SliderLabel">2</label>
          <MySlider
            defaultValues={[0]}
            domain={[0, 15]}
            update={handleBending2Change}
          />
        </div>
      </div>
    </>
  );
});

// Use React.memo as the HOC for shallow prop comparison memoization
export default React.memo(withInterfaceControls(BendingControl, "bend", "TAreaInterface"));