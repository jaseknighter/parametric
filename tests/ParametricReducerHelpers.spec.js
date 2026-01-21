import { test, expect } from '@playwright/test';
import { parseVectorIntentKey, setByPath } from '../src/services/ParametricReducerHelpers.js';

test.describe('Unit: ParametricReducerHelpers', () => {
  test.describe('parseVectorIntentKey', () => {
    test('correctly parses valid 3x3 matrix keys', () => {
      expect(parseVectorIntentKey('vectorCol0Row0')).toEqual([0, 0]);
      expect(parseVectorIntentKey('vectorCol2Row1')).toEqual([1, 2]);
    });

    test('returns null for invalid or non-matching keys', () => {
      expect(parseVectorIntentKey('invalidKey')).toBeNull();
      expect(parseVectorIntentKey('vectorColXRowY')).toBeNull();
    });

    test('is case insensitive', () => {
      expect(parseVectorIntentKey('VECTORCOL0ROW0')).toEqual([0, 0]);
    });
  });

  test.describe('setByPath', () => {
    test('writes value to simple path', () => {
      const obj = { a: 1 };
      setByPath(obj, 'a', 2);
      expect(obj.a).toBe(2);
    });

    test('writes value to nested path, creating intermediates', () => {
      const obj = {};
      setByPath(obj, 'a.b.c', 3);
      expect(obj.a.b.c).toBe(3);
    });

    test('handles array path input', () => {
      const obj = {};
      setByPath(obj, ['x', 'y'], 4);
      expect(obj.x.y).toBe(4);
    });

    test('overwrites existing non-object intermediates if necessary', () => {
      const obj = { a: 1 };
      setByPath(obj, 'a.b', 2);
      expect(obj.a.b).toBe(2);
    });

    test('creates object structure from scratch', () => {
      const obj = {};
      setByPath(obj, 'transformationInstructions.shaping.radius', 5);
      expect(obj.transformationInstructions.shaping.radius).toBe(5);
    });
  });
});