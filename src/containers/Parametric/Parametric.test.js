import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('./ParametricScene', () => ({
  createSceneManager: () => ({
    dispose: jest.fn(),
    resize: jest.fn(),
    update: jest.fn()
  })
}));

// MOCK ONLY THE UI BOUNDARIES
jest.mock('../Interface/Interface', () => () => <div data-testid="interface" />);
jest.mock('../Interface/HUD/FormulaHUD', () => () => <div data-testid="hud" />);

// STUB THE CANVAS (Avoids Three.js initialization entirely in JSDOM)
jest.mock('./ParametricView', () => {
  const { forwardRef } = require('react');
  // [cite: 2026-01-18] FIX: Remove duplicate testID. The parent container now owns it.
  return forwardRef((props, ref) => <div ref={ref} />);
});

// MOCK WORKER HELPER (Avoids import.meta.env syntax error in Jest)
jest.mock('./workerHelper', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    postMessage: jest.fn(),
    terminate: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
  getActiveWorker: jest.fn()
}));

jest.mock('three/addons/exporters/STLExporter.js', () => ({
  STLExporter: jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockReturnValue('mock-stl'),
  })),
}));

import Parametric from './Parametric';

describe('Parametric Core Component', () => {
  afterEach(cleanup);

  it('mounts and renders the structural UI', async () => {
    await act(async () => {
      render(<Parametric />);
    });
    
    // Validate that the main layout is intact
    expect(screen.getByTestId('parametric-view')).toBeInTheDocument();
  });
});