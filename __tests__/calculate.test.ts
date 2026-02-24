import { describe, it, expect } from "vitest"
import { calculate } from "@/lib/calculations"
import { TankConfiguration } from "@/types"
import type { CalculationInput } from "@/types"

// ─── Reference input (from PD.md §15 / Excel reference) ──────────────────────
const REF: CalculationInput = {
  tankNumber:            "TK-3120",
  diameter:              24_000,   // mm
  height:                17_500,   // mm
  latitude:              12.7,
  designPressure:        101.32,   // kPag
  tankConfiguration:     TankConfiguration.BARE_METAL,
  avgStorageTemp:        35,
  vapourPressure:        5.6,
  flashBoilingPointType: "FP",
  incomingStreams:       [],
  outgoingStreams:       [{ streamNo: "S-1", flowrate: 368.9 }],
  apiEdition:            "7TH",
  // latentHeat / relievingTemperature / molecularMass left blank → Hexane defaults
}

// ─── Integration: full reference case ────────────────────────────────────────

describe("calculate — reference case (7th ed, bare metal, 24000×17500)", () => {
  const result = calculate(REF)

  // Geometry
  it("maxTankVolume ≈ 7916.81 m³", () => {
    expect(result.derived.maxTankVolume).toBeCloseTo(7916.81, 1)
  })

  it("shellSurfaceArea ≈ 1319.47 m²", () => {
    expect(result.derived.shellSurfaceArea).toBeCloseTo(1319.47, 1)
  })

  it("wettedArea ≈ 689.44 m²", () => {
    expect(result.derived.wettedArea).toBeCloseTo(689.44, 1)
  })

  it("reductionFactor = 1.0 (bare metal)", () => {
    expect(result.derived.reductionFactor).toBe(1.0)
  })

  // Emergency venting
  it("heatInput ≈ 5,741,539 W", () => {
    expect(result.emergencyVenting.heatInput).toBeCloseTo(5_741_539, -2)
  })

  it("environmentalFactor = 1.0", () => {
    expect(result.emergencyVenting.environmentalFactor).toBe(1.0)
  })

  it("emergencyVentRequired ≈ 28,452 Nm³/h", () => {
    expect(result.emergencyVenting.emergencyVentRequired).toBeCloseTo(28_452, -2)
  })

  it("referenceFluid = 'Hexane' (all defaults used)", () => {
    expect(result.emergencyVenting.referenceFluid).toBe("Hexane")
  })

  // Normal venting
  it("processOutbreathing = 368.9 Nm³/h", () => {
    expect(result.normalVenting.outbreathing.processFlowrate).toBeCloseTo(368.9, 4)
  })

  it("processInbreathing = 0 (no incoming streams)", () => {
    expect(result.normalVenting.inbreathing.processFlowrate).toBeCloseTo(0, 8)
  })

  it("yFactor = 0.32 (latitude 12.7° < 42°)", () => {
    expect(result.normalVenting.outbreathing.yFactor).toBe(0.32)
  })

  it("cFactor = 6.5 (lat<42°, not low-vol, cap>25m³)", () => {
    expect(result.normalVenting.inbreathing.cFactor).toBe(6.5)
  })

  // Summary
  it("summary.designOutbreathing matches normalVenting.outbreathing.total", () => {
    expect(result.summary.designOutbreathing).toBeCloseTo(
      result.normalVenting.outbreathing.total, 8,
    )
  })

  it("summary.designInbreathing matches normalVenting.inbreathing.total (no drain)", () => {
    expect(result.summary.designInbreathing).toBeCloseTo(
      result.normalVenting.inbreathing.total, 8,
    )
  })

  it("summary.emergencyVenting matches emergencyVentRequired", () => {
    expect(result.summary.emergencyVenting).toBeCloseTo(
      result.emergencyVenting.emergencyVentRequired, 8,
    )
  })

  // Warnings
  it("hexaneDefaults = true (L, T_r, M all defaulted)", () => {
    expect(result.warnings.hexaneDefaults).toBe(true)
  })

  it("capacityExceedsTable = false (7916 m³ < 30000 m³)", () => {
    expect(result.warnings.capacityExceedsTable).toBe(false)
  })

  it("undergroundTank = false (bare metal, F=1)", () => {
    expect(result.warnings.undergroundTank).toBe(false)
  })

  // Metadata
  it("apiEdition = '7TH'", () => {
    expect(result.apiEdition).toBe("7TH")
  })

  it("calculatedAt is a valid ISO timestamp", () => {
    expect(() => new Date(result.calculatedAt)).not.toThrow()
    expect(new Date(result.calculatedAt).getTime()).toBeGreaterThan(0)
  })

  it("drainInbreathing is undefined (no drain input)", () => {
    expect(result.drainInbreathing).toBeUndefined()
  })
})

// ─── Drain system integration ─────────────────────────────────────────────────

