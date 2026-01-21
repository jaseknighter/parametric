/**
 * Maps an intentKey like "vectorCol0Row2" to [rowIndex, columnIndex]
 * Returns null if the key is not a projection vector key.
 */
export function parseVectorIntentKey(intentKey) {
  const match = intentKey.match(/vectorCol(\d)Row(\d)/i);
  if (!match) return null;

  const col = parseInt(match[1], 10);
  const row = parseInt(match[2], 10);

  if (isNaN(row) || isNaN(col)) return null;

  return [row, col];
}

/**
 * setByPath
 * [cite: 2026-01-18] DUMB WRITER: Writes value to path, creating intermediates.
 * Does NOT clamp, validate, or normalize.
 */
export function setByPath(obj, path, value) {
  const keys = Array.isArray(path) ? path : path.split('.');
  let cursor = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    // Build the branch if it's missing or not an object
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  cursor[keys[keys.length - 1]] = value;
}