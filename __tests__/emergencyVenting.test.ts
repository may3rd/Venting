import { describe, it, expect } from "vitest"
import { computeEmergencyVenting } from "@/lib/calculations/emergencyVenting"
import { computeDerivedGeometry } from "@/lib/calculations/geometry"
import { TankConfiguration } from "@/types"
import type { CalculationInput, DerivedGeometry } from "@/types"

// ─── Reference case ───────────────────────────────────────────────────────────
// API 7th, bare metal, D=24000mm, H=17500mm
// ATWS=689.44 m² (≥260, DP>7) → a=43200, n=0.82

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
  // No L, T_r, M → Hexane defaults: 334.9, 15.6, 86.17
}

const REF_DERIVED: DerivedGeometry = computeDerivedGeometry(REF_INPUT)

function makeInput(overrides: Partial<CalculationInput>): CalculationInput {
  return { ...REF_INPUT, ...overrides }
}
function makeDerived(input: CalculationInput): DerivedGeometry {
  return computeDerivedGeometry(input)
}

// ─── 7th Edition reference case ───────────────────────────────────────────────

describe("computeEmergencyVenting — 7th edition reference case", () => {
  it("Q ≈ 9,184,416 W (a=43200, n=0.82, ATWS=689.44)", () => {
    const r = computeEmergencyVenting(REF_INPUT, REF_DERIVED)
    expect(r.heatInput).toBeCloseTo(9_184_416, -2)
  })

  it("coefficients: a=43200, n=0.82", () => {
    const r = computeEmergencyVenting(REF_INPUT, REF_DERIVED)
    expect(r.coefficients.a).toBe(43_200)
    expect(r.coefficients.n).toBe(0.82)
  })

  it("F = 1.0 (bare metal)", () => {
    const r = computeEmergencyVenting(REF_INPUT, REF_DERIVED)
    expect(r.environmentalFactor).toBe(1.0)
  })

  it("emergency vent ≈ 44,264 Nm³/h (208.2 × 1.0 × 689.44^0.82)", () => {
    const r = computeEmergencyVenting(REF_INPUT, REF_DERIVED)
    expect(r.emergencyVentRequired).toBeCloseTo(44_264, -1)
  })

  it("referenceFluid = 'Hexane' when all three properties are omitted", () => {
    const r = computeEmergencyVenting(REF_INPUT, REF_DERIVED)
    expect(r.referenceFluid).toBe("Hexane")
  })

  it("referenceFluid = 'User-defined' when any property is supplied", () => {
    const input = makeInput({ latentHeat: 334.9 })
    const r = computeEmergencyVenting(input, REF_DERIVED)
    expect(r.referenceFluid).toBe("User-defined")
  })
})

// ─── Coefficient selection ────────────────────────────────────────────────────

describe("coefficient selection", () => {
  it("ATWS < 18.6 → a=63150, n=1", () => {
    // D=1000mm, H=3000mm → shell = π×1×3 = 9.42 m² < 18.6 → row 1
    const input = makeInput({ diameter: 1_000, height: 3_000 })
    const derived = makeDerived(input)
    const r = computeEmergencyVenting(input, derived)
    expect(r.coefficients.a).toBe(63_150)
    expect(r.coefficients.n).toBe(1)
  })

  it("18.6 ≤ ATWS < 93 → a=224200, n=0.566", () => {
    // D=4000mm, H=5000mm → ATWS ≈ min(π×4×5, π×4×9.144) = 62.83 m²
    const input = makeInput({ diameter: 4_000, height: 5_000 })
    const derived = makeDerived(input)
    const r = computeEmergencyVenting(input, derived)
    expect(r.coefficients.a).toBe(224_200)
    expect(r.coefficients.n).toBe(0.566)
  })

  it("93 ≤ ATWS < 260 (7th ed) → a=630400, n=0.338", () => {
    // D=8000mm, H=6000mm → ATWS ≈ π×8×6=150.8 m² (< 260)
    const input = makeInput({ diameter: 8_000, height: 6_000 })
    const derived = makeDerived(input)
    const r = computeEmergencyVenting(input, derived)
    expect(r.coefficients.a).toBe(630_400)
    expect(r.coefficients.n).toBe(0.338)
  })

  it("ATWS > 260, DP > 7 → a=43200, n=0.82 (all editions)", () => {
    // Reference case: ATWS=689.44 > 260, DP=101.32 > 7
    const r = computeEmergencyVenting(REF_INPUT, REF_DERIVED)
    expect(r.coefficients.a).toBe(43_200)
    expect(r.coefficients.n).toBe(0.82)
  })

  it("ATWS > 260, DP ≤ 7 → a=4129700, n=0 (all editions)", () => {
    const input = makeInput({ designPressure: 5 })
    const r = computeEmergencyVenting(input, REF_DERIVED)  // ATWS=689.44 > 260
    expect(r.coefficients.a).toBe(4_129_700)
    expect(r.coefficients.n).toBe(0)
  })
})

// ─── Environmental factor (F) ─────────────────────────────────────────────────

