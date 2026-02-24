import { CalculationInput, DerivedGeometry, NormalVentingResult } from "@/types"
import { getYFactor } from "@/lib/lookups/yFactor"
import { getCFactor, isLowVolatility } from "@/lib/lookups/cFactor"
import { normalVentInbreathing, normalVentOutbreathing } from "@/lib/lookups/normalVentTable"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sumFlowrates(streams: readonly { flowrate: number }[]): number {
  return streams.reduce((acc, s) => acc + s.flowrate, 0)
}

// ─── Main computation ─────────────────────────────────────────────────────────

/**
 * Compute normal venting (outbreathing + inbreathing) for all API editions.
 *
 * Stream direction (process perspective, per PD.md §4.4):
 *   incomingStreams  → liquid arriving at the process FROM the tank
 *                      = tank liquid outflow → tank level drops → INBREATHING
 *   outgoingStreams  → liquid leaving the process TO the tank
 *                      = tank liquid inflow  → tank level rises → OUTBREATHING
 *
 * API edition differences:
 *   5th  – process inbreathing × 0.94; total = max(process, thermal)
 *   6th  – no 0.94 factor; total = process + thermal; no Y/C factor
 *   7th  – no 0.94 factor; total = process + thermal; Y/C factor applied
 *
 * Reduction factor R is applied to thermal venting for all editions.
 */
export function computeNormalVenting(
  input: CalculationInput,
  derived: DerivedGeometry,
): NormalVentingResult {
  const {
    apiEdition,
    incomingStreams,
    outgoingStreams,
    flashBoilingPointType,
    flashBoilingPoint,
    latitude,
  } = input

  const { maxTankVolume, reductionFactor } = derived

  const incomingTotal  = sumFlowrates(incomingStreams)
  const outgoingTotal  = sumFlowrates(outgoingStreams)
  const lowVol         = isLowVolatility(flashBoilingPointType, flashBoilingPoint)

  // Thermal lookup — same table for all editions; Y/C factor only for 7th
  const tableIn  = normalVentInbreathing(maxTankVolume)
  const tableOut = normalVentOutbreathing(maxTankVolume, lowVol)

  // ── 5th Edition ─────────────────────────────────────────────────────────────
  if (apiEdition === "5TH") {
    // Process inbreathing is multiplied by 0.94 per API 5th
    const processInbreathing  = 0.94 * incomingTotal
    const processOutbreathing = outgoingTotal
    const thermalIn  = tableIn  * reductionFactor
    const thermalOut = tableOut * reductionFactor

    return {
      outbreathing: {
        processFlowrate:    processOutbreathing,
        yFactor:            1,  // Y-factor not applicable in 5th edition
        reductionFactor,
        thermalOutbreathing: thermalOut,
        total:              Math.max(processOutbreathing, thermalOut),
      },
      inbreathing: {
        processFlowrate:    processInbreathing,
        cFactor:            1,  // C-factor not applicable in 5th edition
        reductionFactor,
        thermalInbreathing: thermalIn,
        total:              Math.max(processInbreathing, thermalIn),
      },
    }
  }

  // ── 6th Edition ─────────────────────────────────────────────────────────────
  if (apiEdition === "6TH") {
    const processInbreathing  = incomingTotal
    const processOutbreathing = outgoingTotal
    const thermalIn  = tableIn  * reductionFactor
    const thermalOut = tableOut * reductionFactor

    return {
      outbreathing: {
        processFlowrate:    processOutbreathing,
        yFactor:            1,  // Y-factor not applicable in 6th edition
        reductionFactor,
        thermalOutbreathing: thermalOut,
        total:              processOutbreathing + thermalOut,
      },
      inbreathing: {
        processFlowrate:    processInbreathing,
        cFactor:            1,  // C-factor not applicable in 6th edition
        reductionFactor,
        thermalInbreathing: thermalIn,
        total:              processInbreathing + thermalIn,
      },
    }
  }

  // ── 7th Edition ─────────────────────────────────────────────────────────────
  const processInbreathing  = incomingTotal
  const processOutbreathing = outgoingTotal

  const yFactor = getYFactor(latitude)
  const cFactor = getCFactor(latitude, flashBoilingPointType, flashBoilingPoint, maxTankVolume)

  const thermalOut = yFactor * tableOut * reductionFactor
  const thermalIn  = cFactor * tableIn  * reductionFactor

  return {
    outbreathing: {
      processFlowrate:    processOutbreathing,
      yFactor,
      reductionFactor,
      thermalOutbreathing: thermalOut,
      total:              processOutbreathing + thermalOut,
    },
    inbreathing: {
      processFlowrate:    processInbreathing,
      cFactor,
      reductionFactor,
      thermalInbreathing: thermalIn,
      total:              processInbreathing + thermalIn,
    },
  }
}
