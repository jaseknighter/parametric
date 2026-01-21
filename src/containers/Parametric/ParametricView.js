/**
 * @fileoverview ParametricView.js
 * * MAIN VIEW COORDINATOR:
 * FIXED: Integrated shape-change detection to force-reset Manual Override.
 * FIXED: Stabilized HUD against high-frequency renders using useMemo.
 * [cite: 2026-01-12]
 */
import React, { forwardRef, useMemo, useState, useEffect, memo } from "react";
import PropTypes from "prop-types";

// Safety & Utilities
import { assertReadOnly } from "../../utilities/assertDiagnosticsBoundary";

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
      />
    );
  }, [formulaCode, isFormulaValid, isMathematicalError, isManualOverride, onFormulaChange, layoutMode]);

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

  useEffect(() => {
    console.log("[VIEW] ParametricView Props Update", { 
        rid: parametricObj.rid,
        radius: parametricObj.transformationInstructions?.shaping?.radius
    });
  }, [parametricObj]);
  
  // [cite: 2026-01-20] DIAGNOSTIC: Log mount/unmount to detect component destruction during resize.
  useEffect(() => {
    console.log("[VIEW] Mount");
    return () => console.log("[VIEW] Unmount");
  }, []);

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

  return (
    <div className={`Container layout-${layoutMode}`}>
      <header className="Header">
        Parametric Equations 
        {mode && (
          <span className="worker-pill">
            {mode} | {avgLat?.toFixed(1)}ms | {memoryUtilization}% MEM
          </span>
        )}
        {showOverlay && (
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
        )}
      </header>

      <div className="Three_Grid_Area" style={{ gridArea: 'three', position: 'relative' }}>
        <canvas className="Three" id="three" ref={ref} />
        
        <div className="Worker_Status_Indicator">
          <div className={`status-dot ${isBusy ? 'processing' : (status?.toLowerCase() || 'idle')}`} />
          <span>{isBusy ? 'PROCESSING' : (isBooting ? 'BOOTING...' : (status || "IDLE"))}</span>
          {isTesting && <div className="test-pulse">BENCHMARKING...</div>}
        </div>

        {showBreach && (
          <div className="Integrity_Breach_Overlay" data-source="ParametricView">
            <div className="breach-content">
              <h3>🚨 Integrity Breach</h3>
              <p>{error || "Worker thread failure."}</p>
              <button onClick={() => window.location.reload()}>REBOOT SYSTEM</button>
            </div>
          </div>
        )}

        {memoizedHUD}
      </div>

      <div className="Interface_Container">
        {memoizedInterface}
      </div>
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
  onBenchmark: PropTypes.func,
  onIterationChange: PropTypes.func,
  layoutMode: PropTypes.string
};

export default memo(ParametricView);