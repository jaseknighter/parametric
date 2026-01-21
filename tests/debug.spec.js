import { test, expect } from '@playwright/test';
import { Debug } from '../src/utilities/debug.js';

/**
 * @fileoverview debug.spec.js
 * UNIT TEST: Verifies the Debug singleton's channel management.
 */

test.describe('Unit: Debug Utility', () => {
  let originalConsole;
  let logs;

  test.beforeEach(() => {
    Debug.init({ enabled: false, channels: [] });
    
    // Mock console to verify outputs
    originalConsole = { ...console };
    logs = { log: [], warn: [], error: [] };
    console.log = (...args) => logs.log.push(args);
    console.warn = (...args) => logs.warn.push(args);
    console.error = (...args) => logs.error.push(args);
  });

  test.afterEach(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  test('enable activates specific channels', () => {
    Debug.init({ enabled: true, channels: ['TEST_CHANNEL', 'ANOTHER_CHANNEL'] });
    
    expect(Debug._enabled).toBe(true);
    expect(Debug._channels.has('TEST_CHANNEL')).toBe(true);
    expect(Debug._channels.has('ANOTHER_CHANNEL')).toBe(true);
    expect(Debug._channels.has('UNUSED_CHANNEL')).toBe(false);
  });

  test('disable clears all channels', () => {
    Debug.init({ enabled: true, channels: ['TEST_CHANNEL'] });
    Debug.init({ enabled: false, channels: [] });
    
    expect(Debug._enabled).toBe(false);
    expect(Debug._channels.size).toBe(0);
  });

  test('init configures enabled state and channels', () => {
    Debug.init({ enabled: true, channels: ['INIT_CHANNEL'] });
    expect(Debug._enabled).toBe(true);
    expect(Debug._channels.has('INIT_CHANNEL')).toBe(true);
    expect(logs.log.some(args => args[0].includes('Debug Configured'))).toBe(true);
  });

  test('isEnabled checks both global switch and channel presence', () => {
    Debug.init({ enabled: true, channels: ['A'] });
    expect(Debug.isEnabled('A')).toBe(true);
    expect(Debug.isEnabled('B')).toBe(false);
    
    Debug.init({ enabled: false, channels: [] });
    expect(Debug.isEnabled('A')).toBe(false);
  });

  test('log outputs only when channel is enabled', () => {
    Debug.init({ enabled: true, channels: ['A'] });
    
    Debug.log('A', 'message A');
    Debug.log('B', 'message B');
    
    // Debug.log uses console.log with styling, so args[0] is the format string "%c[]"
    // args[2] is the message
    expect(logs.log.filter(args => args.length > 2 && args[2] === 'message A').length).toBe(1);
    expect(logs.log.filter(args => args.length > 2 && args[2] === 'message B').length).toBe(0);
  });

  test('warn outputs only when channel is enabled', () => {
    Debug.init({ enabled: true, channels: ['A'] });
    
    Debug.warn('A', 'warning A');
    Debug.warn('B', 'warning B');
    
    expect(logs.warn.length).toBe(1);
    expect(logs.warn[0][1]).toBe('warning A');
  });

  test('error bypasses channel filter', () => {
    Debug.error('A', 'critical error');
    expect(logs.error.length).toBe(1);
    expect(logs.error[0][2]).toBe('critical error');
  });
});