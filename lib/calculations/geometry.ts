import { CalculationInput, DerivedGeometry, TankConfiguration } from "@/types"
import { CONE_ROOF_SLOPE, WETTED_AREA_HEIGHT_CAP_MM } from "@/lib/constants"

// ─── Pure geometric helpers ───────────────────────────────────────────────────

/**
 * Maximum tank volume (m³).
 *   V = π × (D/2)² × H
 * All inputs in mm; result in m³ (divide by 10⁹ to convert mm³ → m³).
 */
export function calcMaxTankVolume(diameterMm: number, heightMm: number): number {
  const r = diameterMm / 2
  return (Math.PI * r * r * heightMm) / 1e9
}

/**
 * Cylindrical shell surface area (m²).
 *   A_shell = π × D × H
 * All inputs in mm; result in m² (divide by 10⁶).
 */
export function calcShellSurfaceArea(diameterMm: number, heightMm: number): number {
  return (Math.PI * diameterMm * heightMm) / 1e6
}

/**
 * Cone roof lateral surface area (m²).
 *   slope: h_roof = D / CONE_ROOF_SLOPE  (1:12 per API 2000 / Excel reference)
 *   slant = √(r² + h_roof²)
 *   A_cone = π × r × slant
 * Input in mm; result in m².
 */
export function calcConeRoofArea(diameterMm: number): number {
  const rM = diameterMm / 2 / 1000               // radius in m
  const hRoofM = diameterMm / CONE_ROOF_SLOPE / 1000   // cone height in m
  const slant = Math.sqrt(rM * rM + hRoofM * hRoofM)
  return Math.PI * rM * slant
}

/**
 * Total exposed surface area (m²): shell + cone roof.
 */
export function calcTotalSurfaceArea(shellM2: number, coneRoofM2: number): number {
  return shellM2 + coneRoofM2
}

/**
 * Wetted surface area for fire exposure calculation (m²).
 *   A_wetted = min(A_shell, π × D × H_cap)
 *
 * The cap height is 9,144 mm (30 ft) per API 2000 §6.3.
 * Shell surface area is used as the reference — for tanks shorter than 9,144 mm the
 * full shell is exposed; for taller tanks only the bottom 30 ft contributes.
 */
export function calcWettedArea(diameterMm: number, heightMm: number): number {
  const fullShell = (Math.PI * diameterMm * heightMm) / 1e6
  const cappedShell = (Math.PI * diameterMm * WETTED_AREA_HEIGHT_CAP_MM) / 1e6
  return Math.min(fullShell, cappedShell)
}

// ─── Reduction factors ────────────────────────────────────────────────────────

/**
 * Insulation reduction factor R_in for a fully-insulated tank (API 2000 §7.5).
 *
 *   R_in = 1 / (1 + U_i × t / k)
 *
 * where:
 *   U_i = inside (film) heat-transfer coefficient  (W/m²·K)
 *   t   = insulation thickness                     (m)
 *   k   = insulation thermal conductivity          (W/m·K)
 */
export function calcR_in(
  insideHeatTransferCoeff: number,   // U_i  W/m²·K
  insulationThicknessMm: number,     // t    mm → converted internally
  insulationConductivity: number,    // k    W/m·K
): number {
  const tM = insulationThicknessMm / 1000
  return 1 / (1 + (insideHeatTransferCoeff * tM) / insulationConductivity)
}

/**
 * Combined reduction factor R_inp for a partially-insulated tank (API 2000 §7.5).
 *
 *   R_inp = (A_inp / A_TTS) × R_in  +  (1 − A_inp / A_TTS) × 1
 *
 * where:
 *   A_inp = insulated surface area  (m²)
 *   A_TTS = total tank surface area (m²)   (shell + cone roof)
 *   R_in  = fully-insulated reduction factor (from calcR_in)
 *
 * The uninsulated fraction contributes a factor of 1 (bare metal).
 */
export function calcR_inp(
  totalSurfaceAreaM2: number,    // A_TTS
  insulatedSurfaceAreaM2: number, // A_inp
  r_in: number,                  // from calcR_in
): number {
  const ratio = insulatedSurfaceAreaM2 / totalSurfaceAreaM2
  return ratio * r_in + (1 - ratio) * 1
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Compute all derived geometry values from the raw calculation input.
 *
 * Reduction factor selection:
 *   INSULATED_FULL    → R_in  (requires U_i, t, k)
 *   INSULATED_PARTIAL → R_inp (requires U_i, t, k, A_inp)
 *   All others        → 1.0   (no insulation reduction)
 */
export function computeDerivedGeometry(input: CalculationInput): DerivedGeometry {
  const { diameter, height, tankConfiguration } = input

  const shellSurfaceArea  = calcShellSurfaceArea(diameter, height)
  const coneRoofArea      = calcConeRoofArea(diameter)
  const totalSurfaceArea  = calcTotalSurfaceArea(shellSurfaceArea, coneRoofArea)
  const maxTankVolume     = calcMaxTankVolume(diameter, height)
  const wettedArea        = calcWettedArea(diameter, height)

  let reductionFactor = 1.0

  if (
    tankConfiguration === TankConfiguration.INSULATED_FULL ||
    tankConfiguration === TankConfiguration.INSULATED_PARTIAL
  ) {
    const {
      insideHeatTransferCoeff,
      insulationThickness,
      insulationConductivity,
    } = input

    if (
      insideHeatTransferCoeff === undefined ||
      insulationThickness     === undefined ||
      insulationConductivity  === undefined
    ) {
      throw new Error(
        "computeDerivedGeometry: insulation parameters are required for insulated configurations",
      )
    }

    const r_in = calcR_in(insideHeatTransferCoeff, insulationThickness, insulationConductivity)

    if (tankConfiguration === TankConfiguration.INSULATED_FULL) {
      reductionFactor = r_in
    } else {
      // INSULATED_PARTIAL
      const { insulatedSurfaceArea } = input
      if (insulatedSurfaceArea === undefined) {
        throw new Error(
          "computeDerivedGeometry: insulatedSurfaceArea is required for INSULATED_PARTIAL",
        )
      }
      reductionFactor = calcR_inp(totalSurfaceArea, insulatedSurfaceArea, r_in)
    }
  }

  return {
    maxTankVolume,
    shellSurfaceArea,
    coneRoofArea,
    totalSurfaceArea,
    wettedArea,
    reductionFactor,
  }
}