describe("calculate — with drain system", () => {
  const withDrain: CalculationInput = {
    ...REF,
    drainLineSize:      200,    // mm
    maxHeightAboveDrain: 5_000, // mm
  }

  it("drainInbreathing is defined and positive", () => {
    const r = calculate(withDrain)
    expect(r.drainInbreathing).toBeDefined()
    expect(r.drainInbreathing).toBeGreaterThan(0)
  })

  it("designInbreathing = max(normalIn, drainIn)", () => {
    const r = calculate(withDrain)
    const expected = Math.max(
      r.normalVenting.inbreathing.total,
      r.drainInbreathing ?? 0,
    )
    expect(r.summary.designInbreathing).toBeCloseTo(expected, 8)
  })
})

// ─── Underground tank ─────────────────────────────────────────────────────────

describe("calculate — underground tank", () => {
  const underground: CalculationInput = {
    ...REF,
    tankConfiguration: TankConfiguration.UNDERGROUND,
  }

  it("F = 0 → emergencyVentRequired = 0", () => {
    const r = calculate(underground)
    expect(r.emergencyVenting.environmentalFactor).toBe(0)
    expect(r.emergencyVenting.emergencyVentRequired).toBe(0)
  })

  it("undergroundTank warning = true", () => {
    const r = calculate(underground)
    expect(r.warnings.undergroundTank).toBe(true)
  })
})

// ─── Large tank (capacity warning) ───────────────────────────────────────────

describe("calculate — tank capacity > 30,000 m³", () => {
  // D=50000mm, H=18000mm → V ≈ 35,343 m³
  const largeTank: CalculationInput = {
    ...REF,
    diameter: 50_000,
    height:   18_000,
  }

  it("capacityExceedsTable warning = true", () => {
    const r = calculate(largeTank)
    expect(r.warnings.capacityExceedsTable).toBe(true)
  })
})

// ─── API edition switching ────────────────────────────────────────────────────

describe("calculate — API edition comparison", () => {
  it("5th ed: total = max(process, thermal); 7th ed: total = process + thermal", () => {
    const r5 = calculate({ ...REF, apiEdition: "5TH" })
    const r7 = calculate({ ...REF, apiEdition: "7TH" })
    // 5th outbreathing: max(process=368.9, thermal≈1046) = 1046
    // 7th outbreathing: 368.9 + 0.32×1046 ≈ 704  (sum, Y<1 reduces thermal)
    // So 5th ≥ 7th for this reference case where thermal >> process
    expect(r5.normalVenting.outbreathing.total).toBeGreaterThanOrEqual(
      r7.normalVenting.outbreathing.total,
    )
    // Verify that 7th is indeed process + thermal
    expect(r7.normalVenting.outbreathing.total).toBeCloseTo(
      r7.normalVenting.outbreathing.processFlowrate + r7.normalVenting.outbreathing.thermalOutbreathing, 6,
    )
    // Verify that 5th is indeed max(process, thermal)
    expect(r5.normalVenting.outbreathing.total).toBeCloseTo(
      Math.max(r5.normalVenting.outbreathing.processFlowrate, r5.normalVenting.outbreathing.thermalOutbreathing), 6,
    )
  })

  it("6th and 7th both use sum logic for total", () => {
    const r6 = calculate({ ...REF, apiEdition: "6TH" })
    const r7 = calculate({ ...REF, apiEdition: "7TH" })
    // Both should produce: total = process + thermal
    // 6th: thermal = tableValue (no Y factor, effective Y=1)
    // 7th: thermal = Y×tableValue (Y=0.32 < 1) → 6th thermal > 7th thermal for same tank
    expect(r6.normalVenting.outbreathing.thermalOutbreathing).toBeGreaterThan(
      r7.normalVenting.outbreathing.thermalOutbreathing,
    )
  })

  it("5th ed inbreathing: applies 0.94 factor to process flow", () => {
    const inputWithIn: CalculationInput = { ...REF, incomingStreams: [{ streamNo: "IN-1", flowrate: 100 }] }
    const r5 = calculate({ ...inputWithIn, apiEdition: "5TH" })
    const r7 = calculate({ ...inputWithIn, apiEdition: "7TH" })
    // 5th: processFlowrate = 0.94 × 100 = 94
    // 7th: processFlowrate = 100
    expect(r5.normalVenting.inbreathing.processFlowrate).toBeCloseTo(94, 5)
    expect(r7.normalVenting.inbreathing.processFlowrate).toBeCloseTo(100, 5)
  })
})

// ─── Fully user-specified fluid ───────────────────────────────────────────────

describe("calculate — user-specified fluid properties", () => {
  const userFluid: CalculationInput = {
    ...REF,
    latentHeat:           400,
    relievingTemperature: 20,
    molecularMass:        100,
  }

  it("referenceFluid = 'User-defined'", () => {
    const r = calculate(userFluid)
    expect(r.emergencyVenting.referenceFluid).toBe("User-defined")
  })

  it("hexaneDefaults warning = false (all three provided)", () => {
    const r = calculate(userFluid)
    expect(r.warnings.hexaneDefaults).toBe(false)
  })
})
