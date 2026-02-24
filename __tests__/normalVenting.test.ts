import { describe, it, expect } from "vitest"
import { computeNormalVenting } from "@/lib/calculations/normalVenting"
import { computeDerivedGeometry } from "@/lib/calculations/geometry"
import { normalVentInbreathing, normalVentOutbreathing } from "@/lib/lookups/normalVentTable"
import { TankConfiguration } from "@/types"
import type { CalculationInput, DerivedGeometry } from "@/types"

// ─── Reference geometry (pre-computed for speed) ──────────────────────────────
const REF_INPUT: CalculationInput = {
  tankNumber: "TK-3120",
  diameter: 24_000,
  height: 17_500,
  latitude: 12.7,
  designPressure: 101.32,
  tankConfiguration: TankConfiguration.BARE_METAL,
  avgStorageTemp: 35,
  vapourPressure: 5.6,
  flashBoilingPointType: "FP",
  incomingStreams: [],
  outgoingStreams: [{ streamNo: "S-1", flowrate: 368.9 }],
  apiEdition: "7TH",
}

const REF_DERIVED: DerivedGeometry = computeDerivedGeometry(REF_INPUT)

// ─── Helper to build inputs with specific streams + edition ───────────────────
function makeInput(overrides: Partial<CalculationInput>): CalculationInput {
  return { ...REF_INPUT, ...overrides }
}

// ─── 7th Edition ─────────────────────────────────────────────────────────────

describe("computeNormalVenting — 7th edition", () => {
  it("reference case: processOutbreathing = 0 (no incoming streams to tank)", () => {
    const r = computeNormalVenting(REF_INPUT, REF_DERIVED)
    expect(r.outbreathing.processFlowrate).toBeCloseTo(0, 5)
    expect(r.inbreathing.processFlowrate).toBeCloseTo(368.9, 5)
  })

  it("reference case: yFactor = 0.32 (lat < 42°)", () => {
    const r = computeNormalVenting(REF_INPUT, REF_DERIVED)
    expect(r.outbreathing.yFactor).toBe(0.32)
  })

  it("reference case: cFactor = 6.5 (lat<42°, no FP, cap>25m³)", () => {
    const r = computeNormalVenting(REF_INPUT, REF_DERIVED)
    expect(r.inbreathing.cFactor).toBe(6.5)
  })

  it("reference case: reductionFactor = 1.0 (bare metal)", () => {
    const r = computeNormalVenting(REF_INPUT, REF_DERIVED)
    expect(r.outbreathing.reductionFactor).toBe(1.0)
    expect(r.inbreathing.reductionFactor).toBe(1.0)
  })

  it("reference case: thermal outbreathing = Y × V_tk^0.9 × R", () => {
    const cap = REF_DERIVED.maxTankVolume
    const expected = 0.32 * Math.pow(cap, 0.9) * 1.0
    const r = computeNormalVenting(REF_INPUT, REF_DERIVED)
    expect(r.outbreathing.thermalOutbreathing).toBeCloseTo(expected, 5)
  })

  it("reference case: thermal inbreathing = C × V_tk^0.7 × R", () => {
    const cap = REF_DERIVED.maxTankVolume
    const expected = 6.5 * Math.pow(cap, 0.7) * 1.0
    const r = computeNormalVenting(REF_INPUT, REF_DERIVED)
    expect(r.inbreathing.thermalInbreathing).toBeCloseTo(expected, 5)
  })

  it("reference case: total = process + thermal (7th edition sums)", () => {
    const r = computeNormalVenting(REF_INPUT, REF_DERIVED)
    expect(r.outbreathing.total).toBeCloseTo(
      r.outbreathing.processFlowrate + r.outbreathing.thermalOutbreathing, 8,
    )
    expect(r.inbreathing.total).toBeCloseTo(
      r.inbreathing.processFlowrate + r.inbreathing.thermalInbreathing, 8,
    )
  })

  it("multiple outgoing streams (from tank): sums all flowrates for inbreathing", () => {
    const input = makeInput({
      outgoingStreams: [
        { streamNo: "S-1", flowrate: 100 },
        { streamNo: "S-2", flowrate: 200 },
      ],
    })
    const r = computeNormalVenting(input, REF_DERIVED)
    expect(r.inbreathing.processFlowrate).toBeCloseTo(300, 8)
  })

  it("multiple incoming streams (to tank): applies VP multiplier to summed flow for outbreathing", () => {
    const input = makeInput({
      incomingStreams: [
        { streamNo: "S-3", flowrate: 50 },
        { streamNo: "S-4", flowrate: 75 },
      ],
    })
    const r = computeNormalVenting(input, REF_DERIVED)
    // REF_INPUT vapourPressure is 5.6 kPa(a) -> volatile -> 2.0 x incoming total
    expect(r.outbreathing.processFlowrate).toBeCloseTo(250, 8)
  })

  it("vapour pressure threshold: <= 5.0 kPa(a) uses 1.0 x incoming total", () => {
    const input = makeInput({
      vapourPressure: 5.0,
      incomingStreams: [{ streamNo: "S-7", flowrate: 150 }],
    })
    const r = computeNormalVenting(input, REF_DERIVED)
    expect(r.outbreathing.processFlowrate).toBeCloseTo(150, 8)
  })

  it("vapour pressure above threshold: > 5.0 kPa(a) uses 2.0 x incoming total", () => {
    const input = makeInput({
      vapourPressure: 5.1,
      incomingStreams: [{ streamNo: "S-8", flowrate: 150 }],
    })
    const r = computeNormalVenting(input, REF_DERIVED)
    expect(r.outbreathing.processFlowrate).toBeCloseTo(300, 8)
  })

  it("low-volatility fluid: uses lower Y-factor column (same formula)", () => {
    // FP=50 ≥ 37.8 → low volatility → same Y but C changes for inbreathing
    const inputHighFP = makeInput({ flashBoilingPointType: "FP", flashBoilingPoint: 50 })
    const inputLowFP = makeInput({ flashBoilingPointType: "FP", flashBoilingPoint: 10 })
    // Outbreathing uses V_tk^0.9 (same for both), Y-factor is same (only lat-dependent)
    // So outbreathing is the same for both. Inbreathing uses different C-factor.
    const rHigh = computeNormalVenting(inputHighFP, REF_DERIVED)
    const rLow = computeNormalVenting(inputLowFP, REF_DERIVED)
    // Both should have same thermal outbreathing (Y only depends on latitude)
    expect(rHigh.outbreathing.thermalOutbreathing).toBeCloseTo(rLow.outbreathing.thermalOutbreathing, 5)
  })

  it("insulated tank: reductionFactor < 1 reduces thermal venting", () => {
    const insulatedInput: CalculationInput = {
      ...REF_INPUT,
      tankConfiguration: TankConfiguration.INSULATED_FULL,
      insulationThickness: 102,
      insulationConductivity: 0.05,
      insideHeatTransferCoeff: 5.7,
    }
    const insulatedDerived = computeDerivedGeometry(insulatedInput)
    const rBare = computeNormalVenting(REF_INPUT, REF_DERIVED)
    const rInsulated = computeNormalVenting(insulatedInput, insulatedDerived)
    expect(rInsulated.outbreathing.thermalOutbreathing)
      .toBeLessThan(rBare.outbreathing.thermalOutbreathing)
    expect(rInsulated.inbreathing.thermalInbreathing)
      .toBeLessThan(rBare.inbreathing.thermalInbreathing)
  })
})

// ─── 6th Edition ─────────────────────────────────────────────────────────────

describe("computeNormalVenting — 6th edition", () => {
  const input6 = makeInput({ apiEdition: "6TH" })

  it("process outbreathing (6th): 1.0 × sum of incoming flowrates", () => {
    const inputWithIn = makeInput({
      apiEdition: "6TH",
      incomingStreams: [{ streamNo: "S-9", flowrate: 123.4 }],
    })
    const r = computeNormalVenting(inputWithIn, REF_DERIVED)
    expect(r.outbreathing.processFlowrate).toBeCloseTo(123.4, 8)
  })

  it("yFactor and cFactor are applied (same as 7th ed)", () => {
    const r = computeNormalVenting(input6, REF_DERIVED)
    expect(r.outbreathing.yFactor).toBe(0.32) // lat 12.7° < 42°
    expect(r.inbreathing.cFactor).toBe(6.5)   // lat<42°, not low-vol, cap>25m³
  })

  it("total = process + thermal (summation logic)", () => {
    const r = computeNormalVenting(input6, REF_DERIVED)
    expect(r.outbreathing.total).toBeCloseTo(
      r.outbreathing.processFlowrate + r.outbreathing.thermalOutbreathing, 8,
    )
    expect(r.inbreathing.total).toBeCloseTo(
      r.inbreathing.processFlowrate + r.inbreathing.thermalInbreathing, 8,
    )
  })

  it("thermal = Y/C × V_tk^0.9/0.7 × R (same formula as 7th)", () => {
    const cap = REF_DERIVED.maxTankVolume
    const r = computeNormalVenting(input6, REF_DERIVED)
    expect(r.outbreathing.thermalOutbreathing).toBeCloseTo(
      0.32 * Math.pow(cap, 0.9) * 1.0, 5,
    )
    expect(r.inbreathing.thermalInbreathing).toBeCloseTo(
      6.5 * Math.pow(cap, 0.7) * 1.0, 5,
    )
  })

  it("6th and 7th thermal outbreathing are identical (same formula)", () => {
    const r6 = computeNormalVenting(input6, REF_DERIVED)
    const r7 = computeNormalVenting(REF_INPUT, REF_DERIVED)
    expect(r6.outbreathing.thermalOutbreathing).toBeCloseTo(r7.outbreathing.thermalOutbreathing, 5)
  })
})

