/**
 * @fileoverview DiagnosticsHUD.js
 * FLAT/MUTED HEADER DOCK - Heartbeat Update
 * [cite: 2026-01-12]
 */
import React, { useState, useMemo, useEffect } from 'react';
import { intentService } from '../../../services/ParametricIntentService';

const DiagnosticsHUD = ({ logs = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tick, setTick] = useState(0);

  /**
   * 💓 HEARTBEAT POLLING
   * Forces a re-check every 2 seconds to catch manual console changes.
   */
  useEffect(() => {
    const heartbeat = setInterval(() => {
      setTick(t => t + 1);
    }, 2000);
    return () => clearInterval(heartbeat);
  }, []);

  /**
   * 📡 BROADCAST LISTENER
   * Forces a re-render on service-driven updates.
   */
  useEffect(() => {
    const handleUpdate = () => setTick(t => t + 1);
    window.addEventListener('parametric-intent-update', handleUpdate);
    return () => window.removeEventListener('parametric-intent-update', handleUpdate);
  }, []);
  
  /**
   * 🛡️ SAFE SMOKE TEST
   */
  const smokeResults = useMemo(() => {
    if (intentService && typeof intentService.performInternalSmokeTest === 'function') {
      return intentService.performInternalSmokeTest();
    }
    return { success: false, errors: ['SYSTEM INITIALIZING...'] };
  }, [logs.length, tick]); 

  /**
   * 📢 LOG INJECTION
  // [cite: 2026-01-13] Stability: Only trigger breach warning after initial boot warmup (tick > 2)
   */
  useEffect(() => {
    if (!smokeResults.success && smokeResults.errors.length > 0 && tick > 2) {
      const timestamp = new Date().toLocaleTimeString();
      console.warn(`🚨 [Smoke Test Breach] @ ${timestamp}:`, smokeResults.errors);
    }
  }, [smokeResults.success, tick]);

  const COLORS = {
    pass: '#7ea38f', 
    fail: '#a37e7e', 
    bg: '#121212',   
    text: '#aaaaaa'  
  };

  const activeColor = smokeResults.success ? COLORS.pass : COLORS.fail;

  return (
    <div className="Header_Diagnostics" style={{ 
      position: 'relative', 
      display: 'flex', 
      alignItems: 'center',
      top: '-10px'
    }}>
      
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          padding: '4px 12px',
          margin: '0 8px',
          backgroundColor: 'rgba(0, 0, 0, 0.4)', 
          borderRadius: '4px',
          border: '1px solid #2a2a2a',
          height: '24px',
          transition: 'background-color 0.2s'
        }}
      >
        <div style={{
          width: '8px',
          height: '8px',
          backgroundColor: activeColor,
          marginRight: '8px',
          transition: 'background-color 0.3s ease'
        }} />

        <span style={{ 
          fontSize: '10px', 
          letterSpacing: '0.08rem', 
          color: COLORS.text, 
          textTransform: 'uppercase',
          fontWeight: 600
        }}>
          System
        </span>
      </div>

      {isExpanded && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: '8px',
          width: '240px',
          backgroundColor: COLORS.bg,
          padding: '12px',
          border: '1px solid #333',
          zIndex: 2000,
          // boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}>
          <h2 style={{ color: activeColor, fontSize: '9px', margin: '0 0 8px 0', letterSpacing: '0.1rem' }}>
            {smokeResults.success ? 'INTEGRITY: NOMINAL' : 'INTEGRITY: BREACH'}
          </h2>
          
          {!smokeResults.success && (
            <div style={{ padding: '8px', background: '#1a1a1a', marginBottom: '8px', borderLeft: `2px solid ${COLORS.fail}` }}>
              {smokeResults.errors.map((err, i) => (
                <div key={i} style={{ color: COLORS.fail, fontSize: '9px', textTransform: 'uppercase' }}>
                  • {err}
                </div>
              ))}
            </div>
          )}

          <div style={{ height: '60px', overflowY: 'auto', background: '#080808', fontSize: '9px', padding: '6px', color: '#666' }}>
            {logs.slice(-3).map((l, i) => (
              <div key={i} style={{ marginBottom: '2px', borderBottom: '1px solid #1a1a1a' }}>
                [{l.timestamp}] {l.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagnosticsHUD;