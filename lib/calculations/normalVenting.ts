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
 * Stream direction (tank perspective, per UI labels):
 *   incomingStreams  → liquid entering the tank (to tank)
 *                      = tank level rises → vapour displaced → OUTBREATHING
 *   outgoingStreams  → liquid leaving the tank (from tank)
 *                      = tank level drops → air drawn in → INBREATHING
 *
 * API edition differences:
 *   5th  – process inbreathing × 0.94; process outbreathing uses FP/BP factor
 *          (FP >= 37.8 C or BP >= 149 C: 1.01x; FP < 37.8 C or BP < 149 C: 2.02x); total = max(process, thermal)
 *   6th  – process outbreathing = incoming × 1.0; process inbreathing has no 0.94 factor; total = process + thermal
 *   7th  – process outbreathing uses vapour-pressure factor (<= 5.0 kPa(a): 1.0x, > 5.0 kPa(a): 2.0x); total = process + thermal
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

  const incomingTotal = sumFlowrates(incomingStreams)
  const outgoingTotal = sumFlowrates(outgoingStreams)
  const lowVol = isLowVolatility(flashBoilingPointType, flashBoilingPoint)

  // Thermal lookup — table only used for 5th edition
  const tableIn = normalVentInbreathing(maxTankVolume)
  const tableOut = normalVentOutbreathing(maxTankVolume, lowVol)

  // ── 5th Edition ─────────────────────────────────────────────────────────────
  if (apiEdition === "5TH") {
    // Process inbreathing is multiplied by 0.94 per API 5th
    const processInbreathing = 0.94 * outgoingTotal
    // 5th edition process outbreathing from incoming liquid stream:
    //   FP >= 37.8 C or BP >= 149 C -> 1.01 x incoming total
    //   FP < 37.8 C or BP < 149 C   -> 2.02 x incoming total
    const processOutbreathing = (lowVol ? 1.01 : 2.02) * incomingTotal
    const thermalIn = tableIn * reductionFactor
    const thermalOut = tableOut * reductionFactor

    return {
      outbreathing: {
        processFlowrate: processOutbreathing,
        yFactor: 1,  // Y-factor not applicable in 5th edition
        reductionFactor,
        thermalOutbreathing: thermalOut,
        total: Math.max(processOutbreathing, thermalOut),
      },
      inbreathing: {
        processFlowrate: processInbreathing,
        cFactor: 1,  // C-factor not applicable in 5th edition
        reductionFactor,
        thermalInbreathing: thermalIn,
        total: Math.max(processInbreathing, thermalIn),
      },
    }
  }

  // ── 6th Edition ─────────────────────────────────────────────────────────────
  // Same formula as 7th: Y × V_tk^0.9 × R / C × V_tk^0.7 × R
  // Total = process + thermal
  if (apiEdition === "6TH") {
    const processInbreathing = outgoingTotal
    const processOutbreathing = 1.0 * incomingTotal

    const yFactor = getYFactor(latitude)
    const cFactor = getCFactor(latitude, flashBoilingPointType, flashBoilingPoint, maxTankVolume)

    const thermalOut = yFactor * Math.pow(maxTankVolume, 0.9) * reductionFactor
    const thermalIn = cFactor * Math.pow(maxTankVolume, 0.7) * reductionFactor

    return {
      outbreathing: {
        processFlowrate: processOutbreathing,
        yFactor,
        reductionFactor,
        thermalOutbreathing: thermalOut,
        total: processOutbreathing + thermalOut,
      },
      inbreathing: {
        processFlowrate: processInbreathing,
        cFactor,
        reductionFactor,
        thermalInbreathing: thermalIn,
        total: processInbreathing + thermalIn,
      },
    }
  }

  // ── 7th Edition ─────────────────────────────────────────────────────────────
  // Uses direct formulas (not table interpolation):
  //   Thermal outbreathing = Y × V_tk^0.9 × R
  //   Thermal inbreathing  = C × V_tk^0.7 × R
  const processInbreathing = outgoingTotal
  // 7th edition process outbreathing from incoming liquid stream:
  //   non-volatile (vapour pressure <= 5.0 kPa(a)) -> 1.0 x incoming total
  //   volatile (vapour pressure > 5.0 kPa(a))      -> 2.0 x incoming total
  const processOutbreathing = (input.vapourPressure > 5.0 ? 2.0 : 1.0) * incomingTotal

  const yFactor = getYFactor(latitude)
  const cFactor = getCFactor(latitude, flashBoilingPointType, flashBoilingPoint, maxTankVolume)

  const thermalOut = yFactor * Math.pow(maxTankVolume, 0.9) * reductionFactor
  const thermalIn = cFactor * Math.pow(maxTankVolume, 0.7) * reductionFactor

  return {
    outbreathing: {
      processFlowrate: processOutbreathing,
      yFactor,
      reductionFactor,
      thermalOutbreathing: thermalOut,
      total: processOutbreathing + thermalOut,
    },
    inbreathing: {
      processFlowrate: processInbreathing,
      cFactor,
      reductionFactor,
      thermalInbreathing: thermalIn,
      total: processInbreathing + thermalIn,
    },
  }
}
