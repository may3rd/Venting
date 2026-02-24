import { LATITUDE_BAND_LOW, LATITUDE_BAND_MID } from "@/lib/constants"

/**
 * Y-factor for thermal outbreathing (API 2000 §5.3.1).
 *
 * The factor depends solely on latitude band:
 *   0 < lat ≤ 42°  → 0.32
 *   42 < lat ≤ 58° → 0.25
 *   lat > 58°       → 0.20
 */
export function getYFactor(latitude: number): number {
  if (latitude <= LATITUDE_BAND_LOW) return 0.32
  if (latitude <= LATITUDE_BAND_MID) return 0.25
  return 0.20
}
