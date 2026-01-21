import { updateObject } from './utility';

describe('Utility - updateObject', () => {
  test('correctly merges new properties into an object', () => {
    const oldObject = { a: 1, b: 2 };
    const updatedProps = { b: 3, c: 4 };
    const result = updateObject(oldObject, updatedProps);

    expect(result).toEqual({ a: 1, b: 3, c: 4 });
    // Ensure it's a new reference (immutability)
    expect(result).not.toBe(oldObject);
  });
});