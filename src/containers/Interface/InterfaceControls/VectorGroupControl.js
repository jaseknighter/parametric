/**
 * @fileoverview VectorGroupControl.js
 * FIXED: Explicitly passes 'X, Y, Z' axes to IntentBasedVectorSlider.
 * This satisfies the contract that withInterfaceControls cannot fulfill.
 */
import React from "react";
import withInterfaceControls from './withInterfaceControls';
import IntentBasedVectorSlider from '../../../components/UI/MySlider/IntentBasedVectorSlider';

const VectorGroupControl = (props) => {
  const { title, updateControlsRef } = props;
  
  return (
    <>
      <button onClick={updateControlsRef} className="TAreaInterface___TitleButton">
        <h3 className="TAreaInterface___TitleButton_Label">{title}</h3>
      </button>
      <IntentBasedVectorSlider 
        {...props} 
        // 🟢 CAUSAL FIX: Explicitly define dimensionality
        axesLabels={['X', 'Y', 'Z']} 
      />
    </>
  );
};

export default withInterfaceControls(React.memo(VectorGroupControl), "vector-fallback", "TAreaInterface");