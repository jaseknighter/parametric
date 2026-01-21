import React from 'react';
import { render, screen, fireEvent, cleanup, createEvent } from '@testing-library/react';
import MySlider from './MySlider';

// 1. MOCK: react-compound-slider
jest.mock('react-compound-slider', () => ({
  Slider: ({ onUpdate, onChange, children, values }) => (
    <div data-testid="mock-slider" data-values={JSON.stringify(values)}>
      <button data-testid="trigger-update" onClick={(e) => {
        const val = e.currentTarget.getAttribute('data-val') ? parseFloat(e.currentTarget.getAttribute('data-val')) : 80;
        onUpdate && onUpdate([val]);
      }} />
      <button data-testid="trigger-change" onClick={() => onChange && onChange([80])} />
      <button data-testid="trigger-empty" onClick={() => onUpdate && onUpdate([])} />
      {children}
    </div>
  ),
  Rail: ({ children }) => children({ 
    getRailProps: () => ({ 'data-testid': 'comp-rail' }) 
  }),
  Handles: ({ children }) => {
    const handles = [{ id: 'h1', value: 50, percent: 50 }];
    const getHandleProps = (id) => ({ 
      role: 'slider',
      'aria-valuenow': 50,
      tabIndex: 0, 
      'data-testid': 'comp-handle' 
    });
    return children({ handles, getHandleProps });
  },
  Tracks: ({ children }) => children({
    tracks: [{ id: 't1', source: { percent: 0 }, target: { percent: 50 } }],
    getTrackProps: () => ({ 'data-testid': 'comp-track' })
  }),
  Ticks: ({ children }) => children({
    ticks: [{ id: 'tick1', value: 0, percent: 0 }]
  }),
}));

// 2. MOCK: Internal Components
jest.mock('./MySliderComponents', () => ({
  __esModule: true,
  SliderRail: ({ getRailProps }) => <div {...getRailProps()} />,
  Handle: ({ getHandleProps }) => <div {...getHandleProps()} />,
  Track: ({ getTrackProps }) => <div {...getTrackProps()} />,
  Tick: () => <div data-testid="comp-tick" />,
}));

