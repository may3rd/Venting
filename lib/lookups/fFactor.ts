import { TankConfiguration } from "@/types"
import { FIXED_ENVIRONMENTAL_FACTORS } from "@/lib/constants"
import { interpolate } from "./interpolate"

/**
 * F-factor (environmental factor) lookup for insulated tanks (API 2000 §7.5).
 *
 * For insulated configurations the F-factor is determined from the insulation
 * conductance U = k / t (W/m²·K), where:
 *   k = insulation conductivity (W/m·K)
 *   t = insulation thickness    (m)
 *
 * Reference table (API 2000 Table 5):
 *
 *  Conductance (W/m²·K) | Thickness (mm) | F
 *  22.7                 |  25            | 0.300
 *  11.4                 |  51            | 0.150
 *   5.7                 | 102            | 0.075
 *   3.8                 | 152            | 0.050
 *   2.8                 | 203            | 0.0375
 *   2.3                 | 254            | 0.030
 *   1.9                 | 305            | 0.025
 *
 * Values below the lowest conductance (1.9 W/m²·K) are clamped to F = 0.025.
 * Values above the highest conductance (22.7 W/m²·K) are clamped to F = 0.300.
 *
 * Linear interpolation is used between table rows (matching Excel VLOOKUP TRUE).
 */

/** [conductance W/m²·K, F-factor] pairs — must be sorted ascending by conductance */
const F_FACTOR_TABLE: readonly [number, number][] = [
  [1.9,  0.025],
  [2.3,  0.030],
  [2.8,  0.0375],
  [3.8,  0.050],
  [5.7,  0.075],
  [11.4, 0.150],
  [22.7, 0.300],
]

/**
 * Returns the F-factor for an insulated tank.
 *
 * @param conductivityWmK  Insulation thermal conductivity (W/m·K)
 * @param thicknessMm      Insulation thickness (mm)
 */
export function getFFactorInsulated(conductivityWmK: number, thicknessMm: number): number {
  const thicknessM = thicknessMm / 1000
  const conductance = conductivityWmK / thicknessM   // U = k/t  (W/m²·K)
  return interpolate(conductance, F_FACTOR_TABLE)
}

/**
 * Returns the environmental F-factor for any tank configuration.
 *
 * For non-insulated configs the value is a fixed constant (from FIXED_ENVIRONMENTAL_FACTORS).
 * For INSULATED_FULL and INSULATED_PARTIAL the value is computed from the
 * insulation parameters.
 *
 * @param config           Tank configuration
 * @param conductivityWmK  Insulation conductivity (W/m·K) — required for insulated configs
 * @param thicknessMm      Insulation thickness (mm)       — required for insulated configs
 */
export function getEnvironmentalFactor(
  config: TankConfiguration,
  conductivityWmK?: number,
  thicknessMm?: number,
): number {
  const fixed = FIXED_ENVIRONMENTAL_FACTORS[config]
  if (fixed !== undefined) return fixed

  // Insulated configs — must have conductivity and thickness
  if (conductivityWmK === undefined || thicknessMm === undefined) {
    throw new Error(
      `getEnvironmentalFactor: insulation parameters required for config "${config}"`,
    )
  }
  return getFFactorInsulated(conductivityWmK, thicknessMm)
}
