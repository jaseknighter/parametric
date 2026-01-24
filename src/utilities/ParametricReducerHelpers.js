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