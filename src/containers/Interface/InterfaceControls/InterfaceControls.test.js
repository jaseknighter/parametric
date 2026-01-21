/**
 * @fileoverview InterfaceControls.test.js
 * UNIT TEST: Branch coverage for UI Controls.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ShapingControl, ProjectingControl } from './InterfaceControls';
import VectorMenu from './VectorGroupControl';
import TexturingControl from './TexturingControl';
import Export3dControl from './Export3dControl';

// Mock child components to isolate control logic
jest.mock('../../../components/UI/MySlider/MySlider', () => ({ label, onChange }) => (
  <div data-testid={`slider-${label}`}>
    <button onClick={() => onChange(0.5)}>Change {label}</button>
  </div>
));

describe('InterfaceControls Unit Tests', () => {
  const mockHandleUpdate = jest.fn();
  const mockParametricObj = {
    transformationInstructions: {
      shaping: {
        radius: 5,
        formula: 'CIRCLE',
        vectorParams: {
          BEND: { bendAmtX: 0, bendAmtY: 0, bendAmtZ: 0 },
          PINCH: { pinchAmtX: 0, pinchAmtY: 0, pinchAmtZ: 0 },
          SPIRAL: { spiralAmtX: 0, spiralAmtY: 0, spiralAmtZ: 0 },
          MODULATE: { modulateAmtX: 0, modulateAmtY: 0, modulateAmtZ: 0 },
          FLATTEN: { flattenAmtX: 0, flattenAmtY: 0, flattenAmtZ: 0 },
          TEXTURE: { outerTextureAmt: 0, innerTextureAmt: 0 }
        }
      },
      projecting: { vectors: [['x',0,0],[0,'y',0],[0,0,'z']] }
    }
  };

  const commonProps = {
    id: 'test-id',
    collapse: false,
    onOpen: jest.fn(),
    onClose: jest.fn(),
    parametricObj: mockParametricObj,
    handleUpdate: mockHandleUpdate,
    numberOfColumns: 2
  };

  describe('ShapingControl', () => {
    it('renders when open', () => {
      render(<ShapingControl {...commonProps} />);
      expect(screen.getByTitle(/CIRCLE/i)).toBeInTheDocument();
    });

    it('renders content even when collapsed (animation support)', () => {
      render(<ShapingControl {...commonProps} collapse={true} />);
      expect(screen.getByTitle(/CIRCLE/i)).toBeInTheDocument();
    });
  });

  describe('VectorMenu (Generic)', () => {
    const vectorProps = {
      ...commonProps,
      title: "Bend",
      baseKey: "bendAmt",
      targetPath: "shaping",
      activeKey: "BEND",
      axesLabels: ['X', 'Y', 'Z']
    };

    it('renders sliders for all axes', () => {
      render(<VectorMenu {...vectorProps} />);
      expect(screen.getByText('X')).toBeInTheDocument();
      expect(screen.getByText('Y')).toBeInTheDocument();
      expect(screen.getByText('Z')).toBeInTheDocument();
      expect(screen.getAllByTestId(/slider-/)).toHaveLength(3);
    });
  });

  describe('TexturingControl', () => {
    it('renders inner and outer sliders', () => {
      render(<TexturingControl {...commonProps} />);
      expect(screen.getByText('inner')).toBeInTheDocument();
      expect(screen.getByText('outer')).toBeInTheDocument();
    });
  });

  describe('Export3dControl', () => {
    it('renders export button', () => {
      render(<Export3dControl {...commonProps} handleExport={jest.fn()} />);
      expect(screen.getByText('Export')).toBeInTheDocument();
      expect(screen.getByText('.STL')).toBeInTheDocument();
    });
  });
});