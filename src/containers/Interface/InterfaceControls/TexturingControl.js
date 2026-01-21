/**
 * @fileoverview TexturingControl.js
 * FIXED: Overridden labels to "inner" and "outer" for the texture sliders.
 * [cite: 2026-01-09]
 */
import React from "react";
import withInterfaceControls from './withInterfaceControls';
import IntentBasedVectorSlider from '../../../components/UI/MySlider/IntentBasedVectorSlider';

/**
 * TexturingControl handles the radius parameters for textures.
 * Uses custom labels "inner" and "outer" instead of raw data keys.
 */
const TexturingControl = (props) => {
  const { updateControlsRef } = props;

  // 🟢 Explicitly define the human-readable labels for the sliders.
  const textureLabels = ['inner', 'outer'];

  return (
    <>
      <button onClick={updateControlsRef} className="TAreaInterface___TitleButton">
        <h3 className="TAreaInterface___TitleButton_Label">Texture</h3>
      </button>
      <IntentBasedVectorSlider 
        {...props} 
        baseKey="" 
        activeKey="TEXTURE"
        /* 🟢 FIXED: Using the custom labels array here */
        axesLabels={textureLabels} 
      />
    </>
  );
};

// Use withInterfaceControls HOC and export
export default withInterfaceControls(React.memo(TexturingControl), "texture", "TAreaInterface");