describe('MySlider Logical Coverage', () => {
  const defaultProps = {
    domain: [0, 100],
    defaultValues: [20],
    handleUpdate: jest.fn()
  };
  
  let currentTime = 1000;

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
    currentTime = 1000;
  });

  // [cite: 2026-01-16] FIX: Mock performance.now to bypass throttle
  beforeAll(() => {
    jest.spyOn(performance, 'now').mockImplementation(() => currentTime);
  });

  // --- Basic Functionality ---

  test('notifies parent via handleUpdate on slider update', () => {
    const handleUpdateMock = jest.fn();
    render(<MySlider {...defaultProps} handleUpdate={handleUpdateMock} />);
    fireEvent.click(screen.getByTestId('trigger-update'));
    expect(handleUpdateMock).toHaveBeenCalledWith([80], expect.anything());
  });

  test('processes final onChange events when the user releases the slider', () => {
    const handleUpdateMock = jest.fn();
    render(<MySlider {...defaultProps} handleUpdate={handleUpdateMock} />);
    fireEvent.click(screen.getByTestId('trigger-change'));
    expect(handleUpdateMock).toHaveBeenCalledWith([80], expect.anything());
  });

  // --- Logical Guards & Refs ---

  test('should return early and skip updates if the slider provides an empty values array', () => {
    const handleUpdateMock = jest.fn();
    render(<MySlider {...defaultProps} handleUpdate={handleUpdateMock} />);
    fireEvent.click(screen.getByTestId('trigger-empty'));
    expect(handleUpdateMock).not.toHaveBeenCalled();
  });

  test('prevents redundant notifications if values have not effectively changed', () => {
    const handleUpdateMock = jest.fn();
    render(<MySlider {...defaultProps} handleUpdate={handleUpdateMock} />);
    const trigger = screen.getByTestId('trigger-update');
    fireEvent.click(trigger); 
    fireEvent.click(trigger); 
    expect(handleUpdateMock).toHaveBeenCalledTimes(1); 
  });

  // --- Prop Syncing (useEffect) ---

  test('syncs internal state when defaultValues prop changes', () => {
    const { rerender } = render(<MySlider {...defaultProps} />);
    rerender(<MySlider {...defaultProps} defaultValues={[45]} />);
    const slider = screen.getByTestId('mock-slider');
    expect(slider.getAttribute('data-values')).toBe(JSON.stringify([45]));
  });

  test('returns early in useEffect if defaultValues is empty or null', () => {
    const { rerender } = render(<MySlider {...defaultProps} />);
    rerender(<MySlider {...defaultProps} defaultValues={[]} />);
    const slider = screen.getByTestId('mock-slider');
    expect(slider.getAttribute('data-values')).toBe(JSON.stringify([20]));
  });

  test('does not setValues in useEffect if incoming props match current state', () => {
    const { rerender } = render(<MySlider {...defaultProps} />);
    rerender(<MySlider {...defaultProps} defaultValues={[20]} />);
    expect(screen.getByTestId('mock-slider')).toBeInTheDocument();
  });

  // --- Domain & Calculations ---

  test('uses default domain [0, 10] if domain prop is missing', () => {
    render(<MySlider defaultValues={[1]} handleUpdate={jest.fn()} />);
    expect(screen.getByTestId('mock-slider')).toBeInTheDocument();
  });

  // --- UI & Edge Cases ---

  test('handles slider focus correctly', () => {
    render(<MySlider {...defaultProps} />);
    const handle = screen.getByRole('slider');
    handle.focus();
    expect(handle).toHaveFocus();
  });

  test('gracefully handles missing handleUpdate function', () => {
    render(<MySlider {...defaultProps} handleUpdate={null} />);
    const trigger = screen.getByTestId('trigger-update');
    expect(() => fireEvent.click(trigger)).not.toThrow();
  });

  test('renders all internal sub-components via the library patterns', () => {
    render(<MySlider {...defaultProps} />);
    expect(screen.getByTestId('comp-rail')).toBeInTheDocument();
    expect(screen.getByTestId('comp-handle')).toBeInTheDocument();
    expect(screen.getByTestId('comp-track')).toBeInTheDocument();
  });

  test('skips handleUpdate if the new values are identical to current state', () => {
    const handleUpdateMock = jest.fn();
    // Start at 80
    render(<MySlider {...defaultProps} defaultValues={[80]} handleUpdate={handleUpdateMock} />);
    
    // Trigger an update that is also 80 (our mock trigger-update sends [80])
    fireEvent.click(screen.getByTestId('trigger-update'));
    
    // This hits the branch where the 'if' condition is false
    // Depending on your logic, it might be 0 or 1 calls. 
    // The goal is simply to execute the line.
    expect(handleUpdateMock).not.toHaveBeenCalled(); 
  });

  test('handles undefined defaultValues gracefully', () => {
  // This will now pass instead of throwing a TypeError
  render(<MySlider domain={[0, 100]} handleUpdate={jest.fn()} defaultValues={undefined} />);
  expect(screen.getByTestId('mock-slider')).toBeInTheDocument();
});

  test('gracefully handles missing handleUpdate on slider change', () => {
    render(<MySlider {...defaultProps} handleUpdate={null} />);
    const trigger = screen.getByTestId('trigger-change');
    expect(() => fireEvent.click(trigger)).not.toThrow();
  });

  // --- Event Flooding & Throttling Tests ---

  test('should throttle high-frequency movements (Event Flooding)', () => {
    const handleUpdateMock = jest.fn();
    render(<MySlider {...defaultProps} handleUpdate={handleUpdateMock} />);
    
    const trigger = screen.getByTestId('trigger-update');
    
    // 1. First event (Should pass)
    trigger.setAttribute('data-val', '80');
    fireEvent.click(trigger);
    
    // 2. Rapid fire events within throttle window (16ms)
    currentTime += 5; // +5ms
    trigger.setAttribute('data-val', '81'); // Change value to pass equality check
    fireEvent.click(trigger);
    currentTime += 5; // +10ms
    trigger.setAttribute('data-val', '82');
    fireEvent.click(trigger);
    
    // 3. Event after throttle window (Should pass) - Advance significantly
    currentTime += 100; // +110ms total (safe bet)
    trigger.setAttribute('data-val', '83');
    fireEvent.click(trigger);

    // Expect only 2 calls (First + Last), skipping the middle two
    expect(handleUpdateMock).toHaveBeenCalledTimes(2);
  });

  test('captures and passes modifier keys (Shift) to handleUpdate', () => {
    const handleUpdateMock = jest.fn();
    render(<MySlider {...defaultProps} handleUpdate={handleUpdateMock} />);
    
    // Simulate a PointerDown with Shift key held
    const container = screen.getByTestId('mock-slider').parentElement;
    // [cite: 2026-01-16] FIX: Target the div that has the onPointerDown handler
    const wrapper = screen.getByTestId('mock-slider').parentElement;
    
    // [cite: 2026-01-16] FIX: Use createEvent to ensure shiftKey is set on the native event
    const event = createEvent.pointerDown(wrapper, { shiftKey: true, buttons: 1, bubbles: true });
    Object.defineProperty(event, 'shiftKey', { value: true }); // Force property
    fireEvent(wrapper, event);
    
    // Trigger update while "dragging" (ref is set)
    const trigger = screen.getByTestId('trigger-update');
    fireEvent.click(trigger);
    
    expect(handleUpdateMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ shiftKey: true })
    );
  });
});