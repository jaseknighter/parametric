import React, { useCallback, useMemo } from "react";
import withInterfaceControls from "./withInterfaceControls";

const Export3dControl = ((props) => {
  const { parametricObj, handleUpdate, handleExport, updateControlsRef, isA11yEnabled, isOpen, sectionId } = props;
  const handleExportChange = useCallback((e) => {
    handleExport();
  }, [handleExport]);

  // --- Render ---
  return (
    <>
      <button 
        onClick={updateControlsRef} 
        className="TAreaInterface___TitleButton"
        aria-expanded={isA11yEnabled ? isOpen : undefined}
        aria-controls={isA11yEnabled ? sectionId : undefined}
        tabIndex="0" // [cite: 2026-01-28] FIX: Force focusability for Safari
      >
        <h3 className="TAreaInterface___TitleButton_Label">Export</h3>
      </button>
      <div 
        id={sectionId}
        className="TAreaInterface_controlsContainer"
        style={isA11yEnabled ? { display: isOpen ? 'grid' : 'none', visibility: isOpen ? 'visible' : 'hidden' } : undefined} // [cite: 2026-01-27] A11Y: Remove from tab order when closed
        aria-hidden={isA11yEnabled ? !isOpen : undefined}
        role={isA11yEnabled ? "region" : undefined}
      >
        <label className="VectorLabel">.STL</label>
        <button
          id="iconButton___export"
          data-vector="x"
          data-group="1"
          className="IconButton IconButton___export"
          onClick={handleExportChange}
          aria-label={isA11yEnabled ? "Export geometry to STL file" : undefined}
          title={isA11yEnabled ? "Export STL" : undefined}
        >
          {isA11yEnabled && <span className="sr-only">Export STL</span>}
        </button>
      </div>
    </>
  );
});

// Use React.memo as the HOC for shallow prop comparison memoization
export default React.memo(withInterfaceControls(Export3dControl, "export3d", "TAreaInterface"));