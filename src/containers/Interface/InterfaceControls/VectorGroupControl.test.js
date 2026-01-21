import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import VectorGroupControl from './VectorGroupControl';

// Mock MySlider to capture the event parameter
jest.mock("../../../components/UI/MySlider/MySlider", () => {
  return function MockSlider({ handleUpdate, label }) {
    return (
      <div data-testid={`mock-slider-${label}`}>
        <button 
          data-testid="trigger-shift-update" 
          onClick={(e) => handleUpdate([0.75], { shiftKey: true })} 
        />
        {/* ADD THIS BUTTON BACK IN */}
        <button 
          data-testid="trigger-normal-update" 
          onClick={(e) => handleUpdate([0.5], { shiftKey: false })} 
        />
      </div>
    );
  };
});

describe('VectorGroupControl', () => {
  const mockProps = {
    parametricObj: {
      transformationInstructions: {
        shaping: { vectorParams: { bendAmtX: 0, bendAmtY: 0, bendAmtZ: 0 } }
      }
    },
    handleUpdate: jest.fn(),
    updateControlsRef: jest.fn(),
    title: "Bend",
    baseKey: "bendAmt",
    targetPath: "shaping",
    activeKey: "bend",
    axesLabels: ["X", "Y", "Z"],
    numberOfColumns: 1
  };

  afterEach(cleanup);

  test('passes the shiftKey event shim to handleUpdate', () => {
    render(<VectorGroupControl {...mockProps} />);
    
    // Click the button in our mock that simulates a shift-click update
    fireEvent.click(screen.getAllByTestId('trigger-shift-update')[0]);

    // Check that handleUpdate was called with the event shim
    expect(mockProps.handleUpdate).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ shiftKey: true })
    );
  });

  test('updates activeKey to true if value > 0', () => {
    render(<VectorGroupControl {...mockProps} />);
    fireEvent.click(screen.getAllByTestId('trigger-normal-update')[0]);

  const updates = mockProps.handleUpdate.mock.calls[0][0];
  // [cite: 2026-01-15] FIX: Active Key is passed in metadata (arg 2), not update array (arg 1)
  const metadata = mockProps.handleUpdate.mock.calls[0][1];
  expect(metadata).toEqual(expect.objectContaining({ activeKey: "bend" }));
  });
});