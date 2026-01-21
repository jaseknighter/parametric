/**
 * @fileoverview Interface.test.js
 * VALIDATION: State management and cleanup for staggered UI drawers.
 */
import React from 'react';
import { render, fireEvent, act, screen } from '@testing-library/react';
import Interface from './Interface';

// --- MOCKS ---
// We use a consistent mock structure to verify props and state
// Note: We inline the component definition to avoid hoisting issues with jest.mock

jest.mock("./InterfaceControls/InterfaceControls", () => ({
  ShapingControl: ({ id, onOpen, onClose, collapse, ...props }) => (
    <div data-testid={`${id}-ctrl`}>
      <button onClick={onOpen}>Open {id}</button>
      <button onClick={onClose}>Close {id}</button>
      <div data-testid={`${id}-status`}>{collapse ? "Closed" : "Open"}</div>
      <div data-testid={`${id}-props`}>{JSON.stringify(props)}</div>
    </div>
  ),
  ProjectingControl: ({ id, onOpen, onClose, collapse, ...props }) => (
    <div data-testid={`${id}-ctrl`}>
      <button onClick={onOpen}>Open {id}</button>
      <button onClick={onClose}>Close {id}</button>
      <div data-testid={`${id}-status`}>{collapse ? "Closed" : "Open"}</div>
      <div data-testid={`${id}-props`}>{JSON.stringify(props)}</div>
    </div>
  )
}));

jest.mock("./InterfaceControls/VectorGroupControl", () => ({
  __esModule: true,
  default: ({ id, onOpen, onClose, collapse, ...props }) => (
    <div data-testid={`${id}-ctrl`}>
      <button onClick={onOpen}>Open {id}</button>
      <button onClick={onClose}>Close {id}</button>
      <div data-testid={`${id}-status`}>{collapse ? "Closed" : "Open"}</div>
      <div data-testid={`${id}-props`}>{JSON.stringify(props)}</div>
    </div>
  )
}));

jest.mock("./InterfaceControls/TexturingControl", () => ({
  __esModule: true,
  default: ({ id, onOpen, onClose, collapse, ...props }) => (
    <div data-testid={`${id}-ctrl`}>
      <button onClick={onOpen}>Open {id}</button>
      <button onClick={onClose}>Close {id}</button>
      <div data-testid={`${id}-status`}>{collapse ? "Closed" : "Open"}</div>
      <div data-testid={`${id}-props`}>{JSON.stringify(props)}</div>
    </div>
  )
}));

jest.mock("./InterfaceControls/Export3dControl", () => ({
  __esModule: true,
  default: ({ id, onOpen, onClose, collapse, ...props }) => (
    <div data-testid={`${id}-ctrl`}>
      <button onClick={onOpen}>Open {id}</button>
      <button onClick={onClose}>Close {id}</button>
      <div data-testid={`${id}-status`}>{collapse ? "Closed" : "Open"}</div>
      <div data-testid={`${id}-props`}>{JSON.stringify(props)}</div>
    </div>
  )
}));

describe('Interface State Management', () => {
  const mockHandleUpdate = jest.fn();
  const mockHandleExport = jest.fn();
  const originalInnerWidth = window.innerWidth;

  // [cite: 2026-01-19] FIX: Mock ResizeObserver for JSDOM environment
  beforeAll(() => {
    window.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    window.innerWidth = 1024; // Default desktop
    fireEvent(window, new Event('resize'));
  });

  afterAll(() => {
    window.innerWidth = originalInnerWidth;
    fireEvent(window, new Event('resize'));
  });

  it('renders all controls collapsed by default', () => {
    render(<Interface handleUpdate={mockHandleUpdate} />);
    
    const controls = ['shape', 'project', 'bend', 'pinch', 'texture', 'spiral', 'modulate', 'flatten', 'export3d'];
    controls.forEach(id => {
      expect(screen.getByTestId(`${id}-ctrl`)).toBeInTheDocument();
      expect(screen.getByTestId(`${id}-status`)).toHaveTextContent('Closed');
    });
  });

  it('passes correct props to children', () => {
    const parametricObj = { foo: 'bar' };
    render(<Interface handleUpdate={mockHandleUpdate} parametricObj={parametricObj} />);
    
    const shapeProps = JSON.parse(screen.getByTestId('shape-props').textContent);
    expect(shapeProps.parametricObj).toEqual(parametricObj);
  });

  it('opens and closes a control when requested', () => {
    render(<Interface handleUpdate={mockHandleUpdate} />);
    
    fireEvent.click(screen.getByText('Open shape'));
    expect(screen.getByTestId('shape-status')).toHaveTextContent('Open');

    fireEvent.click(screen.getByText('Close shape'));
    expect(screen.getByTestId('shape-status')).toHaveTextContent('Closed');
  });

  it('manages desktop layout width constraints (FIFO eviction)', () => {
    // Width = 1000px. Max allowed = 750px.
    // Shape (220) + Project (280) + Bend (280) = 780 > 750.
    window.innerWidth = 1000;
    fireEvent(window, new Event('resize'));

    render(<Interface handleUpdate={mockHandleUpdate} />);

    // 1. Open Shape (220)
    fireEvent.click(screen.getByText('Open shape'));
    expect(screen.getByTestId('shape-status')).toHaveTextContent('Open');

    // 2. Open Project (220 + 280 = 500)
    fireEvent.click(screen.getByText('Open project'));
    expect(screen.getByTestId('shape-status')).toHaveTextContent('Open');
    expect(screen.getByTestId('project-status')).toHaveTextContent('Open');

    // 3. Open Bend (500 + 280 = 780 -> Evict Shape)
    fireEvent.click(screen.getByText('Open bend'));
    
    expect(screen.getByTestId('shape-status')).toHaveTextContent('Closed'); // Evicted
    expect(screen.getByTestId('project-status')).toHaveTextContent('Open');
    expect(screen.getByTestId('bend-status')).toHaveTextContent('Open');

    // 4. Open Export (80). Total = 280 + 280 + 80 = 640 < 750.
    fireEvent.click(screen.getByText('Open export3d'));
    expect(screen.getByTestId('project-status')).toHaveTextContent('Open');
    expect(screen.getByTestId('bend-status')).toHaveTextContent('Open');
    expect(screen.getByTestId('export3d-status')).toHaveTextContent('Open');
  });

  it('enforces single-open logic on mobile', () => {
    window.innerWidth = 375;
    fireEvent(window, new Event('resize'));

    render(<Interface handleUpdate={mockHandleUpdate} />);

    // 1. Open Shape
    fireEvent.click(screen.getByText('Open shape'));
    expect(screen.getByTestId('shape-status')).toHaveTextContent('Open');

    // 2. Open Project -> Should close Shape
    fireEvent.click(screen.getByText('Open project'));
    expect(screen.getByTestId('shape-status')).toHaveTextContent('Closed');
    expect(screen.getByTestId('project-status')).toHaveTextContent('Open');
  });

  it('does not re-open an already active interface (Branch Coverage)', () => {
    render(<Interface handleUpdate={mockHandleUpdate} />);
    
    // 1. Open
    fireEvent.click(screen.getByText('Open shape'));
    expect(screen.getByTestId('shape-status')).toHaveTextContent('Open');

    // 2. Open again (Should hit "if (prev.includes(id)) return prev")
    fireEvent.click(screen.getByText('Open shape'));
    expect(screen.getByTestId('shape-status')).toHaveTextContent('Open');
  });
});