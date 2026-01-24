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