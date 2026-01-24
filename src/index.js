/**
 * @fileoverview index.js
 * ENTRY POINT: Migrated to Vite.
 * Removed CRA serviceWorker to prevent bundling conflicts.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

// [cite: 2026-01-24] ROUTING FIX: Enforce trailing slash for base path
// This ensures that visiting /parametric redirects to /parametric/ to match the Vite base.
if (window.location.pathname === '/parametric') {
  window.location.replace('/parametric/' + window.location.search);
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
        if (window.location.search.includes('debug=true')) {
          console.log('✅ Service Worker registered:', reg);
        }
      })
      .catch(err => {
        // 🔴 Always log errors in production for observability
        console.error('❌ Service Worker registration failed:', err);
      });
  });
}