import React, { useCallback, useMemo } from "react";
import withInterfaceControls from "./withInterfaceControls";

const ExportControl = ((props) => {
  const { parametricObj, handleUpdate, handleExport, updateControlsRef } = props;
  const handleExportChange = useCallback((e) => {
    handleExport();
  }, [handleExport]);

  // --- Render ---
  return (
    <>
      <button onClick={updateControlsRef} className="TAreaInterface___TitleButton">
        <h3 className="TAreaInterface___TitleButton_Label">Export</h3>
      </button>
      <div className="TAreaInterface_controlsContainer">
          <label className="VectorLabel">.STL</label>
          <button
          id="iconButton___export"
          data-vector="x"
          data-group="1"
          className="IconButton IconButton___export"
          onClick={handleExportChange}
        ></button>

      </div>
    </>
  );
});

// Use React.memo as the HOC for shallow prop comparison memoization
export default React.memo(withInterfaceControls(ExportControl, "export", "TAreaInterface"));