import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ShapingControl from "./InterfaceControls/ShapingControl";
import ProjectingControl from "./InterfaceControls/ProjectingControl";
import FlatteningControl from "./InterfaceControls/FlatteningControl";
import SpiralingControl from "./InterfaceControls/SpiralingControl";
import BendingControl from "./InterfaceControls/BendingControl";
import ModulatingControl from "./InterfaceControls/ModulatingControl";
import TexturingControl from "./InterfaceControls/TexturingControl";
import ExportControl from "./InterfaceControls/ExportControl";

import "./Interface.css";

// --- Configuration ---
const UI_CONFIG = {
  columnBaseWidth: 150,
  pixelsPerColumn: 6,
  mobileBreakpoint: 500,
  controlColumns: {
    shape: 3,
    project: 2,
    bend: 2,
    texture: 1,
    spiral: 2,
    flatten: 3,
    modulate: 1,
    export: 1,
  },
};
// Move this outside to prevent recreation on every render
const CONTROL_LIST = [
  { id: "shape", Component: ShapingControl },
  { id: "project", Component: ProjectingControl },
  { id: "bend", Component: BendingControl },
  { id: "texture", Component: TexturingControl },
  { id: "spiral", Component: SpiralingControl },
  { id: "modulate", Component: ModulatingControl },
  { id: "flatten", Component: FlatteningControl },
  { id: "export", Component: ExportControl },
];

const Interface = ({ parametricObj, handleUpdate, handleExport }) => {
  const interfaceRef = useRef(null);
  const controlRefs = useRef({}); 

  const [openInterfaces, setOpenInterfaces] = useState([]);
  const [showMobile, setShowMobile] = useState(window.innerWidth <= UI_CONFIG.mobileBreakpoint);
  const [controlAdjustments, setControlAdjustments] = useState({});

  // OPTIMIZATION: Memoize the mapping logic to prevent recalculating layout constants
  const layoutConstants = useMemo(() => {
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 10;
    return {
      rootFontSize,
      newControlHeight: rootFontSize * 13,
      labelHeight: rootFontSize * 4,
    };
  }, []);

  const calculateLayout = useCallback((controlOpened = null) => {
    if (!interfaceRef.current) return;

    const isMobileNow = window.innerWidth <= UI_CONFIG.mobileBreakpoint;
    
    // 1. Only update showMobile if it actually changes
    setShowMobile(prev => {
      if (isMobileNow !== prev) {
        setOpenInterfaces([]);
        setControlAdjustments({});
        return isMobileNow;
      }
      return prev;
    });

    if (controlOpened) {
      const targetEl = controlRefs.current[controlOpened];
      if (!targetEl) return;

      const isBelowFold = (targetEl.offsetTop + layoutConstants.newControlHeight) > interfaceRef.current.clientHeight;

      let adjustYAmt = isMobileNow 
        ? (isBelowFold ? (layoutConstants.newControlHeight - layoutConstants.labelHeight) : (layoutConstants.rootFontSize * -2))
        : 0;

      setControlAdjustments(prev => ({
        ...prev,
        [`${controlOpened}AdjustYAmt`]: Math.floor(adjustYAmt),
        [`${controlOpened}AdjustY`]: true,
      }));

      setOpenInterfaces(prev => {
        if (isMobileNow) return [controlOpened];
        return prev.includes(controlOpened) ? prev : [...prev, controlOpened];
      });
    }
  }, [layoutConstants]);

  // OPTIMIZATION: Strict ResizeObserver
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const isMobileNow = window.innerWidth <= UI_CONFIG.mobileBreakpoint;
      // Only fire layout calculation if the breakpoint is crossed
      if (isMobileNow !== showMobile) {
        window.requestAnimationFrame(() => calculateLayout());
      }
    });

    if (interfaceRef.current) observer.observe(interfaceRef.current);
    return () => observer.disconnect();
  }, [calculateLayout, showMobile]);

  const onOpenHandler = useCallback((id) => calculateLayout(id), [calculateLayout]);
  const onCloseHandler = useCallback((id) => {
    setOpenInterfaces(prev => prev.filter(item => item !== id));
  }, []);

  return (
    <div className="Interface" ref={interfaceRef}>
      {CONTROL_LIST.map(({ id, Component }) => (
        <div key={id} ref={el => (controlRefs.current[id] = el)}>
          <Component
            showMobile={showMobile}
            numberOfColumns={UI_CONFIG.controlColumns[id]}
            collapse={!openInterfaces.includes(id)}
            adjustY={!!controlAdjustments[`${id}AdjustY`]}
            adjustYAmt={controlAdjustments[`${id}AdjustYAmt`] || 0}
            onOpen={onOpenHandler}
            onClose={onCloseHandler}
            handleUpdate={handleUpdate}
            handleExport={handleExport}
            parametricObj={parametricObj}
          />
        </div>
      ))}
    </div>
  );
};

export default React.memo(Interface);