/**
 * @fileoverview index.js
 * ENTRY POINT: Migrated to Vite.
 * Removed CRA serviceWorker to prevent bundling conflicts.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { Debug } from './utilities/debug.js';
import { FeatureFlags } from './shared/featureFlagUtils.js';

// [cite: 2026-01-24] OBSERVABILITY: Initialize Debug Utility
// Enables specific channels only when ?debug=true is present in the URL.
const isDebug = window.location.search.includes('debug=true');

// [cite: 2026-01-24] NOISE CONTROL: Suppress known Three.js warnings unless debugging
if (!isDebug) {
  const originalError = console.error;
  console.error = (...args) => {
    if (args.length > 0) {
      const shouldSuppress = args.some(arg => {
        if (typeof arg === 'string') {
          return arg.includes('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN') ||
                 arg.includes('Testing error channel');
        }
        if (arg && typeof arg === 'object' && arg.message) {
          return arg.message.includes('Testing error channel');
        }
        return false;
      });
      if (shouldSuppress) return;
    }
    originalError.apply(console, args);
  };

  // [cite: 2026-01-30] NOISE CONTROL: Suppress Debug utility initialization logs
  const originalLog = console.log;
  console.log = (...args) => {
    if (args.length > 0) {
      const shouldSuppress = args.some(arg => typeof arg === 'string' && (
        arg.includes('Debug Configured:') || 
        arg.includes('Tip: Run Debug.listFlags()') || 
        arg.includes('Forced Log')
      ));
      if (shouldSuppress) return;
    }
    originalLog.apply(console, args);
  };
}

// [cite: 2026-01-25] GATE: Signal coverage capability to test runner
if (import.meta.env.VITE_COVERAGE === 'true') {
  window.__COVERAGE_ENABLED__ = true;
  // [cite: 2026-01-25] HARDENING: Warn if instrumentation failed to inject
  if (typeof window.__coverage__ === 'undefined') {
    console.warn('[Coverage] Enabled but __coverage__ not yet present at entry');
  }
}
// Signal that the app has finished module evaluation
window.__PARAMETRIC_READY__ = true;

Debug.init({
  enabled: isDebug,
  channels: isDebug ? ['WATCHDOG', 'INTENT', 'WORKER', 'AUDIT'] : []
});

// [cite: 2026-01-25] NAMESPACE: Expose Debug on a unique key to avoid browser collisions
window.__ParametricDebug__ = Debug;

// [cite: 2026-01-27] DX: Auto-open Feature Flags panel if sticky param is present
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('showFlags') === 'true') {
  FeatureFlags.listFlags();
}

// Render the application
ReactDOM.render(<App />, document.getElementById('root'));

// Register service worker ONLY in production
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const baseUrl = import.meta.env.BASE_URL;
  const swUrl = `${baseUrl}coi-serviceworker.min.js`;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swUrl)
      .then(reg => {
        // 🟢 Log only if debug is explicitly requested
        if (isDebug) {
          console.log('✅ Service Worker registered:', reg);
        }
      })
      .catch(err => {
        // 🔴 Always log errors in production for observability
        console.error('❌ Service Worker registration failed:', err);
      });
  });
} else if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  // [cite: 2026-01-28] DEV CLEANUP: Unregister any stale service workers to prevent "Failed to fetch" errors
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
      if (isDebug) console.log('🧹 [Dev] Unregistered stale Service Worker');
    }
  });
}