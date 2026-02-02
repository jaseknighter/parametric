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
  isA11yEnabled, // [cite: 2026-01-27] A11Y: Gate focus logic
  tooltipHandlers, // [cite: 2026-01-27] TOOLTIP: Receive handlers from parent
  hudGuidance, // [cite: 2026-01-27] TOOLTIP: Receive guidance data
  statusGuidance, // [cite: 2026-01-27] TOOLTIP: Receive status guidance
  isMicroNavCollapsed // [cite: 2026-01-28] BOUNDARY: React to nav toggle
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
        width: Math.min(300, window.innerWidth * 0.6), // [cite: 2026-01-20] FIX: Narrower HUD for mobile overlay
        height: (window.innerHeight * 0.5) - 160 // [cite: 2026-02-01] FIX: Shorter HUD on mobile (minus header + buffer)
      }));
    }
  }, [layoutMode]);

  // [cite: 2026-01-28] BOUNDARY GUARD: Ensure HUD stays on screen when opening or resizing
  const enforceBoundaries = useCallback(() => {
    if (containerRef.current) {
      const bounds = containerRef.current.getBoundingClientRect();
      const headerHeight = 60; // [cite: 2026-01-28] FIX: 6rem = 60px (based on 10px root)
      const padding = 20;
      
      // [cite: 2026-01-28] FIX: Use effective height (closed vs open) for boundary calculations
      // 2rem = 20px (based on 10px root)
      const effectiveHeight = isOpen ? size.height : 20; 

      let newY = position.y;
      let newX = position.x;
      let newW = size.width;
      
      // [cite: 2026-01-28] FIX: Allow flush bottom (remove padding)
      let maxY = bounds.height - effectiveHeight;
      let minX = 0;

      // [cite: 2026-01-28] CONSTRAINT: Respect Interface boundaries
      const interfaceEl = document.querySelector('.Interface_Container');
      const canvasEl = document.querySelector('.Three_Grid_Area');

      if (layoutMode === 'desktop') {
        // [cite: 2026-01-28] DESKTOP: Left boundary is Canvas Left (Grey Stripe)
        if (canvasEl) {
          minX = canvasEl.getBoundingClientRect().left;
        }
        // [cite: 2026-01-28] DESKTOP: Bottom boundary is Interface Top
        if (interfaceEl) {
           const iRect = interfaceEl.getBoundingClientRect();
           // Only constrain if interface is actually at the bottom (visible)
           if (iRect.top < bounds.height && iRect.top > headerHeight) {
             maxY = Math.min(maxY, iRect.top - effectiveHeight);
           }
        }
      } else {
        // [cite: 2026-01-28] MOBILE: Left boundary is Interface Right (Grey Stripe)
        if (interfaceEl) {
           const iRect = interfaceEl.getBoundingClientRect();
           minX = iRect.right; // [cite: 2026-01-28] FIX: Flush against grey bar
        }
      }

      // 1. Bottom Guard: If bottom overflows, push up
      if (newY > maxY) {
        newY = Math.max(headerHeight, maxY);
      }
      // 2. Top Guard: Never go above header
      if (newY < headerHeight) {
        newY = headerHeight;
      }
      
      // 3. Right Guard & Width Reduction
      // [cite: 2026-01-28] FIX: Allow flush right (remove padding)
      if (newX + newW > bounds.width) {
         // Push left
         newX = bounds.width - newW;
         
         // If pushed past minX, clamp and shrink
         if (newX < minX) {
           newX = minX;
           newW = bounds.width - minX;
           // Min width check (300 from onResize)
           newW = Math.max(300, newW);
         }
      }

      // 4. Left Guard
      if (newX < minX) {
        newX = minX;
      }

      if (newY !== position.y || newX !== position.x || newW !== size.width) {
        setPosition({ x: newX, y: newY });
        if (newW !== size.width) setSize(prev => ({ ...prev, width: newW }));
      }
    }
  }, [position.x, position.y, size.width, size.height, layoutMode, isMicroNavCollapsed, isOpen]);

  // [cite: 2026-01-28] ANIMATION SYNC: Keep HUD outside expanding nav bar
  const enforceBoundariesRef = useRef(enforceBoundaries);
  useEffect(() => { enforceBoundariesRef.current = enforceBoundaries; }, [enforceBoundaries]);

  useEffect(() => {
    let animationFrameId;
    const startTime = performance.now();
    const duration = 1000; // [cite: 2026-01-28] SYNC: Cover CSS transition (0.3s delay + 0.5s duration)

    const tick = () => {
      if (enforceBoundariesRef.current) enforceBoundariesRef.current();
      if (performance.now() - startTime < duration) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };
    tick();
    return () => { if (animationFrameId) cancelAnimationFrame(animationFrameId); };
  }, [isMicroNavCollapsed]);

  useEffect(() => {
    enforceBoundaries();
  }, [enforceBoundaries]);

  useEffect(() => {
    window.addEventListener('resize', enforceBoundaries);
    return () => window.removeEventListener('resize', enforceBoundaries);
  }, [enforceBoundaries]);

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

    // [cite: 2026-02-01] MOBILE: Reset Zoom on Blur
    // Forces iOS to reset the visual viewport if it was zoomed in during editing
    if (layoutMode === 'mobile') {
      // [cite: 2026-02-01] FIX: Replaced meta-tag hack with scroll nudge per iOS best practices
      setTimeout(() => {
        window.scrollTo({ top: window.scrollY + 1 });
        window.scrollTo({ top: window.scrollY - 1 });
      }, 100);
    }
  };

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const startDrag = (e) => {
    e.preventDefault(); // [cite: 2026-01-14] FIX: Prevent default browser drag/select
    
    // [cite: 2026-02-01] UX: Blur active input to hide keyboard/prevent conflict
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

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
    const headerHeight = 60; // [cite: 2026-01-28] FIX: Match CSS 6rem (60px)
    
    let minX = 0;
    let maxY = bounds.height - h;
    const padding = 20;

    // [cite: 2026-01-28] CONSTRAINT: Respect Interface boundaries during drag
    const interfaceEl = document.querySelector('.Interface_Container');
    const canvasEl = document.querySelector('.Three_Grid_Area');

    if (layoutMode === 'desktop') {
      if (canvasEl) minX = canvasEl.getBoundingClientRect().left;
      if (interfaceEl) {
        const iRect = interfaceEl.getBoundingClientRect();
        if (iRect.top < bounds.height && iRect.top > headerHeight) {
          maxY = Math.min(maxY, iRect.top - h);
        }
      }
    } else {
      if (interfaceEl) {
        minX = interfaceEl.getBoundingClientRect().right; // [cite: 2026-01-28] FIX: Flush against grey bar
      }
    }
    
    // Ensure maxY doesn't go below headerHeight
    maxY = Math.max(headerHeight, maxY);

    setPosition({ 
      x: clamp(e.clientX - dragStartPos.current.x, minX, bounds.width - w), 
      y: clamp(e.clientY - dragStartPos.current.y, headerHeight, maxY) 
    });
  }, [isDragging, layoutMode]);

  const startResize = (e) => {
    e.preventDefault(); // [cite: 2026-01-14] FIX: Prevent native image dragging

    // [cite: 2026-02-01] UX: Blur active input to hide keyboard/prevent conflict
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

    // [cite: 2026-02-01] TEST HOOK: Signal resize attempt for mobile automation
    // test-only visibility: HUD resize is reachable while input is focused
    if (window.__PLAYWRIGHT__) {
      window.__hudResizeAttempted = true;
    }

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
    // [cite: 2026-02-01] FIX: Reset state immediately to prevent "stuck" cursor/mode
    setIsDragging(false);
    setIsResizing(false);

    try {
      if (e.target.releasePointerCapture) e.target.releasePointerCapture(e.pointerId);
    } catch (err) { /* Ignore capture errors if element is gone */ }
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
          // [cite: 2026-01-28] VISUAL: Increased opacity and z-index to sit above Micro-Nav
          zIndex: 200
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
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>FORMULA EDITOR ({activeStatus})</span>
            {/* [cite: 2026-01-27] TOOLTIP: Info Icon moved to Header for better visibility */}
            {layoutMode !== 'mobile' && (
            <div 
              className="HUD_Info_Icon"
              role="button"
              tabIndex={0}
              aria-label="HUD Info"
              style={{ 
                cursor: 'pointer', 
                fontSize: '11px', 
                marginLeft: '8px', 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '14px',
                height: '14px',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                borderRadius: '50%',
                color: 'rgba(255, 255, 255, 0.8)',
                fontFamily: 'serif',
                fontStyle: 'italic'
              }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                tooltipHandlers?.showTooltip({
                  x: rect.right + 10,
                  y: rect.top + rect.height / 2,
                  text: hudGuidance?.proseBehavior || hudGuidance?.tableBehavior,
                  intent: hudGuidance?.intent,
                  placement: 'right'
                });
              }}
              onMouseLeave={tooltipHandlers?.hideTooltip}
              onFocus={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                tooltipHandlers?.showTooltip({
                  x: rect.right + 10,
                  y: rect.top + rect.height / 2,
                  text: hudGuidance?.proseBehavior || hudGuidance?.tableBehavior,
                  intent: hudGuidance?.intent,
                  placement: 'right'
                });
              }}
              onBlur={tooltipHandlers?.handleBlur}
              onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
              onClick={(e) => e.stopPropagation()} // Prevent toggle
            >
              i
            </div>
            )}
          </div>
          <div 
            className={`Status_Dot ${isMathematicalError ? "MathError" : (isFormulaValid ? "Valid" : "Invalid")}`} 
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              tooltipHandlers?.showTooltip({
                x: rect.right + 10,
                y: rect.top + rect.height / 2,
                text: statusGuidance?.proseBehavior || statusGuidance?.tableBehavior,
                intent: statusGuidance?.intent,
                placement: 'right'
              });
            }}
            onMouseLeave={tooltipHandlers?.hideTooltip}
          />
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