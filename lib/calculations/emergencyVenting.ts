import { CalculationInput, DerivedGeometry, EmergencyVentingResult, ApiEdition } from "@/types"
import { HEXANE_DEFAULTS } from "@/lib/constants"
import { getEnvironmentalFactor } from "@/lib/lookups/fFactor"
import { emergencyVentTableLookup } from "@/lib/lookups/emergencyVentTable"

// ─── Coefficient selection ────────────────────────────────────────────────────

/**
 * Select heat input coefficients (a, n) for Q = a × ATWS^n  (API 2000 §6.3 Table 3).
 *
 * API edition affects row selection for large ATWS:
 *
 *   7th edition:
 *     Row 3 (a=630,400, n=0.338) extends to ∞ — no upper limit at 260 m².
 *     This is confirmed by the reference case: ATWS=689.44 m² → Q=5,741,539 W.
 *
 *   5th/6th editions:
 *     Row 3 ends at 260 m² (the emergency vent table covers 0–260 m²).
 *     Above 260 m², rows 4/5 apply when the table cannot be used:
 *       ATWS ≥ 260 and DP > 7 → a=43,200, n=0.82
 *       ATWS ≥ 260 and DP ≤ 7 → a=4,129,700, n=0
 */
function selectCoefficients(
  wettedAreaM2: number,
  designPressure: number,
  apiEdition: ApiEdition,
): { a: number; n: number } {
  if (wettedAreaM2 < 18.6)  return { a:    63_150, n: 1     }
  if (wettedAreaM2 < 93)    return { a:   224_200, n: 0.566 }

  // 7th edition: row 3 extends to ∞
  // 5th/6th edition: row 3 applies only below 260 m²; above that use rows 4/5
  if (apiEdition === "7TH" || wettedAreaM2 < 260) {
    return { a: 630_400, n: 0.338 }
  }

  // 5th/6th, ATWS ≥ 260 (beyond emergency vent table)
  return designPressure > 7
    ? { a:   43_200, n: 0.82 }
    : { a: 4_129_700, n: 0   }
}

// ─── Main computation ─────────────────────────────────────────────────────────

/**
 * Compute emergency venting requirements for fire exposure (API 2000 §6.3).
 *
 * Steps:
 *   1. Select heat input coefficients by ATWS + design pressure + API edition
 *   2. Q = a × ATWS^n  (W)
 *   3. F = environmental factor (from tank configuration / insulation table)
 *   4. Vent rate:
 *        5th/6th, ATWS ≤ 260 m² → V = F × emergencyVentTableLookup(ATWS)
 *        7th edition or ATWS > 260 → V = (906.6 × Q × F) / (1000 × L) × √((T_r+273.15)/M)
 *
 * Hexane defaults are used when latentHeat / relievingTemperature / molecularMass
 * are not provided by the user (per API 2000 recommendation).
 */
export function computeEmergencyVenting(
  input: CalculationInput,
  derived: DerivedGeometry,
): EmergencyVentingResult {
  const {
    designPressure,
    apiEdition,
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
  const coefficients = selectCoefficients(wettedArea, designPressure, apiEdition)
  const Q = coefficients.a * Math.pow(wettedArea, coefficients.n)

  // Emergency vent rate
  let emergencyVentRequired: number
  if (apiEdition !== "7TH" && wettedArea <= 260) {
    // 5th/6th edition: use tabulated vent rate (pre-calculated for F=1), scale by F
    emergencyVentRequired = F * emergencyVentTableLookup(wettedArea)
  } else {
    // 7th edition (or 5th/6th with ATWS > 260): use API formula
    emergencyVentRequired =
      (906.6 * Q * F) / (1000 * L) * Math.sqrt((T_r + 273.15) / M)
  }

  return {
    heatInput:             Q,
    environmentalFactor:   F,
    emergencyVentRequired,
    coefficients:          { a: coefficients.a, n: coefficients.n },
    referenceFluid,
  }
}
