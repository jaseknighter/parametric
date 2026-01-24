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

// [cite: 2026-01-24] ROUTING FIX: Enforce trailing slash for base path
// This ensures that visiting /parametric redirects to /parametric/ to match the Vite base.
if (window.location.pathname === '/parametric') {
  window.location.replace('/parametric/' + window.location.search);
}

// [cite: 2026-01-24] OBSERVABILITY: Initialize Debug Utility
// Enables specific channels only when ?debug=true is present in the URL.
const isDebug = window.location.search.includes('debug=true');

// [cite: 2026-01-24] NOISE CONTROL: Suppress known Three.js warnings unless debugging
if (!isDebug) {
  const originalError = console.error;
  console.error = (...args) => {
    if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN')) {
      return;
    }
    originalError.apply(console, args);
  };
}

Debug.init({
  enabled: isDebug,
  channels: isDebug ? ['WATCHDOG', 'INTENT', 'WORKER', 'AUDIT'] : []
});

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
}