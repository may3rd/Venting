/**
 * Linear interpolation matching Excel VLOOKUP(..., TRUE) + manual interpolation behaviour.
 *
 * Rules:
 *  - table must be sorted ascending by x (first element of each pair)
 *  - if x ≤ first table x → return first y  (clamp, no extrapolation below)
 *  - if x ≥ last  table x → return last  y  (clamp, no extrapolation above)
 *  - otherwise → linear interpolate between the two bracketing rows
 */
export function interpolate(x: number, table: readonly [number, number][]): number {
  if (table.length === 0) throw new Error("interpolate: table must not be empty")
  if (table.length === 1) return table[0][1]

  // Clamp below
  if (x <= table[0][0]) return table[0][1]
  // Clamp above
  if (x >= table[table.length - 1][0]) return table[table.length - 1][1]

  // Find bracketing pair
  const upperIdx = table.findIndex(([xi]) => xi > x)
  const lower = table[upperIdx - 1]
  const upper = table[upperIdx]

  const [x0, y0] = lower
  const [x1, y1] = upper
  return y0 + ((y1 - y0) / (x1 - x0)) * (x - x0)
}
