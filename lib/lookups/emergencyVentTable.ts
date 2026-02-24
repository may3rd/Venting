import { interpolate } from "./interpolate"

/**
 * Emergency Venting Table (API 2000 5th / 6th edition, Table 4).
 *
 * Used for wetted surface areas ≤ 260 m² with design pressure ≤ 103.4 kPag.
 * For areas > 260 m² with DP > 7 kPag, the 7th-edition formula is used instead.
 *
 * Keyed on wetted surface area (m²); values are emergency vent rates (Nm³/h).
 *
 * Source: extracted from Book1 1.xlsx tab "API 2000 6th".
 */

// [wetted area m², vent rate Nm³/h]
const EMERGENCY_VENT_TABLE: readonly [number, number][] = [
  [   2,   608],
  [   3,   913],
  [   9,  2738],
  [  11,  3347],
  [  13,  3955],
  [  15,  4563],
  [  17,  5172],
  [  19,  5780],
  [  22,  6217],
  [  25,  6684],
  [  30,  7411],
  [  35,  8086],
  [  40,  8721],
  [  45,  9322],
  [  50,  9895],
  [  60, 10971],
  [  70, 11971],
  [  80, 12911],
  [  90, 13801],
  [ 110, 15461],
  [ 130, 15751],
  [ 150, 16532],
  [ 175, 17416],
  [ 200, 18220],
  [ 230, 19102],
  [ 260, 19910],
]

/**
 * Returns the emergency vent rate (Nm³/h) from the 5th/6th-edition table.
 *
 * Linear interpolation; clamped at boundaries (no extrapolation).
 * The table's maximum useful area is 260 m² — callers should use the
 * 7th-edition formula for larger areas with DP > 7 kPag.
 */
export function emergencyVentTableLookup(wettedAreaM2: number): number {
  return interpolate(wettedAreaM2, EMERGENCY_VENT_TABLE)
}

/** Maximum wetted area covered by the emergency vent table (m²). */
export const EMERGENCY_VENT_TABLE_MAX_AREA_M2 = 260
