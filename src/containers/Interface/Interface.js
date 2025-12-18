import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ShapingControl from "./InterfaceControls/ShapingControl";
import ProjectingControl from "./InterfaceControls/ProjectingControl";
import FlatteningControl from "./InterfaceControls/FlatteningControl";
import SpiralingControl from "./InterfaceControls/SpiralingControl";
import BendingControl from "./InterfaceControls/BendingControl";
import ModulatingControl from "./InterfaceControls/ModulatingControl";
import TexturingControl from "./InterfaceControls/TexturingControl";

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
  },
};

const Interface = ({ parametricObj, handleUpdate }) => {
  const interfaceRef = useRef(null);
  const controlRefs = useRef({}); // Stores DOM nodes for each control

  // --- State ---
  const [openInterfaces, setOpenInterfaces] = useState([]);
  const [showMobile, setShowMobile] = useState(false);
  const [controlAdjustments, setControlAdjustments] = useState({});

  // --- Layout Calculation Engine ---
  const calculateLayout = useCallback((controlOpened = null) => {
    if (!interfaceRef.current) return;

    // 1. Get the current physical state of the window RIGHT NOW
    const isMobileNow = window.innerHeight <= UI_CONFIG.mobileBreakpoint || window.innerWidth <= UI_CONFIG.mobileBreakpoint;
    
    // 2. We use a functional update to compare against the previous showMobile state
    setShowMobile(prevShowMobile => {
      if (isMobileNow !== prevShowMobile) {        
        // Create an object where every currently open interface is explicitly collapsed
        const resetAdjustments = {};
        openInterfaces.forEach(id => {
          resetAdjustments[`${id}Collapse`] = true;
        });

        setControlAdjustments(resetAdjustments); // Explicitly tell them to close
        setOpenInterfaces([]); // Then clear the tracking list
        
        return isMobileNow;
      }
      return prevShowMobile;
    });

    // 3. Update Font Size (Safety check even if layout didn't change)
    const htmlEl = document.documentElement;
    htmlEl.style.fontSize = isMobileNow ? "8px" : "10px";

    // 4. Only proceed with button logic if a button was clicked 
    // AND we didn't just reset the layout
    if (controlOpened) {
      const container = interfaceRef.current;
      const { clientWidth: interfaceWidth, clientHeight: interfaceHeight } = container;
      const targetEl = controlRefs.current[controlOpened];
      if (!targetEl) return;

      const rootEl = document.getElementById("root") || document.body;
      const rootFontSize = parseFloat(window.getComputedStyle(rootEl).fontSize);
      const headerHeight = document.getElementById("header")?.offsetHeight || 0;

      const currentTotalWidth = Object.values(controlRefs.current)
        .reduce((acc, el) => acc + (el?.offsetWidth || 0), 0);

      const numCols = UI_CONFIG.controlColumns[controlOpened];
      const newControlWidth = numCols * UI_CONFIG.pixelsPerColumn + UI_CONFIG.columnBaseWidth;
      const newControlHeight = rootFontSize * 13;
      const labelHeight = rootFontSize * 4;

      const isTooWide = (currentTotalWidth + newControlWidth) >= interfaceWidth;
      const forceCollapse = (isMobileNow && openInterfaces.length > 0) || isTooWide;

      const openingControlYLocation = targetEl.offsetTop;
      const isBelowFold = (openingControlYLocation + newControlHeight - headerHeight) > interfaceHeight;

      let adjustYAmt = 0;
      if (isMobileNow) {
        adjustYAmt = isBelowFold ? (newControlHeight - labelHeight) : (rootFontSize * -2);
      }

      setControlAdjustments(prev => {
        const next = { ...prev };
        if (isMobileNow) {
          openInterfaces.forEach(id => {
            if (id !== controlOpened) next[`${id}Collapse`] = true;
          });
        } else if (forceCollapse && openInterfaces.length > 0) {
          const firstOpened = openInterfaces[0];
          next[`${firstOpened}Collapse`] = true;
        }
        next[`${controlOpened}Collapse`] = false; 
        next[`${controlOpened}AdjustY`] = true;
        next[`${controlOpened}AdjustYAmt`] = Math.floor(adjustYAmt);
        return next;
      });

      setOpenInterfaces(prev => {
        if (isMobileNow) return [controlOpened];
        return prev.includes(controlOpened) ? prev : [...prev, controlOpened];
      });
    }
  }, [openInterfaces]); // Removed showMobile from deps because we use functional setter
  // --- Effects ---
  // 1. ResizeObserver for Container-aware layout
  useEffect(() => {
    if (!interfaceRef.current) return;

    const observer = new ResizeObserver((entries) => {
      // Wrap the call in requestAnimationFrame to prevent 
      // "ResizeObserver loop completed with undelivered notifications"
      window.requestAnimationFrame(() => {
        if (!Array.isArray(entries) || !entries.length) return;
        calculateLayout();
      });
    });

    observer.observe(interfaceRef.current);
    return () => observer.disconnect();
  }, [calculateLayout]);

  // --- Handlers ---
  const onOpenHandler = useCallback((id) => calculateLayout(id), [calculateLayout]);

  const onCloseHandler = useCallback((id) => {
    setOpenInterfaces(prev => prev.filter(item => item !== id));
    setControlAdjustments(prev => {
      const next = { ...prev };
      next[`${id}Collapse`] = false;
      next[`${id}AdjustY`] = false;
      next[`${id}AdjustYAmt`] = 0;
      return next;
    });
  }, []);

  // --- Helper for Prop Injection ---
  const getControlProps = (id) => {
    // If the layout just reset, we want to force 'collapse' to true 
    // for any menu that WAS in the openInterfaces list.
    const isClosing = controlAdjustments[`${id}Collapse`] === true;
    
    return {
      showMobile,
      numberOfColumns: UI_CONFIG.controlColumns[id],
      // FORCE collapse to true if the layout was just wiped 
      // or if it was explicitly set to true.
      collapse: isClosing, 
      adjustY: !!controlAdjustments[`${id}AdjustY`],
      adjustYAmt: controlAdjustments[`${id}AdjustYAmt`] || 0,
      onOpen: onOpenHandler,
      onClose: onCloseHandler,
      handleUpdate,
      parametricObj,
    };
  };

  return (
    <div className="Interface" ref={interfaceRef}>
      <div id="shape" ref={el => (controlRefs.current.shape = el)}>
        <ShapingControl {...getControlProps("shape")} />
      </div>
      
      <div id="project" ref={el => (controlRefs.current.project = el)}>
        <ProjectingControl {...getControlProps("project")} />
      </div>

      <div id="bend" ref={el => (controlRefs.current.bend = el)}>
        <BendingControl {...getControlProps("bend")} />
      </div>

      <div id="texture" ref={el => (controlRefs.current.texture = el)}>
        <TexturingControl {...getControlProps("texture")} />
      </div>

      <div id="spiral" ref={el => (controlRefs.current.spiral = el)}>
        <SpiralingControl {...getControlProps("spiral")} />
      </div>

      <div id="flatten" ref={el => (controlRefs.current.flatten = el)}>
        <FlatteningControl {...getControlProps("flatten")} />
      </div>

      <div id="modulate" ref={el => (controlRefs.current.modulate = el)}>
        <ModulatingControl {...getControlProps("modulate")} />
      </div>
    </div>
  );
};

export default React.memo(Interface);