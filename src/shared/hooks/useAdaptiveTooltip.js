/**
 * @fileoverview useAdaptiveTooltip.js
 * UX: Provides "Onboarding Momentum" by showing tooltips immediately for the first few interactions,
 * then shifting to a delay to prevent visual noise during expert usage.
 * [cite: 2026-01-27]
 */
import { useState, useRef, useCallback } from 'react';

// Singleton state for the session
let globalHoverCount = 0;
const HOVER_THRESHOLD = 6;

export const useAdaptiveTooltip = () => {
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, text: "", intent: "", placement: undefined });
  const tooltipTimerRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    // [cite: 2026-01-27] FIX: Extract values synchronously to avoid React Synthetic Event pooling issues
    const { clientX, clientY } = e;
    setTooltip(prev => ({ ...prev, x: clientX, y: clientY }));
  }, []);

  const showTooltip = useCallback((eOrConfig, content = {}) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);

    let x, y, text, intent, placement;

    // [cite: 2026-01-27] FIX: Support both Event and Config Object signatures
    if (eOrConfig && typeof eOrConfig.clientX === 'number') {
      x = eOrConfig.clientX;
      y = eOrConfig.clientY;
      text = content.text || "";
      intent = content.intent || "";
      placement = content.placement;
    } else if (eOrConfig && typeof eOrConfig.x === 'number') {
      x = eOrConfig.x;
      y = eOrConfig.y;
      text = eOrConfig.text || "";
      intent = eOrConfig.intent || "";
      placement = eOrConfig.placement;
    }

    // [cite: 2026-01-27] UX: Adaptive Delay
    // Warm-up: 0ms for first N hovers. Expert: 1000ms thereafter.
    const delay = globalHoverCount < HOVER_THRESHOLD ? 0 : 1000;

    tooltipTimerRef.current = setTimeout(() => {
      setTooltip(prev => ({ 
        ...prev, 
        visible: true, 
        ...(x !== undefined && { x, y }), text, intent, placement }));
      
      // Increment global counter if we haven't reached threshold
      if (globalHoverCount < HOVER_THRESHOLD) {
        globalHoverCount++;
      }
    }, delay);
  }, []);

  const hideTooltip = useCallback(() => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  const handleFocus = useCallback((e, content = {}) => {
    const rect = e.target.getBoundingClientRect();
    // [cite: 2026-01-27] UX: Delegate to showTooltip to enforce adaptive delay on focus too
    showTooltip({
      x: rect.right,
      y: rect.top,
      text: content.text,
      intent: content.intent,
      placement: content.placement
    });
  }, [showTooltip]);

  const handleBlur = hideTooltip;

  return { tooltip, showTooltip, hideTooltip, handleMouseMove, handleFocus, handleBlur };
};