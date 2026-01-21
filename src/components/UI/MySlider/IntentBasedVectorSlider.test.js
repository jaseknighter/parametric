/**
 * @fileoverview IntentBasedVectorSlider.test.js
 * UI INTEGRITY: Validates Inverse Projection and Intent Dispatch.
 * [cite: 2026-01-15] FIXED: Path alignment for deep state traversal.
 */
import React from 'react';
import { render, screen, fireEvent, createEvent } from '@testing-library/react';
import IntentBasedVectorSlider from './IntentBasedVectorSlider';
import { intentService } from '../../../services/ParametricIntentService';

// 1. MOCK REGISTRY: Match the specific nesting used in ParametricRegistry.js
jest.mock('../../../services/ParametricRegistry', () => ({
  // We mock the path to point to the parent group 'BEND'
  getFeaturePath: () => "transformationInstructions.shaping.vectorParams.BEND",
  ParametricRegistry: {
    bendAmtX: { projection: "radians" },
    bendAmtY: { projection: "radians" },
    bendAmtZ: { projection: "radians" }
  }
}));

// 2. MOCK CANONICAL KEYS: Link Axis labels to Intent Keys
jest.mock('../../../shared/CanonicalKeys', () => ({
  CANONICAL_KEYS: {
    bendAmtX: { 'X': 'bendAmtX', 'Y': 'bendAmtY', 'Z': 'bendAmtZ' }
  }
}));

// 3. MOCK SLIDER: Native input for reliable DOM testing
jest.mock('./MySlider', () => ({ handleUpdate, defaultValues, testID }) => (
  <input 
    data-testid={testID} 
    type="range" 
    min="0" max="360"
    value={defaultValues[0] ?? 0} // Ensure null safety
    onChange={(e) => handleUpdate([parseFloat(e.target.value)], { shiftKey: e.nativeEvent?.shiftKey || e.shiftKey || false })}
  />
));

describe('IntentBasedVectorSlider UI-State Contract', () => {
  const mockHandleUpdate = jest.fn();
  
  // Authoritative Mock State
  const parametricObj = {
    transformationInstructions: {
      shaping: {
        vectorParams: {
          BEND: { 
            bendAmtX: Math.PI, // 180 Degrees
            bendAmtY: 0,
            bendAmtZ: 0
          }
        }
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Should perform Inverse Projection: Radians (State) -> Degrees (UI)', () => {
    render(
      <IntentBasedVectorSlider 
        parametricObj={parametricObj}
        handleUpdate={mockHandleUpdate}
        activeKey="bendAmtX"
        axesLabels={['X']}
      />
    );

    // [cite: 2026-01-16] FIX: UI now displays RAW state value (Radians).
    // Inverse projection was removed to fix "Jumping Slider" bug.
    const slider = screen.getByTestId('slider-bendAmtX-X-handle');
    expect(parseFloat(slider.value)).toBeCloseTo(Math.PI, 4);
  });

  test('Should broadcast Raw UI values on change', () => {
    const intentSpy = jest.spyOn(intentService, 'setIntent');
    
    render(
      <IntentBasedVectorSlider 
        parametricObj={parametricObj}
        handleUpdate={mockHandleUpdate}
        activeKey="bendAmtX"
        axesLabels={['X']}
      />
    );

    const slider = screen.getByTestId('slider-bendAmtX-X-handle');
    fireEvent.change(slider, { target: { value: '90' } });

    // Confirm it broadcasts the raw degree value '90'
    expect(intentSpy).toHaveBeenCalledWith('bendAmtX', 90);
    
    expect(mockHandleUpdate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ newValue: 90, paramToUpdate: 'bendAmtX' })
      ]),
      expect.objectContaining({ activeKey: 'bendAmtX' })
    );

    intentSpy.mockRestore();
  });

  test('Should propagate Shift Key (Swarm Intent) to handleUpdate', () => {
    render(
      <IntentBasedVectorSlider 
        parametricObj={parametricObj}
        handleUpdate={mockHandleUpdate}
        activeKey="bendAmtX"
        axesLabels={['X']}
      />
    );

    const slider = screen.getByTestId('slider-bendAmtX-X-handle');
    
    // Simulate a Shift+Change event
    // [cite: 2026-01-16] FIX: Robustly set shiftKey using createEvent
    const event = createEvent.change(slider, { target: { value: '45' } });
    Object.defineProperty(event, 'shiftKey', { value: true });
    fireEvent(slider, event);

    expect(mockHandleUpdate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ shiftKey: true }));
  });
});