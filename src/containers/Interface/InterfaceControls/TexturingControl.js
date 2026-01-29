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
  const { updateControlsRef, isA11yEnabled, isOpen, sectionId } = props;

  // 🟢 Explicitly define the human-readable labels for the sliders.
  const textureLabels = ['inner', 'outer'];

  return (
    <>
      <button 
        onClick={updateControlsRef} 
        className="TAreaInterface___TitleButton"
        aria-expanded={isA11yEnabled ? isOpen : undefined}
        aria-controls={isA11yEnabled ? sectionId : undefined}
        tabIndex="0" // [cite: 2026-01-28] FIX: Force focusability for Safari
      >
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