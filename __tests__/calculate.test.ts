import { describe, it, expect } from "vitest"
import { calculate } from "@/lib/calculations"
import { TankConfiguration } from "@/types"
import type { CalculationInput } from "@/types"

// ─── Reference input (from PD.md §15 / Excel reference) ──────────────────────
const REF: CalculationInput = {
  tankNumber: "TK-3120",
  diameter: 24_000,   // mm
  height: 17_500,   // mm
  latitude: 12.7,
  designPressure: 101.32,   // kPag
  tankConfiguration: TankConfiguration.BARE_METAL,
  avgStorageTemp: 35,
  vapourPressure: 5.6,
  flashBoilingPointType: "FP",
  incomingStreams: [],
  outgoingStreams: [{ streamNo: "S-1", flowrate: 368.9 }],
  apiEdition: "7TH",
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
  it("heatInput ≈ 9,184,416 W", () => {
    expect(result.emergencyVenting.heatInput).toBeCloseTo(9_184_416, -2)
  })

  it("environmentalFactor = 1.0", () => {
    expect(result.emergencyVenting.environmentalFactor).toBe(1.0)
  })

  it("emergencyVentRequired ≈ 44,264 Nm³/h", () => {
    expect(result.emergencyVenting.emergencyVentRequired).toBeCloseTo(44_264, -1)
  })

  it("referenceFluid = 'Hexane' (all defaults used)", () => {
    expect(result.emergencyVenting.referenceFluid).toBe("Hexane")
  })

  // Normal venting
  it("processOutbreathing = 0 (no incoming streams to tank)", () => {
    expect(result.normalVenting.outbreathing.processFlowrate).toBeCloseTo(0, 4)
  })

  it("processInbreathing = 368.9 (outgoing stream from tank)", () => {
    expect(result.normalVenting.inbreathing.processFlowrate).toBeCloseTo(368.9, 4)
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
    drainLineSize: 200,    // mm
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
    height: 18_000,
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
    expect(r6.normalVenting.outbreathing.total).toBeCloseTo(
      r6.normalVenting.outbreathing.processFlowrate + r6.normalVenting.outbreathing.thermalOutbreathing, 6,
    )
    expect(r7.normalVenting.outbreathing.total).toBeCloseTo(
      r7.normalVenting.outbreathing.processFlowrate + r7.normalVenting.outbreathing.thermalOutbreathing, 6,
    )
  })

  it("5th ed inbreathing: applies 0.94 factor to outgoing (from tank) flow", () => {
    const inputWithOut: CalculationInput = { ...REF, outgoingStreams: [{ streamNo: "OUT-1", flowrate: 100 }] }
    const r5 = calculate({ ...inputWithOut, apiEdition: "5TH" })
    const r7 = calculate({ ...inputWithOut, apiEdition: "7TH" })
    // 5th: processInbreathing = 0.94 × 100 = 94
    // 7th: processInbreathing = 100
    expect(r5.normalVenting.inbreathing.processFlowrate).toBeCloseTo(94, 5)
    expect(r7.normalVenting.inbreathing.processFlowrate).toBeCloseTo(100, 5)
  })
})

// ─── Fully user-specified fluid ───────────────────────────────────────────────

describe("calculate — user-specified fluid properties", () => {
  const userFluid: CalculationInput = {
    ...REF,
    latentHeat: 400,
    relievingTemperature: 20,
    molecularMass: 100,
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
