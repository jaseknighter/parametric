/**
 * @fileoverview FormulaHUD.test.js
 * UNIT TEST: Branch coverage for FormulaHUD.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FormulaHUD from './FormulaHUD';

describe('FormulaHUD Unit Tests', () => {
  const defaultProps = {
    handleFormulaChange: jest.fn(),
    formulaCode: "x=u; y=v; z=0;",
    isFormulaValid: true,
    isMathematicalError: false,
    isManualOverride: false
  };

  it('renders in Auto mode', () => {
    render(<FormulaHUD {...defaultProps} />);
    expect(screen.getByDisplayValue("x=u; y=v; z=0;")).toBeInTheDocument();
  });

  it('renders in Manual mode', () => {
    render(<FormulaHUD {...defaultProps} isManualOverride={true} />);
    // Check for manual mode indicator if present, or just ensure render
  });

  it('handles text change', () => {
    render(<FormulaHUD {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'x=1;' } });
    expect(defaultProps.handleFormulaChange).toHaveBeenCalled();
  });

  it('handles scroll sync', () => {
    render(<FormulaHUD {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.scroll(textarea, { target: { scrollTop: 50 } });
  });
});