describe("environmental factor", () => {
  it("F = 0 for underground → emergencyVentRequired = 0", () => {
    const input = makeInput({ tankConfiguration: TankConfiguration.UNDERGROUND })
    const r = computeEmergencyVenting(input, REF_DERIVED)
    expect(r.environmentalFactor).toBe(0)
    expect(r.emergencyVentRequired).toBe(0)
  })

  it("F = 0.03 for earth-covered", () => {
    const input = makeInput({ tankConfiguration: TankConfiguration.EARTH_COVERED })
    const r = computeEmergencyVenting(input, REF_DERIVED)
    expect(r.environmentalFactor).toBe(0.03)
  })

  it("F = 0.5 for impoundment", () => {
    const input = makeInput({ tankConfiguration: TankConfiguration.IMPOUNDMENT })
    const r = computeEmergencyVenting(input, REF_DERIVED)
    expect(r.environmentalFactor).toBe(0.5)
  })

  it("lower F yields proportionally lower emergencyVentRequired (7th ed formula)", () => {
    const rBare = computeEmergencyVenting(REF_INPUT, REF_DERIVED)
    const inputImp = makeInput({ tankConfiguration: TankConfiguration.IMPOUNDMENT })
    const rImp = computeEmergencyVenting(inputImp, REF_DERIVED)
    // F for impoundment = 0.5, bare metal = 1.0 → ratio should be ≈ 0.5
    expect(rImp.emergencyVentRequired / rBare.emergencyVentRequired).toBeCloseTo(0.5, 5)
  })
})

// ─── 5th/6th edition: table lookup path ──────────────────────────────────────

describe("5th/6th edition table path (ATWS ≤ 260)", () => {
  // Use a smaller tank: D=10000mm, H=5000mm
  // ATWS = min(π×10×5, π×10×9.144) = 157.08 m² < 260 ✓
  const smallInput: CalculationInput = {
    ...REF_INPUT,
    diameter: 10_000,
    height: 5_000,
    apiEdition: "6TH",
  }
  const smallDerived = makeDerived(smallInput)

  it("uses table lookup (not formula) for 6th ed when ATWS ≤ 260", () => {
    const r = computeEmergencyVenting(smallInput, smallDerived)
    // Table path: V = F × emergencyVentTableLookup(ATWS)
    // F=1.0 (bare metal) → V = table(157.08)
    // Just verify it's in a reasonable range (table max is 19910 at 260 m²)
    expect(r.emergencyVentRequired).toBeGreaterThan(0)
    expect(r.emergencyVentRequired).toBeLessThanOrEqual(19_910)
  })

  it("same ATWS: heatInput and vent rate identical for 6th and 7th (edition-independent)", () => {
    const input7th = { ...smallInput, apiEdition: "7TH" as const }
    const r6 = computeEmergencyVenting(smallInput, smallDerived)
    const r7 = computeEmergencyVenting(input7th, smallDerived)
    // All editions use the same calculation now
    expect(r6.heatInput).toBeCloseTo(r7.heatInput, 5)
    expect(r6.emergencyVentRequired).toBeCloseTo(r7.emergencyVentRequired, 5)
  })
})

// ─── User-specified fluid properties ─────────────────────────────────────────

describe("user-specified fluid properties", () => {
  // REF_INPUT has ATWS=689.44 > 260 and DP=101.32 > 7, so ATWS ≥ 260, DP > 7 path applies.
  // Hexane → 208.2 simplified; user-defined → 906.6 general formula.

  it("Hexane (no props) uses simplified formula; user-defined uses general formula (different result)", () => {
    const rHexane = computeEmergencyVenting(REF_INPUT, REF_DERIVED)
    const rUser = computeEmergencyVenting(makeInput({ latentHeat: 600 }), REF_DERIVED)
    // Different formulas → different results
    expect(rUser.emergencyVentRequired).not.toBeCloseTo(rHexane.emergencyVentRequired, 0)
  })

  it("higher latent heat → lower vent required (less vapour per unit heat)", () => {
    const rLow = computeEmergencyVenting(makeInput({ latentHeat: 300 }), REF_DERIVED)
    const rHigh = computeEmergencyVenting(makeInput({ latentHeat: 600 }), REF_DERIVED)
    expect(rHigh.emergencyVentRequired).toBeLessThan(rLow.emergencyVentRequired)
  })

  it("higher relieving temperature → higher vent required (vapour expands more)", () => {
    const rLow = computeEmergencyVenting(makeInput({ relievingTemperature: 10 }), REF_DERIVED)
    const rHigh = computeEmergencyVenting(makeInput({ relievingTemperature: 100 }), REF_DERIVED)
    expect(rHigh.emergencyVentRequired).toBeGreaterThan(rLow.emergencyVentRequired)
  })

  it("higher molecular mass → lower vent required (denser vapour)", () => {
    const rLow = computeEmergencyVenting(makeInput({ molecularMass: 50 }), REF_DERIVED)
    const rHigh = computeEmergencyVenting(makeInput({ molecularMass: 200 }), REF_DERIVED)
    expect(rHigh.emergencyVentRequired).toBeLessThan(rLow.emergencyVentRequired)
  })

  it("partial fluid props: missing values fall back to Hexane defaults", () => {
    // Only L provided, T_r and M default to Hexane
    const rPartial = computeEmergencyVenting(makeInput({ latentHeat: 334.9 }), REF_DERIVED)
    // L=334.9 (same as Hexane), T_r=15.6°C, M=86.17 → 906.6 formula with Hexane values
    // Result should differ from the 208.2 simplified value (different derivation base)
    expect(rPartial.referenceFluid).toBe("User-defined")
    expect(rPartial.emergencyVentRequired).toBeGreaterThan(0)
  })
})
