/**
 * @fileoverview index.js
 * ENTRY POINT: Migrated to Vite.
 * Removed CRA serviceWorker to prevent bundling conflicts.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

// Render the application
ReactDOM.render(<App />, document.getElementById('root'));

// Register service worker ONLY in production
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const baseUrl = import.meta.env.BASE_URL; // Vite sets this automatically
  const swUrl = `${baseUrl}coi-serviceworker.min.js`;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swUrl)
      .then(reg => console.log('✅ Service Worker registered:', reg))
      .catch(err => console.error('❌ Service Worker registration failed:', err));
  });
} else {
  console.log('ℹ️ Dev mode: Service Worker not registered');
}