// ─── 5th Edition ─────────────────────────────────────────────────────────────

describe("computeNormalVenting — 5th edition", () => {
  const input5 = makeInput({ apiEdition: "5TH" })

  it("yFactor = 1, cFactor = 1 (not applied in 5th ed)", () => {
    const r = computeNormalVenting(input5, REF_DERIVED)
    expect(r.outbreathing.yFactor).toBe(1)
    expect(r.inbreathing.cFactor).toBe(1)
  })

  it("process inbreathing = 0.94 × sum of outgoing (from tank) flowrates", () => {
    const inputWithOut = makeInput({
      apiEdition: "5TH",
      outgoingStreams: [{ streamNo: "S-1", flowrate: 200 }],
    })
    const r = computeNormalVenting(inputWithOut, REF_DERIVED)
    expect(r.inbreathing.processFlowrate).toBeCloseTo(0.94 * 200, 8)
  })

  it("process outbreathing (5th, FP>=37.8): 1.01 × sum of incoming flowrates", () => {
    const inputWithIn = makeInput({
      apiEdition: "5TH",
      flashBoilingPointType: "FP",
      flashBoilingPoint: 37.8,
      incomingStreams: [{ streamNo: "S-2", flowrate: 100 }],
      outgoingStreams: [],
    })
    const r = computeNormalVenting(inputWithIn, REF_DERIVED)
    expect(r.outbreathing.processFlowrate).toBeCloseTo(101, 5)
  })

  it("process outbreathing (5th, BP>=149): 1.01 × sum of incoming flowrates", () => {
    const inputWithIn = makeInput({
      apiEdition: "5TH",
      flashBoilingPointType: "BP",
      flashBoilingPoint: 149,
      incomingStreams: [{ streamNo: "S-2", flowrate: 100 }],
      outgoingStreams: [],
    })
    const r = computeNormalVenting(inputWithIn, REF_DERIVED)
    expect(r.outbreathing.processFlowrate).toBeCloseTo(101, 5)
  })

  it("process outbreathing (5th, FP<37.8): 2.02 × sum of incoming flowrates", () => {
    const inputWithIn = makeInput({
      apiEdition: "5TH",
      flashBoilingPointType: "FP",
      flashBoilingPoint: 37.7,
      incomingStreams: [{ streamNo: "S-2", flowrate: 100 }],
      outgoingStreams: [],
    })
    const r = computeNormalVenting(inputWithIn, REF_DERIVED)
    expect(r.outbreathing.processFlowrate).toBeCloseTo(202, 5)
  })

  it("total = max(process, thermal) for outbreathing", () => {
    // process = 368.9, thermal = tableOut × R
    const r = computeNormalVenting(input5, REF_DERIVED)
    const expected = Math.max(r.outbreathing.processFlowrate, r.outbreathing.thermalOutbreathing)
    expect(r.outbreathing.total).toBeCloseTo(expected, 8)
  })

  it("total = max(process, thermal) for inbreathing", () => {
    const r = computeNormalVenting(input5, REF_DERIVED)
    const expected = Math.max(r.inbreathing.processFlowrate, r.inbreathing.thermalInbreathing)
    expect(r.inbreathing.total).toBeCloseTo(expected, 8)
  })

  it("when thermal > process, total equals thermal", () => {
    // Zero incoming streams → process inbreathing = 0 → total = thermal
    const r = computeNormalVenting(input5, REF_DERIVED)
    // process inbreathing is 0 (no incoming streams in REF_INPUT)
    expect(r.inbreathing.total).toBeCloseTo(r.inbreathing.thermalInbreathing, 8)
  })

  it("when process > thermal, total equals process", () => {
    // Use a very high incoming (to tank) flowrate so process outbreathing > thermal
    const inputHighFlow = makeInput({
      apiEdition: "5TH",
      incomingStreams: [{ streamNo: "S-1", flowrate: 50_000 }],
      outgoingStreams: [],
    })
    const r = computeNormalVenting(inputHighFlow, REF_DERIVED)
    expect(r.outbreathing.total).toBeCloseTo(r.outbreathing.processFlowrate, 8)
  })
})
