import React, { useState, useRef, useEffect, useCallback } from "react";

const withInterfaceControls = (WrappedComponent, controlID, controlClass) => {
  return (props) => {
    const { 
      numberOfColumns, 
      collapse, 
      onOpen, 
      onClose, 
      adjustYAmt, 
      showMobile, 
      parametricObj, 
      handleUpdate 
    } = props;

    const [isOpen, setIsOpen] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const controlsRef = useRef(null);

    // Dynamic Class Names derived from props
    const openClass = `Controls___Container_${numberOfColumns}column_Open`;
    const closeClass = `Controls___Container_${numberOfColumns}column_Close`;

    // --- Animation: Open ---
    const openControlAnim = (timeout, cRef, interfaceEl) => {
      cRef.classList.remove(openClass);
      cRef.classList.add(openClass);
      interfaceEl.classList.remove("Controls_Show");
      cRef.classList.remove(closeClass);
      
      setIsTransitioning(true);

      setTimeout(() => {
        interfaceEl.classList.remove("Controls_Hide");
        cRef.classList.remove(closeClass);
        interfaceEl.classList.add("Controls_Show");
        
        // Apply dynamic styles
        interfaceEl.style.transform = `translateY(${-1 * adjustYAmt}px)`;
        
        if (showMobile) {
          if (adjustYAmt < 0) {
            Object.assign(interfaceEl.style, { borderTopStyle: "solid", borderLeft: "none", borderBottom: "none" });
          } else {
            Object.assign(interfaceEl.style, { borderStyle: "solid", borderLeft: "none", borderTop: "none" });
          }
        } else {
          Object.assign(interfaceEl.style, { borderRightStyle: "none", borderLeftStyle: "none", borderBottomStyle: "none", borderTopStyle: "none" });
        }

        const gridCols = numberOfColumns === 1 ? "0" : numberOfColumns === 2 ? "5rem 5rem" : "5rem 5rem 5rem";
        interfaceEl.style.gridTemplateColumns = gridCols;

        setIsOpen(true);
        setIsTransitioning(false);
      }, timeout);
    };

    // --- Animation: Close ---
    const closeControlAnim = (timeout, cRef, interfaceEl) => {
      interfaceEl.classList.add("Controls_Hide");
      setIsTransitioning(true);

      setTimeout(() => {
        cRef.classList.add(closeClass);
        interfaceEl.classList.remove("Controls_Show");
        cRef.classList.remove(openClass);

        setTimeout(() => {
          cRef.classList.remove(closeClass);
          setIsOpen(false);
          setIsTransitioning(false);
        }, timeout);
      }, timeout);
    };

    // --- Toggle Logic ---
    const updateControlsRef = useCallback(() => {
      if (isTransitioning) return;

      const cRef = controlsRef.current;
      const interfaceEl = cRef?.querySelector(".TAreaInterface_controlsContainer");
      const buttonEl = cRef?.querySelector(".TAreaInterface___TitleButton");

      if (!isOpen) {
        onOpen?.(controlID);
        openControlAnim(250, cRef, interfaceEl, buttonEl);
      } else {
        onClose?.(controlID);
        closeControlAnim(250, cRef, interfaceEl, buttonEl);
      }
    }, [isOpen, isTransitioning, numberOfColumns, adjustYAmt, showMobile, onOpen, onClose]);

    // --- Effect: Handle Collapse Prop ---
    useEffect(() => {
      if (collapse && isOpen && !isTransitioning) {
        updateControlsRef();
      }
    }, [collapse, isOpen, isTransitioning, updateControlsRef]);

    return (
      <div id={controlID} className={controlClass} ref={controlsRef}>
        <WrappedComponent
          {...props}
          updateControlsRef={updateControlsRef}
          parametricObj={parametricObj}
          handleUpdate={handleUpdate}
        />
      </div>
    );
  };
};

export default withInterfaceControls;