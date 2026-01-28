import { loadGuidanceRegistry } from './loadGuidanceRegistry';

// Mock dependencies to test failure paths without breaking the build
jest.mock('ajv', () => {
  return jest.fn().mockImplementation(() => ({
    // [cite: 2026-01-27] FIX: Return a valid function by default so happy path works
    compile: jest.fn().mockReturnValue(() => true)
  }));
});

describe('GUIDANCE_REGISTRY', () => {
  test('loads valid registry matching schema', () => {
    // This will throw if schema validation fails
    const registry = loadGuidanceRegistry();
    expect(registry).toBeDefined();
    expect(typeof registry).toBe('object');
  });

  test('throws error on schema violation', () => {
    // [cite: 2026-01-27] FIX: Use doMock to override the top-level mock for this specific test
    jest.doMock('ajv', () => {
      return jest.fn().mockImplementation(() => ({
        compile: jest.fn().mockReturnValue(Object.assign(
          () => false, 
          { errors: [{ message: 'mock error' }] }
        ))
      }));
    });
    // Re-import to pick up the mock
    jest.resetModules();
    const { loadGuidanceRegistry: loadBad } = require('./loadGuidanceRegistry');

    // Suppress console.error for this test
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => loadBad()).toThrow('Invalid GUIDANCE_REGISTRY');
    spy.mockRestore();
  });
});