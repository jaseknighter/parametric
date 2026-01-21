import React from 'react';
import { render } from '@testing-library/react';
import { useRenderWatchdog } from '../src/shared/hooks/useRenderWatchdog';

describe('useRenderWatchdog', () => {
  let consoleWarnSpy;
  let now = 1000; // Start at non-zero timestamp

  beforeEach(() => {
    jest.useFakeTimers();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Mock performance.now to control time deterministically
    // This ensures synchronization with jest.advanceTimersByTime
    jest.spyOn(performance, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    now = 1000;
  });

  const advanceTime = (ms) => {
    now += ms;
    jest.advanceTimersByTime(ms);
  };

  const TestComponent = ({ name, limit }) => {
    useRenderWatchdog(name, limit);
    return null;
  };

  test('should not warn if render count is within limit', () => {
    const { rerender } = render(<TestComponent name="SafeComp" limit={10} />);
    
    // Render 5 times (less than limit 10)
    for (let i = 0; i < 5; i++) {
      rerender(<TestComponent name="SafeComp" limit={10} />);
    }

    // Advance time to trigger check (1s window)
    advanceTime(1100);
    rerender(<TestComponent name="SafeComp" limit={10} />);

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test('should warn if render count exceeds limit', () => {
    const { rerender } = render(<TestComponent name="ChattyComp" limit={5} />);
    
    // Render 10 times (more than limit 5)
    for (let i = 0; i < 10; i++) {
      rerender(<TestComponent name="ChattyComp" limit={5} />);
    }

    // Advance time to trigger check
    advanceTime(1100);
    rerender(<TestComponent name="ChattyComp" limit={5} />);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('High render frequency detected in <ChattyComp />')
    );
  });

  test('should use default limit (20) if not provided', () => {
    const { rerender } = render(<TestComponent name="DefaultComp" />);
    
    // Render 25 times (exceeds default 20)
    for (let i = 0; i < 25; i++) {
      rerender(<TestComponent name="DefaultComp" />);
    }

    advanceTime(1100);
    rerender(<TestComponent name="DefaultComp" />);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Threshold is 20')
    );
  });

  test('should reset count after evaluation window', () => {
    const { rerender } = render(<TestComponent name="ResetComp" limit={5} />);
    
    // Exceed limit in first window
    for (let i = 0; i < 10; i++) {
      rerender(<TestComponent name="ResetComp" limit={5} />);
    }
    
    // Trigger check
    advanceTime(1100);
    rerender(<TestComponent name="ResetComp" limit={5} />);
    
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    consoleWarnSpy.mockClear();

    // Stay within limit in second window
    for (let i = 0; i < 2; i++) {
      rerender(<TestComponent name="ResetComp" limit={5} />);
    }
    
    // Trigger check for second window
    advanceTime(1100);
    rerender(<TestComponent name="ResetComp" limit={5} />);

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});