/**
 * @fileoverview ParametricView.js
 * * MAIN VIEW COORDINATOR:
 * FIXED: Integrated shape-change detection to force-reset Manual Override.
 * FIXED: Stabilized HUD against high-frequency renders using useMemo.
 * [cite: 2026-01-12]
 */
import React, { forwardRef, useMemo, useState, useEffect, memo, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { isFeatureEnabled } from "../../shared/featureFlagUtils";
import { GUIDANCE_REGISTRY } from "../../shared/GUIDANCE_REGISTRY/GUIDANCE_REGISTRY";

// Safety & Utilities
import { assertReadOnly } from "../../utilities/assertDiagnosticsBoundary";
import MathTooltip from "../../components/Common/MathTooltip";
import { useAdaptiveTooltip } from "../../shared/hooks/useAdaptiveTooltip";
import { useOutsideDismiss } from "../../shared/hooks/useOutsideDismiss";

// Components
import FormulaHUD from "../Interface/HUD/FormulaHUD";
import Interface from "../Interface/Interface";
import DiagnosticsHUD from "../Interface/HUD/DiagnosticsHUD"; 
import "./Parametric.css";

/**
 * ParametricView
 * A forwardRef component encapsulating the Three.js canvas and HUD layers.
 */
const ParametricView = forwardRef((props, ref) => {
  const {
    isDebugEnabled, 
    diagStats,
    hasEverBeenReady,
    isBooting, 
    isReady, 
    isHUDActive, 
    isTesting, 
    testIterations,
    parametricObj, 
    formulaCode,
    comparativeResults, 
    isFormulaValid, 
    isMathematicalError,
    isManualOverride,
    onFormulaChange, 
    onUpdateParametric, 
    onExport, 
    onToggleHUD, 
    onTestToggle,
    onRotate,
    onZoom,
    onBenchmark,
    onIterationChange,
    layoutMode // [cite: 2026-01-20] LAYOUT AUTHORITY
  } = props;

  // --- ️ DATA ISOLATION (The Boundary) ---
  const safeStats = useMemo(() => {
    return assertReadOnly(diagStats, 'HUD_STATS');
  }, [diagStats]);

  const safeConfig = useMemo(() => {
    return assertReadOnly(parametricObj, 'HUD_CONFIG');
  }, [parametricObj]);

  const { status, mode, avgLat, numIndices, isBusy, currentRequestId, error } = safeStats || {};
  const [logs, setLogs] = useState([]);

  // FEATURE_FLAG_START: hudHeaderLowercase
  // MVP Feature Flag: Lowercase Header for Pipeline Verification
  const isLowercaseHeader = isFeatureEnabled('hudHeaderLowercase');
  // [cite: 2026-01-27] FIX: Robust fallback. If 'mode' (Worker Status) is missing, derive from local state.
  const rawMode = mode || (isManualOverride ? "MANUAL" : "AUTO");
  const displayMode = isLowercaseHeader ? rawMode.toLowerCase() : rawMode;
  // FEATURE_FLAG_END: hudHeaderLowercase

  // FEATURE_FLAG_START: mobileHudOptimization
  const isMobileHud = isFeatureEnabled('mobileHudOptimization');
  // FEATURE_FLAG_END: mobileHudOptimization

  // [cite: 2026-01-28] MICRO-NAV: State for mobile collapse/expand
  const [isMicroNavCollapsed, setIsMicroNavCollapsed] = useState(false);
  
  // [cite: 2026-01-28] REFS: For outside click detection
  const interfaceContainerRef = useRef(null);
  const toggleButtonRef = useRef(null);
  const debugPanelRef = useRef(null); // Will attach dynamically if needed or assume ID lookup inside hook if ref not possible

  const handleToggleMicroNav = useCallback(() => {
    setIsMicroNavCollapsed(prev => !prev);
  }, []);

  // [cite: 2026-01-28] MICRO-NAV: Robust Outside Dismissal (Safari Safe)
  useOutsideDismiss({
    enabled: layoutMode === 'mobile' && isMobileHud && !isMicroNavCollapsed,
    // Note: debugPanel is managed outside React, so we can't easily ref it here. 
    // Ideally, FeatureFlagUtils would provide a ref or we accept the ID lookup limitation.
    // For now, we rely on the primary UI elements.
    refs: [interfaceContainerRef, toggleButtonRef],
    onDismiss: () => setIsMicroNavCollapsed(true)
  });

  // FEATURE_FLAG_START: accessibilityHardening
  const isA11y = isFeatureEnabled('accessibilityHardening');
  // FEATURE_FLAG_END: accessibilityHardening

  // FEATURE_FLAG_START: docsBridge
  const isDocsBridge = isFeatureEnabled('docsBridge');
  // FEATURE_FLAG_END: docsBridge

  // [cite: 2026-01-27] TOOLTIP: HUD About Link
  const { tooltip, showTooltip: _showTooltip, hideTooltip, handleMouseMove, handleFocus: _handleFocus, handleBlur } = useAdaptiveTooltip();

  // [cite: 2026-01-30] UX: Disable tooltips in mobile mode until robust dismissal is implemented
  const showTooltip = useCallback((e, content) => {
    if (layoutMode !== 'mobile') _showTooltip(e, content);
  }, [layoutMode, _showTooltip]);

  const handleFocus = useCallback((e, content) => {
    if (layoutMode !== 'mobile') _handleFocus(e, content);
  }, [layoutMode, _handleFocus]);

  const aboutLinkRef = useRef(null);
  // [cite: 2026-01-27] FIX: Ensure fallback content exists so tooltip renders
  const hudGuidance = GUIDANCE_REGISTRY.HUD_TITLE || { 
    intent: "Formula Editor", 
    proseBehavior: "Manual Override. Use formulas to directly control the 3D shape." 
  };
  const aboutGuidance = GUIDANCE_REGISTRY.ABOUT_LANDMARK || {};
  const statusGuidance = GUIDANCE_REGISTRY.STATUS_LANDMARK || {};

  // [cite: 2026-01-27] FIX: Remove native title to prevent browser tooltip collision
  useEffect(() => {
    const link = aboutLinkRef.current;
    if (link && isDocsBridge) {
      link.removeAttribute('title');
    }
  }, [isDocsBridge]);


  // [cite: 2026-01-27] DEBUG: Focus Watcher for A11y
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        setTimeout(() => {
          console.log(`[A11y Debug] Focused Element:`, document.activeElement);
          console.log(`[A11y Debug] Tag: ${document.activeElement.tagName} | Class: ${document.activeElement.className}`);
        }, 0);
      }
    };
    if (isA11y) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isA11y]);

  // [cite: 2026-01-27] A11Y: Global Navigation Shortcuts (Landmark Jumping)
  useEffect(() => {
    const handleJump = (e) => {
      if (!isA11y) return;
      
      // Alt + I -> Jump to Interface (First Button)
      if (e.altKey && e.key.toLowerCase() === 'i') {
        document.querySelector('.TAreaInterface___TitleButton')?.focus();
      }
      // Alt + H -> Jump to HUD Header
      if (e.altKey && e.key.toLowerCase() === 'h') {
        document.querySelector('.HUD_Header')?.focus();
      }
    };
    window.addEventListener('keydown', handleJump);
    return () => window.removeEventListener('keydown', handleJump);
  }, [isA11y]);

  // [cite: 2026-01-27] A11Y: Consolidated Keyboard Controls (Landmarks + Rotation)
  useEffect(() => {
    if (!isA11y) return;

    const handleA11yKeys = (e) => {
      // 1. Landmark Warps (Alt + Key)
      if (e.altKey) {
        const warps = {
          'c': '#three',
          'h': '.HUD_Header',
          'i': '.TAreaInterface___TitleButton'
        };
        const target = warps[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          document.querySelector(target)?.focus();
        }
      }

      // 2. Keyboard Rotation (Only when Canvas is focused)
      if (document.activeElement.id === 'three') {
        const step = 20; // Use fixed step for manual rotation
        const rotationKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        
        if (rotationKeys.includes(e.key)) {
          e.preventDefault();
          let dx = 0, dy = 0;
          if (e.key === 'ArrowLeft')  dx = -step;
          if (e.key === 'ArrowRight') dx = step;
          if (e.key === 'ArrowUp')    dy = -step;
          if (e.key === 'ArrowDown')  dy = step;

          if (onRotate) onRotate(dx, dy);
        }
      
        // 3. Keyboard Zoom (Shift + Arrow)
        if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault();
          const zoomIn = e.key === 'ArrowUp';
          if (onZoom) onZoom(zoomIn ? 1 : -1);
        }
      }
    };

    window.addEventListener('keydown', handleA11yKeys);
    return () => window.removeEventListener('keydown', handleA11yKeys);
  }, [isA11y, onRotate, onZoom]);

  // [cite: 2026-01-30] UX: Force-hide tooltips when mobile nav collapses (Item 2)
  useEffect(() => {
    if (isMicroNavCollapsed) {
      hideTooltip();
    }
  }, [isMicroNavCollapsed, hideTooltip]);

  // [cite: 2026-01-30] UX: Force-hide tooltips on layout switch to mobile (Persistence Guard)
  useEffect(() => {
    if (layoutMode === 'mobile') {
      hideTooltip();
    }
  }, [layoutMode, hideTooltip]);

  // --- 🧊 RENDER STABILIZATION ---
  /**
   * Memoized FormulaHUD
   * Prevents the HUD from re-mounting or re-rendering unless the 
   * actual formula logic or override state changes.
   */
  const memoizedHUD = useMemo(() => {
    return (
      <FormulaHUD 
        handleFormulaChange={onFormulaChange}
        formulaCode={formulaCode ?? ""}
        isFormulaValid={isFormulaValid}
        isMathematicalError={isMathematicalError} 
        isManualOverride={isManualOverride}
        layoutMode={layoutMode} // [cite: 2026-01-20] FIX: Ensure HUD reacts to layout shifts
        displayMode={displayMode} // [cite: 2026-01-27] FIX: Pass feature-flagged display mode
        isA11yEnabled={isA11y} // [cite: 2026-01-27] A11Y: Pass flag for focus management
        tooltipHandlers={{ showTooltip, hideTooltip, handleMouseMove, handleFocus, handleBlur }} // [cite: 2026-01-27] TOOLTIP: Pass handlers
        hudGuidance={hudGuidance}
        statusGuidance={statusGuidance} // [cite: 2026-01-27] TOOLTIP: Pass status guidance
        isMicroNavCollapsed={isMicroNavCollapsed} // [cite: 2026-01-28] BOUNDARY: React to nav toggle
      />
    );
  }, [formulaCode, isFormulaValid, isMathematicalError, isManualOverride, onFormulaChange, layoutMode, displayMode, isA11y, showTooltip, hideTooltip, handleMouseMove, handleFocus, handleBlur, hudGuidance, statusGuidance, isMicroNavCollapsed]);

  /**
   * Memoized Interface
   * Stabilizes the sidebar and sliders.
   */
  const memoizedInterface = useMemo(() => {
    return (
      <Interface 
        handleUpdate={onUpdateParametric} 
        parametricObj={parametricObj} 
        handleExport={onExport} 
        handleAdHocToggle={onToggleHUD}           
        handleAdHoc={onFormulaChange} 
        adHocCode={formulaCode ?? ""} 
        isFormulaValid={isFormulaValid}
        isAdHocActive={isHUDActive} 
        layoutMode={layoutMode}
      />
    );
  }, [onUpdateParametric, parametricObj, parametricObj.transformationInstructions, onExport, onToggleHUD, onFormulaChange, formulaCode, isFormulaValid, isHUDActive, layoutMode]);
  
  /**
   * Log Sync Effect
   * Updates the HUD Event Stream based on Worker Request IDs (RID).
   */
  useEffect(() => {
    if (currentRequestId > 0) {
      const isError = status === 'ERROR';
      const timestamp = new Date().toLocaleTimeString().split(' ')[0];
      
      const newLog = {
        type: isError ? 'error' : 'info',
        rid: currentRequestId,
        timestamp: timestamp,
        message: isError 
          ? `❌ Error at RID ${currentRequestId}: ${error || 'Unknown'}` 
          : `✅ RID ${currentRequestId} resolved (${avgLat?.toFixed(1)}ms)`
      };
      
      setLogs(prev => {
        if (prev.length > 0 && prev[prev.length - 1].rid === currentRequestId && prev[prev.length - 1].type === newLog.type) {
          return prev;
        }
        return [...prev, newLog].slice(-20);
      });
    }
  }, [currentRequestId, status, avgLat, error]);

  /**
   * Memory Utilization Calculation
   */
  const memoryUtilization = useMemo(() => {
    if (!numIndices) return 0;
    const maxCapacity = 1100000; 
    const estimatedVertices = numIndices / 6;
    return Math.min(100, (estimatedVertices / maxCapacity) * 100).toFixed(1);
  }, [numIndices]);

  // [cite: 2026-01-18] FIX: Diagnostics HUD is strictly opt-in via ?debug=true or testing mode
  const showOverlay = isDebugEnabled || isTesting;
  const isSystemHealthy = hasEverBeenReady || status === 'READY' || status === 'STABLE' || isBusy;
  const showBreach = !isSystemHealthy && !!error && !isBooting && status !== 'INIT' && !isBusy;

  // [cite: 2026-01-27] A11Y: Dynamic Canvas Description (Semantic Parallelism)
  const activeShape = parametricObj?.transformationInstructions?.shaping?.formula || "Geometry";
  const canvasLabel = `Interactive 3D ${activeShape}. Use arrow keys to rotate, Shift+Arrows to zoom. Status: ${isMathematicalError ? 'Error' : 'Stable'}.`;
  const vertexCount = numIndices ? (numIndices / 6).toLocaleString() : 0;

  // [cite: 2026-01-27] A11Y: Semantic Parallel Description
  // Provides a "Shadow DOM" textual representation of the 3D state.
  const semanticDescription = (
    <section className="sr-only" aria-live="polite">
      <h2>3D Geometry Narrative</h2>
      <p>The current visualization is a {activeShape}.</p>
      <p>Geometric complexity: {vertexCount} vertices.</p>
      <p>
        {isManualOverride 
          ? "The surface is generated via a custom mathematical formula." 
          : "The surface is controlled via the shaping and projecting presets."}
      </p>
      <p>Mathematical Engine Status: {isMathematicalError ? "Error in current formula" : "Stable and rendering"}.</p>
    </section>
  );

  return (
    <div className={`Container layout-${layoutMode} 
      ${isMobileHud ? 'feature-mobile-hud' : ''} 
      ${isA11y ? 'flag-a11y-on' : ''}
      ${layoutMode === 'mobile' && isMobileHud ? (isMicroNavCollapsed ? 'micro-nav-collapsed' : 'micro-nav-expanded') : ''}
    `}>
      <header className="Header">
        Parametric Equations 
        {/* <span className="worker-pill" aria-live={isA11y ? "polite" : undefined}>
          {mode ? `${displayMode} | ${avgLat?.toFixed(1)}ms | ${memoryUtilization}% MEM` : "System Idle"}
        </span> */}
        {isDocsBridge && (
          <a 
            href={aboutGuidance.link || "https://github.com/jaseknighter/parametric"} 
            ref={aboutLinkRef}
            target="_blank" 
            rel="noopener noreferrer" 
            className="About_Link_Header"
            data-testid="about-link"
            onMouseEnter={(e) => {
              showTooltip(e, { text: aboutGuidance.proseBehavior || aboutGuidance.tableBehavior, intent: aboutGuidance.intent, placement: 'bottom-left' });
            }}
            onMouseLeave={hideTooltip}
            onMouseMove={handleMouseMove}
            onFocus={(e) => {
              handleFocus(e, { text: aboutGuidance.proseBehavior || aboutGuidance.tableBehavior, intent: aboutGuidance.intent, placement: 'bottom-left' });
            }}
            onBlur={handleBlur}
          >
            about
            <span className="external-icon" aria-hidden="true">↗</span>
            <span className="sr-only">(opens in a new window)</span>
          </a>
        )}
        {/* {showOverlay && (
          <DiagnosticsHUD 
            systemState={{ isBusy, currentRequestId }} 
            logs={logs}
            stats={safeStats} 
            config={safeConfig} 
            isTesting={isTesting}
            testIterations={testIterations}
            comparativeResults={comparativeResults}
            onIterationChange={onIterationChange}
            onTestToggle={onTestToggle}
            onBenchmark={onBenchmark}
            onClose={() => onToggleHUD(false)}
          />
        )} */}
      </header>

      <div className="Three_Grid_Area" style={{ gridArea: 'three', position: 'relative' }}>
        <canvas 
          className="Three" 
          id="three" 
          ref={ref} 
          role="application"
          tabIndex={0}
          aria-label={canvasLabel}
        />
        
        {isA11y && semanticDescription}

        {/* <div className="Worker_Status_Indicator">
          <div className={`status-dot ${isBusy ? 'processing' : (status?.toLowerCase() || 'idle')}`} />
          <span>{isBusy ? 'PROCESSING' : (isBooting ? 'BOOTING...' : (status || "IDLE"))}</span>
          {isTesting && <div className="test-pulse">BENCHMARKING...</div>}
        </div> */}

        {showBreach && (
          <div className="Integrity_Breach_Overlay" data-source="ParametricView">
            <div className="breach-content">
              <h3>🚨 Integrity Breach</h3>
              <p>{error || "Worker thread failure."}</p>
              <button onClick={() => window.location.reload()}>REBOOT SYSTEM</button>
            </div>
          </div>
        )}
      </div>

      <div 
        className="Interface_Container"
        ref={interfaceContainerRef}
        // [cite: 2026-01-30] UX: Prevent text selection (Chrome white box) and drag-shifts (Safari)
        style={{ userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'pan-y' }}
        onClick={() => {
          if (layoutMode === 'mobile' && isMobileHud && isMicroNavCollapsed) {
            setIsMicroNavCollapsed(false);
          }
        }}
        onFocus={() => { // [cite: 2026-01-28] FIX: Keep expanded on focus (Safari Tab fix)
          if (layoutMode === 'mobile' && isMobileHud && isMicroNavCollapsed) {
            setIsMicroNavCollapsed(false);
          }
        }}
      >
        {memoizedInterface}
      </div>

      {/* [cite: 2026-01-28] LAYOUT: HUD moved to root to ensure z-index layering above Interface in mobile */}
      {memoizedHUD}

      {/* [cite: 2026-01-28] MICRO-NAV: Toggle Button (Direct child of Container) */}
      {layoutMode === 'mobile' && isMobileHud && (
        <button 
          ref={toggleButtonRef}
          type="button"
          className="MicroNav_Toggle" 
          onClick={handleToggleMicroNav}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggleMicroNav();
            }
          }}
          // [cite: 2026-01-30] LAYOUT: Ensure toggle clears Safari URL bar
          style={{ bottom: 'calc(20px + env(safe-area-inset-bottom))' }}
          aria-label={isMicroNavCollapsed ? "Expand Menu" : "Collapse Menu"}
          aria-expanded={!isMicroNavCollapsed}
          title="Click to access the interface."
        >
          {/* [cite: 2026-01-28] VISUAL: Always show hamburger to prevent "X" flash during fade out */}
          ☰
        </button>
      )}

      {/* [cite: 2026-01-27] TOOLTIP: HUD About Link */}
      <MathTooltip 
        intent={tooltip.intent}
        text={tooltip.text} 
        visible={tooltip.visible} 
        x={tooltip.x} 
        y={tooltip.y} 
        isA11yEnabled={isA11y}
        data-testid="math-tooltip-hud"
        placement={tooltip.placement}
      />
    </div>
  );
});

ParametricView.displayName = "ParametricView";

ParametricView.propTypes = {
  hasEverBeenReady: PropTypes.bool.isRequired,
  isDebugEnabled: PropTypes.bool,
  diagStats: PropTypes.object.isRequired,
  isBooting: PropTypes.bool.isRequired,
  isReady: PropTypes.bool.isRequired,
  isHUDActive: PropTypes.bool,
  isTesting: PropTypes.bool,
  testIterations: PropTypes.number,
  parametricObj: PropTypes.object.isRequired,
  formulaCode: PropTypes.string,
  comparativeResults: PropTypes.array,
  isFormulaValid: PropTypes.bool,
  isMathematicalError: PropTypes.bool,
  isManualOverride: PropTypes.bool,
  onFormulaChange: PropTypes.func.isRequired,
  onUpdateParametric: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  onToggleHUD: PropTypes.func.isRequired,
  onTestToggle: PropTypes.func,
  onRotate: PropTypes.func,
  onZoom: PropTypes.func,
  onBenchmark: PropTypes.func,
  onIterationChange: PropTypes.func,
  layoutMode: PropTypes.string
};

export default memo(ParametricView);