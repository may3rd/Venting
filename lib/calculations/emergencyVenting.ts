import { CalculationInput, DerivedGeometry, EmergencyVentingResult } from "@/types"
import { HEXANE_DEFAULTS } from "@/lib/constants"
import { getEnvironmentalFactor } from "@/lib/lookups/fFactor"
import { emergencyVentTableLookup } from "@/lib/lookups/emergencyVentTable"

/**
 * Select heat input coefficients (a, n) for Q = a × ATWS^n  (API 2000 §6.3 Table 3).
 *
 * Same coefficients for all API editions. Selected by wetted area and design pressure.
 */
function selectCoefficients(
  wettedAreaM2: number,
  designPressure: number,
): { a: number; n: number } {
  if (wettedAreaM2 < 18.6) return { a: 63_150, n: 1 }
  if (wettedAreaM2 < 93) return { a: 224_200, n: 0.566 }
  if (wettedAreaM2 < 260) return { a: 630_400, n: 0.338 }

  // ATWS ≥ 260
  return designPressure > 7
    ? { a: 43_200, n: 0.82 }
    : { a: 4_129_700, n: 0 }
}

// ─── Main computation ─────────────────────────────────────────────────────────

/**
 * Compute emergency venting requirements for fire exposure (API 2000 §6.3).
 *
 * Steps:
 *   1. Select heat input coefficients by ATWS + design pressure
 *   2. Q = a × ATWS^n  (W)
 *   3. F = environmental factor (from tank configuration / insulation)
 *   4. Vent rate:
 *        ATWS < 260          → V = F × Table 7 lookup  (all fluids)
 *        ATWS ≥ 260, Hexane  → V = simplified formula (API 2000 Eq. 16 / 17)
 *                                  DP ≤ 7: F × 19,910
 *                                  DP > 7: 208.2 × F × ATWS^0.82
 *        ATWS ≥ 260, user fluid → V = general formula (API 2000 Eq. 14)
 *                                  906.6 × Q × F / (1000 × L) × √((T_r+273.15)/M)
 *
 * Hexane defaults are used when L / T_r / M are not provided (per API 2000).
 * For user-defined fluids, actual values are used; Hexane defaults fill any gaps.
 */
export function computeEmergencyVenting(
  input: CalculationInput,
  derived: DerivedGeometry,
): EmergencyVentingResult {
  const {
    designPressure,
    latentHeat,
    relievingTemperature,
    molecularMass,
    tankConfiguration,
    insulationConductivity,
    insulationThickness,
  } = input

  const { wettedArea } = derived

  // Apply Hexane defaults when user left fields blank
  const L   = latentHeat           ?? HEXANE_DEFAULTS.latentHeat
  const T_r = relievingTemperature  ?? HEXANE_DEFAULTS.relievingTemperature
  const M   = molecularMass         ?? HEXANE_DEFAULTS.molecularMass

  const referenceFluid: "Hexane" | "User-defined" =
    latentHeat === undefined && relievingTemperature === undefined && molecularMass === undefined
      ? "Hexane"
      : "User-defined"

  // F — environmental factor
  const F = getEnvironmentalFactor(tankConfiguration, insulationConductivity, insulationThickness)

  // Heat input Q
  const coefficients = selectCoefficients(wettedArea, designPressure)
  const Q = coefficients.a * Math.pow(wettedArea, coefficients.n)

  // Emergency vent rate
  let emergencyVentRequired: number
  if (wettedArea < 260) {
    // ATWS < 260 → Table 7 lookup (pre-calculated for Hexane, F=1), scaled by F
    emergencyVentRequired = F * emergencyVentTableLookup(wettedArea)
  } else if (referenceFluid === "User-defined") {
    // User-specified fluid → general formula (API 2000 Eq. 14)
    // V = 906.6 × Q × F / (1000 × L) × √((T_r + 273.15) / M)
    emergencyVentRequired = (906.6 * Q * F) / (1000 * L) * Math.sqrt((T_r + 273.15) / M)
  } else if (designPressure <= 7) {
    // Hexane, ATWS ≥ 260, DP ≤ 7 → simplified fixed value (API 2000 Eq. 17)
    emergencyVentRequired = F * 19_910
  } else {
    // Hexane, ATWS ≥ 260, DP > 7 → simplified formula (API 2000 Eq. 16)
    // V = 208.2 × F × ATWS^0.82
    emergencyVentRequired = 208.2 * F * Math.pow(wettedArea, 0.82)
  }

  return {
    heatInput: Q,
    environmentalFactor: F,
    emergencyVentRequired,
    coefficients: { a: coefficients.a, n: coefficients.n },
    referenceFluid,
  }
}
