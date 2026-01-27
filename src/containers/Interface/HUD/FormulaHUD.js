/**
 * @fileoverview FormulaHUD.js
 * MAIN FORMULA EDITOR: Authority Management & FSM Sync.
 * [cite: 2026-01-13] FIXED: Added onBlur safety and error state visualization.
 */
import React, { useState, useLayoutEffect, useRef, useEffect, useCallback, memo } from "react";
import "./FormulaHUD.css";
import resizeIcon from "../../../resources/icons/resize_icon.png";

let globalCursorPos = null;

const FormulaHUD = ({ 
  handleFormulaChange, 
  formulaCode, 
  isManualOverride, 
  isFormulaValid, 
  isMathematicalError,
  layoutMode, // [cite: 2026-01-20] FIX: React to layout mode changes
  displayMode, // [cite: 2026-01-27] FIX: Receive feature-flagged display mode
  isA11yEnabled // [cite: 2026-01-27] A11Y: Gate focus logic
}) => {
  const textareaRef = useRef(null);
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const highlighterRef = useRef(null);
  const headerRef = useRef(null); // [cite: 2026-01-27] A11Y: Ref for focus management
  const hasInjectedDefault = useRef(false);
  
  const [isOpen, setIsOpen] = useState(true); // [cite: 2026-01-20] FIX: Default to Open for tests/UX
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [size, setSize] = useState({ width: 450, height: 350 }); 
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false); // [cite: 2026-01-14] Fix: Track movement to prevent toggle on drag end
  const resizeStartDim = useRef({ w: 0, h: 0, x: 0, y: 0 });
  // [cite: 2026-01-14] SOLUTION INTEGRITY: Keep track of prop for blur logic, 
  // but do NOT use it to force DOM updates (Controlled Component Desync fix).
  const lastKnownCode = useRef(formulaCode); 

  const defaultSphere = `x = cos(u * 2 * π) * sin(v * π) * 5;\ny = sin(u * 2 * π) * sin(v * π) * 5;\nz = cos(v * π) * 5;`;

  useEffect(() => {
    if (!formulaCode && !hasInjectedDefault.current) {
      hasInjectedDefault.current = true;
      handleFormulaChange(defaultSphere, { forceSync: true });
    }
  }, [formulaCode, handleFormulaChange]);

  useEffect(() => {
    // Update ref for comparison logic only, do not touch DOM
    lastKnownCode.current = formulaCode;
  }, [formulaCode]);

  // [cite: 2026-01-20] FIX: Resize HUD when switching to mobile to prevent overflow state desync
  useEffect(() => {
    if (layoutMode === 'mobile') {
      setSize(prev => ({
        ...prev,
        width: Math.min(300, window.innerWidth * 0.6) // [cite: 2026-01-20] FIX: Narrower HUD for mobile overlay
      }));
    }
  }, [layoutMode]);

  const handleFocus = () => {
    if (!isManualOverride) {
      // [cite: 2026-01-19] AUTHORITY: Signal start of edit session.
      // Parametric.js must handle this as a Read-Only transition (no shipIntent).
      handleFormulaChange(formulaCode || defaultSphere, { beginEdit: true });
    }
  };

  // Logic to allow exiting manual mode if they click out without changes
  const handleBlur = () => {
    if (isManualOverride && formulaCode === lastKnownCode.current) {
       // Optional: Auto-exit manual if no changes were made
       // handleFormulaChange(null, { exitManual: true });
    }
  };

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const startDrag = (e) => {
    e.preventDefault(); // [cite: 2026-01-14] FIX: Prevent default browser drag/select
    setIsDragging(true);
    if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    hasMoved.current = false;
    dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const onDrag = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;
    const w = wrapperRef.current.offsetWidth;
    hasMoved.current = true;
    const h = wrapperRef.current.offsetHeight;
    const bounds = containerRef.current.getBoundingClientRect();
    setPosition({ 
      x: clamp(e.clientX - dragStartPos.current.x, 0, bounds.width - w), 
      y: clamp(e.clientY - dragStartPos.current.y, 0, bounds.height - h) 
    });
  }, [isDragging]);

  const startResize = (e) => {
    e.preventDefault(); // [cite: 2026-01-14] FIX: Prevent native image dragging
    setIsResizing(true);
    if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    resizeStartDim.current = { w: size.width, h: size.height, x: e.clientX, y: e.clientY };
    e.stopPropagation();
  };

  const onResize = useCallback((e) => {
    if (!isResizing || !containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    setSize({ 
      width: clamp(resizeStartDim.current.w + (e.clientX - resizeStartDim.current.x), 300, bounds.width - position.x), 
      height: clamp(resizeStartDim.current.h + (e.clientY - resizeStartDim.current.y), 150, bounds.height - position.y - 32) 
    });
  }, [isResizing, position]);

  const stopAllActions = (e) => {
    if (e.target.releasePointerCapture) e.target.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("pointermove", isDragging ? onDrag : onResize);
      window.addEventListener("pointerup", stopAllActions);
      window.addEventListener("pointercancel", stopAllActions);
    }
    return () => {
      window.removeEventListener("pointermove", onDrag);
      window.removeEventListener("pointermove", onResize);
      window.removeEventListener("pointerup", stopAllActions);
      window.removeEventListener("pointercancel", stopAllActions);
    };
  }, [isDragging, isResizing, onDrag, onResize]);

  const handleChange = (e) => {
    const { selectionStart, value } = e.target;
    const normalized = value.replace(/\bpi\b/gi, "π");
    
    // [cite: 2026-01-14] Track cursor for useLayoutEffect restoration
    globalCursorPos = selectionStart - (value.length - normalized.length);
    
    // [cite: 2026-01-19] FIX: User typing is an explicit intent update.
    // Do NOT pass beginEdit:true, as that triggers the Read-Only Focus guard in Parametric.js.
    handleFormulaChange(normalized, { userEdit: true });
  };

  // [cite: 2026-01-27] A11Y: Escape hatch for keyboard users
  const handleEditorKeyDown = (e) => {
    if (isA11yEnabled && e.key === 'Escape') {
      headerRef.current?.focus();
    }
  };

  useLayoutEffect(() => {
    if (textareaRef.current && globalCursorPos !== null) {
      textareaRef.current.setSelectionRange(globalCursorPos, globalCursorPos);
      globalCursorPos = null;
    }
  }, [formulaCode]);

  const handleToggle = () => {
    if (!isDragging && !hasMoved.current) setIsOpen(!isOpen);
    hasMoved.current = false;
  };

  // [cite: 2026-01-27] A11Y: Keyboard support for header toggle
  const handleHeaderKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); // Prevent scroll on Space
      handleToggle();
    }
  };

  // [cite: 2026-01-14] Sync scroll for the highlighter background
  const handleScroll = (e) => {
    if (highlighterRef.current) {
      highlighterRef.current.scrollTop = e.target.scrollTop;
      highlighterRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  // PRIORITY: 1. Passed prop from parent, 2. Logic-based fallback
  const activeStatus = displayMode || (isManualOverride ? "MANUAL" : "AUTO");

  return (
    <div className="FormulaHUD_Container" ref={containerRef}>
      <div 
        className={`HUD_Wrapper ${isOpen ? "is-open" : "is-closed"} 
                   ${isManualOverride ? "is-manual" : "is-generated"} 
                   ${isMathematicalError ? "has-error" : ""}
                   ${isDragging ? "dragging" : ""}
                   ${isResizing ? "resizing" : ""}`}
        ref={wrapperRef}
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px)`, 
          width: `${size.width}px`,
          maxWidth: '90vw', // [cite: 2026-01-19] MOBILE: Prevent HUD from overflowing screen width
          backgroundColor: "rgba(198, 137, 137, 0.4)", // Pinkish transparent
        }}
      >
        <div 
          className="HUD_Header" 
          ref={headerRef}
          onPointerDown={startDrag} 
          onClick={handleToggle}
          tabIndex={isA11yEnabled ? 0 : -1} // [cite: 2026-01-27] A11Y: Gate focus to prevent double-tab loop
          role="button"
          aria-expanded={isOpen}
          onKeyDown={handleHeaderKeyDown}
        >
          <span>FORMULA EDITOR ({activeStatus})</span>
          <div className={`Status_Dot ${isMathematicalError ? "MathError" : (isFormulaValid ? "Valid" : "Invalid")}`} />
        </div>
        {isOpen && (
          <div className="HUD_Content_Area" style={{ height: `${size.height}px` }}>
            {/* [cite: 2026-01-14] Highlighter Layer for X/Y/Z Tints */}
            <div className="HUD_Highlighter" ref={highlighterRef}>
              {(formulaCode || "").split('\n').map((line, i) => {
                const tLine = line.trim();
                let tint = "";
                if (tLine.startsWith("x")) tint = "tint-x";
                else if (tLine.startsWith("y")) tint = "tint-y";
                else if (tLine.startsWith("z")) tint = "tint-z";
                return <div key={i} className={tint}>{line || '\u00A0'}</div>;
              })}
            </div>
            <textarea
              ref={textareaRef}
              onScroll={handleScroll}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="HUD_Textarea"
              // [cite: 2026-01-14] AUTHORITY: React handles the sync via the prop.
              value={formulaCode || ""}
              onChange={handleChange}
              onKeyDown={handleEditorKeyDown} // [cite: 2026-01-27] A11Y: Escape hatch
              aria-label={isA11yEnabled ? "Mathematical Formula Editor" : undefined}
              spellCheck="false"
            />
            <img 
              src={resizeIcon} 
              className="HUD_Resize_Handle" 
              onPointerDown={startResize} 
              alt="resize" 
              draggable={false} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(FormulaHUD);