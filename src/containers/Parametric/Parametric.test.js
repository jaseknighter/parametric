import React from 'react';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('./ParametricScene', () => ({
  createSceneManager: () => ({
    dispose: jest.fn(),
    resize: jest.fn(),
    update: jest.fn(),
    getCamera: jest.fn().mockReturnValue({ type: 'PerspectiveCamera' }),
    scene: {},
    getMesh: jest.fn()
  })
}));

// MOCK ONLY THE UI BOUNDARIES
jest.mock('../Interface/Interface', () => () => <div data-testid="interface" />);
jest.mock('../Interface/HUD/FormulaHUD', () => () => <div data-testid="hud" />);

// STUB THE CANVAS (Avoids Three.js initialization entirely in JSDOM)
jest.mock('./ParametricView', () => {
  const { forwardRef } = require('react');
  // [cite: 2026-01-18] FIX: Remove duplicate testID. The parent container now owns it.
  return forwardRef((props, ref) => (
    <div 
      ref={ref} 
      data-testid="parametric-view-mock"
      onClick={() => props.onExport && props.onExport('svg')}
    />
  ));
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

jest.mock('three/addons/renderers/SVGRenderer.js', () => {
  return {
    SVGRenderer: jest.fn(() => {
      let _el;
      return {
        setSize: jest.fn(),
        setPrecision: jest.fn(),
        render: jest.fn(),
        get domElement() {
          if (!_el && global.document) {
            _el = global.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          }
          return _el;
        }
      };
    })
  };
});

jest.mock('file-saver', () => ({
  saveAs: jest.fn()
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

  it('triggers SVG export when requested', async () => {
    await act(async () => {
      render(<Parametric />);
    });

    const view = screen.getByTestId('parametric-view-mock');
    fireEvent.click(view); // Triggers onExport('svg') via the mock

    const { SVGRenderer } = require('three/addons/renderers/SVGRenderer.js');
    expect(SVGRenderer).toHaveBeenCalled();
    expect(require('file-saver').saveAs).toHaveBeenCalled();
  });
});