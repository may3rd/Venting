import { CalculationInput, CalculationResult } from "@/types"
import { CAPACITY_WARNING_M3 } from "@/lib/constants"
import { computeDerivedGeometry } from "./geometry"
import { computeNormalVenting } from "./normalVenting"
import { computeEmergencyVenting } from "./emergencyVenting"
import { computeDrainInbreathing } from "./drain"

/**
 * Full tank venting calculation orchestrator.
 *
 * Steps:
 *   1. Derive geometry (volume, surface areas, reduction factor)
 *   2. Normal venting (outbreathing + inbreathing per selected API edition)
 *   3. Emergency venting (fire exposure heat input → vent rate)
 *   4. Drain inbreathing (optional, only when drain data is provided)
 *   5. Summary (design governing values + warnings)
 */
export function calculate(input: CalculationInput): CalculationResult {
  // ── 1. Derived geometry ──────────────────────────────────────────────────────
  const derived = computeDerivedGeometry(input)

  // ── 2. Normal venting ────────────────────────────────────────────────────────
  const normalVenting = computeNormalVenting(input, derived)

  // ── 3. Emergency venting ─────────────────────────────────────────────────────
  const emergencyVenting = computeEmergencyVenting(input, derived)

  // ── 4. Drain inbreathing (optional) ─────────────────────────────────────────
  let drainInbreathing: number | undefined
  if (input.drainLineSize !== undefined && input.maxHeightAboveDrain !== undefined) {
    drainInbreathing = computeDrainInbreathing(input.drainLineSize, input.maxHeightAboveDrain)
  }

  // ── 5. Summary ───────────────────────────────────────────────────────────────
  // Design inbreathing governs the inbreathing device: normal inbreathing or drain (whichever larger)
  const designInbreathing = Math.max(
    normalVenting.inbreathing.total,
    drainInbreathing ?? 0,
  )

  const summary = {
    designOutbreathing: normalVenting.outbreathing.total,
    designInbreathing,
    emergencyVenting:   emergencyVenting.emergencyVentRequired,
  }

  // ── Warnings ─────────────────────────────────────────────────────────────────
  const warnings = {
    capacityExceedsTable: derived.maxTankVolume > CAPACITY_WARNING_M3,
    undergroundTank:      emergencyVenting.environmentalFactor === 0,
    hexaneDefaults:
      input.latentHeat           === undefined ||
      input.relievingTemperature === undefined ||
      input.molecularMass        === undefined,
  }

  return {
    derived,
    normalVenting,
    emergencyVenting,
    drainInbreathing,
    summary,
    warnings,
    apiEdition:    input.apiEdition,
    calculatedAt:  new Date().toISOString(),
  }
}
