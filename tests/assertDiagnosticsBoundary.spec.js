import { test, expect } from '@playwright/test';
import { assertReadOnly } from '../src/utilities/assertDiagnosticsBoundary.js';

/**
 * @fileoverview assertDiagnosticsBoundary.spec.js
 * UNIT TEST: Verifies the Read-Only Proxy protection for HUD diagnostics.
 */

test.describe('Unit: assertDiagnosticsBoundary', () => {
  let consoleWarnSpy;
  let originalWarn;

  test.beforeEach(() => {
    originalWarn = console.warn;
    consoleWarnSpy = [];
    console.warn = (msg) => consoleWarnSpy.push(msg);
  });

  test.afterEach(() => {
    console.warn = originalWarn;
  });

  test('assertReadOnly prevents mutation of properties', () => {
    const target = { x: 1 };
    const proxy = assertReadOnly(target, 'TestLabel');
    
    proxy.x = 2;
    
    expect(consoleWarnSpy.some(msg => msg.includes('TestLabel Protected'))).toBe(true);
    expect(consoleWarnSpy.some(msg => msg.includes('Attempted to mutate property "x"'))).toBe(true);
    expect(proxy.x).toBe(1);
  });

  test('assertReadOnly prevents deletion of properties', () => {
    const target = { x: 1 };
    const proxy = assertReadOnly(target, 'TestLabel');
    
    delete proxy.x;
    
    expect(consoleWarnSpy.some(msg => msg.includes('TestLabel Protected'))).toBe(true);
    expect(consoleWarnSpy.some(msg => msg.includes('Attempted to delete property "x"'))).toBe(true);
    expect(proxy.x).toBe(1);
  });

  test('assertReadOnly protects nested objects recursively', () => {
    const target = { nested: { y: 2 } };
    const proxy = assertReadOnly(target, 'TestLabel');
    
    proxy.nested.y = 3;
    
    expect(consoleWarnSpy.some(msg => msg.includes('TestLabel Protected'))).toBe(true);
    expect(proxy.nested.y).toBe(2);
  });

  test('Stress Test: assertReadOnly handles rapid mutation attempts', () => {
    const target = { count: 0 };
    const proxy = assertReadOnly(target, 'StressTest');
    
    for (let i = 0; i < 10; i++) {
      proxy.count++;
    }
    
    expect(consoleWarnSpy.length).toBeGreaterThanOrEqual(10);
    expect(target.count).toBe(0);
  });

  test('assertReadOnly bypasses proxy in production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const target = { x: 1 };
    const proxy = assertReadOnly(target, 'ProdTest');
    
    expect(proxy).toBe(target); // Should return original object
    process.env.NODE_ENV = originalEnv;
  });

  test('assertReadOnly returns primitives as-is', () => {
    expect(assertReadOnly(null, 'PrimTest')).toBe(null);
    expect(assertReadOnly(42, 'PrimTest')).toBe(42);
    expect(assertReadOnly('string', 'PrimTest')).toBe('string');
  });

  test('assertReadOnly protects arrays', () => {
    const target = [1, 2];
    const proxy = assertReadOnly(target, 'ArrayTest');
    
    proxy.push(3);
    
    expect(consoleWarnSpy.some(msg => msg.includes('ArrayTest Protected'))).toBe(true);
    expect(proxy.length).toBe(2);
  });

  test('Architectural Guard: assertReadOnly must throw on mutation', () => {
    const originalData = { rid: 1, status: 'NOMINAL' };
    const protectedData = assertReadOnly(originalData, 'HUD_Guard');
  
    // 1. Verify Identity (Should be a Proxy, not the same reference)
    expect(protectedData).not.toBe(originalData);
  
    // 2. The Tamper Check: Mutation should throw an Error (Proxy throws Error with message)
    protectedData.rid = 999;
    expect(consoleWarnSpy.some(msg => msg.includes('HUD_Guard Protected'))).toBe(true);
  
    // 3. The Integrity Check: Original data must remain untouched
    expect(originalData.rid).toBe(1);
  });
});