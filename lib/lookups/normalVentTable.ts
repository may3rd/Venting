import { interpolate } from "./interpolate"

/**
 * Normal Venting Table (API 2000 Table 1 / Table 2).
 *
 * Keyed on tank capacity (m³).  Three venting rates are tabulated:
 *   [0] Inbreathing            (Nm³/h)
 *   [1] Outbreathing, low-vol  (Nm³/h) — applies when FP ≥ 37.8 °C or BP ≥ 149 °C
 *   [2] Outbreathing, other    (Nm³/h) — all other fluids
 *
 * Interpolation follows Excel VLOOKUP(..., TRUE): linear between bracketing rows,
 * clamped at the table boundaries (no extrapolation).
 *
 * Source: extracted from Book1 1.xlsx tabs "API 2000 6th" and "API 2000 7th".
 */

// [capacity m³, inbreathing Nm³/h, out-low-vol Nm³/h, out-other Nm³/h]
type NormalVentRow = readonly [number, number, number, number]

const NORMAL_VENT_TABLE: readonly NormalVentRow[] = [
  [    10,    1.69,    1.01,    1.69],
  [    20,    3.38,    2.02,    3.38],
  [   100,   16.9,   10.1,    16.9 ],
  [   200,   33.8,   20.3,    33.8 ],
  [   300,   50.4,   30.4,    50.4 ],
  [   500,   84.4,   50.7,    84.5 ],
  [   700,  118,     71,     118   ],
  [  1000,  169,    101,     169   ],
  [  1500,  254,    152,     254   ],
  [  2000,  338,    203,     338   ],
  [  3000,  507,    304,     507   ],
  [  3180,  537,    322,     537   ],
  [  4000,  647,    388,     647   ],
  [  5000,  787,    472,     787   ],
  [  6000,  896,    538,     896   ],
  [ 10000, 1210,    726,    1210   ],
  [ 12000, 1345,    807,    1345   ],
  [ 14000, 1480,    888,    1480   ],
  [ 16000, 1615,    969,    1615   ],
  [ 18000, 1750,   1047,    1750   ],
  [ 25000, 2179,   1307,    2179   ],
  [ 30000, 2495,   1497,    2495   ],
]

/** Extract a two-column [capacity, value] sub-table for the given column index (1, 2, or 3). */
function buildColumn(colIdx: 1 | 2 | 3): readonly [number, number][] {
  return NORMAL_VENT_TABLE.map((row) => [row[0], row[colIdx]] as [number, number])
}

const INBREATHING_COL  = buildColumn(1)
const OUT_LOW_VOL_COL  = buildColumn(2)
const OUT_OTHER_COL    = buildColumn(3)

/**
 * Returns the tabulated inbreathing rate (Nm³/h) for a given capacity (m³).
 * Uses linear interpolation; clamped at table boundaries.
 */
export function normalVentInbreathing(capacityM3: number): number {
  return interpolate(capacityM3, INBREATHING_COL)
}

/**
 * Returns the tabulated outbreathing rate (Nm³/h).
 *
 * @param capacityM3  Tank capacity (m³)
 * @param lowVolatility  true  → use low-volatility column (FP ≥ 37.8 °C or BP ≥ 149 °C)
 *                       false → use "other" column
 */
export function normalVentOutbreathing(capacityM3: number, lowVolatility: boolean): number {
  return interpolate(capacityM3, lowVolatility ? OUT_LOW_VOL_COL : OUT_OTHER_COL)
}
