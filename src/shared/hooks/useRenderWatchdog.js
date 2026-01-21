/**
 * @fileoverview useRenderWatchdog.js
 * SHARED UTILITY: Monitors component render frequency to detect infinite loops.
 * FIXED: Uses monotonic clock (performance.now) for high-precision timing.
 * [cite: 2026-01-08]
 * * @param {string} componentName - The name of the component to monitor.
 * @param {number} limit - Max allowed renders per second before triggering a warning.
 */

import { useRef, useEffect } from 'react';

export const useRenderWatchdog = (componentName, limit = 20) => {
  const stats = useRef({
    count: 0,
    startTime: performance.now()
  });

  useEffect(() => {
    stats.current.count += 1;
    const now = performance.now();
    const elapsedSeconds = (now - stats.current.startTime) / 1000;

    // Evaluate every 1 second window
    if (elapsedSeconds >= 1.0) {
      if (stats.current.count > limit) {
        console.warn(
          `⚠️ [Watchdog] High render frequency detected in <${componentName} />: ` +
          `${stats.current.count} renders/sec. Threshold is ${limit}.`
        );
      }
      
      // Reset for next window
      stats.current.count = 0;
      stats.current.startTime = now;
    }
  }); // Run on every render
};