import { parseVectorIntentKey, setByPath } from './ParametricReducerHelpers';

describe('ParametricReducerHelpers', () => {
  describe('parseVectorIntentKey', () => {
    test('parses valid keys', () => {
      expect(parseVectorIntentKey('vectorCol0Row0')).toEqual([0, 0]);
      expect(parseVectorIntentKey('vectorCol2Row1')).toEqual([1, 2]);
    });

    test('returns null for invalid keys', () => {
      expect(parseVectorIntentKey('invalid')).toBeNull();
      expect(parseVectorIntentKey('vectorColXRowY')).toBeNull();
      expect(parseVectorIntentKey(null)).toBeNull();
    });
  });

  describe('setByPath', () => {
    test('sets value at root path', () => {
      const obj = {};
      setByPath(obj, 'a', 1);
      expect(obj.a).toBe(1);
    });

    test('sets value at nested path', () => {
      const obj = {};
      setByPath(obj, 'a.b', 2);
      expect(obj.a.b).toBe(2);
    });

    test('handles array path', () => {
      const obj = {};
      setByPath(obj, ['x', 'y'], 3);
      expect(obj.x.y).toBe(3);
    });

    test('overwrites primitives to create objects', () => {
      const obj = { a: 1 };
      setByPath(obj, 'a.b', 2);
      expect(obj.a.b).toBe(2);
    });

    test('handles null path gracefully', () => {
      const obj = { a: 1 };
      setByPath(obj, null, 2);
      expect(obj.a).toBe(1);
    });
  });
});