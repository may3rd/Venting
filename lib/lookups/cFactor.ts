import { LATITUDE_BAND_LOW, LATITUDE_BAND_MID, FLASH_POINT_THRESHOLD, BOILING_POINT_THRESHOLD } from "@/lib/constants"
import { FlashBoilingPointType } from "@/types"

/**
 * C-factor for thermal inbreathing (API 2000 §5.3.2).
 *
 * The factor depends on three variables:
 *   1. Latitude band  (below 42° | 42°–58° | above 58°)
 *   2. Fluid class    (low-volatility if FP ≥ 37.8 °C or BP ≥ 149 °C, otherwise "other")
 *   3. Tank capacity  (< 25 m³  |  ≥ 25 m³)
 *
 * Table (from API 2000 Table 3 / Excel lookup):
 *
 *  Lat band     | Low-vol <25 | Low-vol ≥25 | Other <25 | Other ≥25
 *  below 42°    |     4       |    6.5      |    6.5    |    6.5
 *  42°–58°      |     3       |    5        |    5      |    5
 *  above 58°    |    2.5      |    4        |    4      |    4
 *
 * Note: "Other" columns are identical regardless of capacity for 42° and above bands.
 */

/** Returns true if the fluid is classified as "low volatility". */
export function isLowVolatility(
  flashBoilingPointType: FlashBoilingPointType,
  flashBoilingPoint: number | undefined,
): boolean {
  if (flashBoilingPoint === undefined) return false
  if (flashBoilingPointType === "FP") return flashBoilingPoint >= FLASH_POINT_THRESHOLD  // FP ≥ 37.8 °C
  return flashBoilingPoint >= BOILING_POINT_THRESHOLD                                    // BP ≥ 149 °C
}

export function getCFactor(
  latitude: number,
  flashBoilingPointType: FlashBoilingPointType,
  flashBoilingPoint: number | undefined,
  capacityM3: number,
): number {
  const lowVol = isLowVolatility(flashBoilingPointType, flashBoilingPoint)
  const smallTank = capacityM3 < 25

  if (latitude <= LATITUDE_BAND_LOW) {
    // below 42°
    if (lowVol && smallTank) return 4
    return 6.5
  }

  if (latitude <= LATITUDE_BAND_MID) {
    // 42°–58°
    if (lowVol && smallTank) return 3
    return 5
  }

  // above 58°
  if (lowVol && smallTank) return 2.5
  return 4
}
