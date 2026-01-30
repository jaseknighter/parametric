import React, { useRef } from 'react';
import { render, act } from '@testing-library/react';
import { useAdaptiveTooltip } from './hooks/useAdaptiveTooltip';
import { useOutsideDismiss } from './hooks/useOutsideDismiss';

// Helper to test hooks via standard render (compatible with all RTL versions)
const TestHook = ({ hook, callback }) => {
  const result = hook();
  callback(result);
  return null;
};

const TestOutsideDismissComponent = ({ onDismiss }) => {
  const ref = useRef(null);
  useOutsideDismiss({ refs: [ref], onDismiss, enabled: true });
  return <div ref={ref}>Inside</div>;
};

describe('Shared Hooks', () => {
  beforeAll(() => {
    // [cite: 2026-01-30] NOISE CONTROL: Suppress verbose hook lifecycle logs
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('useAdaptiveTooltip', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('[behavior] initializes with hidden state', () => {
      let result;
      render(<TestHook hook={useAdaptiveTooltip} callback={(val) => { result = val; }} />);
      expect(result.tooltip.visible).toBe(false);
    });

    test('[behavior] showTooltip updates state', async () => {
      let result;
      render(<TestHook hook={useAdaptiveTooltip} callback={(val) => { result = val; }} />);
      await act(async () => {
        result.showTooltip({ clientX: 10, clientY: 10 }, { text: 'Test' });
        jest.runAllTimers();
      });
      expect(result.tooltip.visible).toBe(true);
      expect(result.tooltip.text).toBe('Test');
    });

    test('[behavior] hideTooltip hides it', async () => {
      let result;
      render(<TestHook hook={useAdaptiveTooltip} callback={(val) => { result = val; }} />);
      await act(async () => {
        result.showTooltip({ clientX: 10, clientY: 10 }, { text: 'Test' });
        jest.runAllTimers();
      });
      await act(async () => {
        result.hideTooltip();
        jest.runAllTimers();
      });
      expect(result.tooltip.visible).toBe(false);
    });
  });

  describe('useOutsideDismiss', () => {
    test('[behavior] calls onDismiss when clicking outside', () => {
      const onDismiss = jest.fn();
      render(<TestOutsideDismissComponent onDismiss={onDismiss} />);

      act(() => {
        // [cite: 2026-01-29] FIX: Use generic Event for JSDOM compatibility (no PointerEvent global)
        document.body.dispatchEvent(
          new Event('pointerdown', { bubbles: true })
        );
      });

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });
});