import { describe, it, expect } from "vitest"
import {
  calcMaxTankVolume,
  calcShellSurfaceArea,
  calcConeRoofArea,
  calcTotalSurfaceArea,
  calcWettedArea,
  calcR_in,
  calcR_inp,
  computeDerivedGeometry,
} from "@/lib/calculations/geometry"
import { TankConfiguration } from "@/types"
import type { CalculationInput } from "@/types"

// ─── Reference case ───────────────────────────────────────────────────────────
// Tank: D=24,000 mm, H=17,500 mm (bare metal, API 7th)
// Expected values verified against Book1 1.xlsx

const D = 24_000   // mm
const H = 17_500   // mm
const TOL = 0.01   // 0.01% tolerance (matches Excel to 5 significant figures)

function pct(expected: number): number {
  return expected * TOL / 100
}

// ─── calcMaxTankVolume ────────────────────────────────────────────────────────

describe("calcMaxTankVolume", () => {
  it("reference case: 24000 × 17500 mm → 7916.81 m³", () => {
    // π × 12² × 17.5 = π × 2520 ≈ 7916.8134 m³
    expect(calcMaxTankVolume(D, H)).toBeCloseTo(7916.81, 1)
  })

  it("small tank: 1000 mm diameter, 2000 mm height", () => {
    // π × 0.5² × 2 = π × 0.5 ≈ 1.5708 m³
    expect(calcMaxTankVolume(1000, 2000)).toBeCloseTo(Math.PI * 0.5 * 0.5 * 2, 8)
  })

  it("scales with diameter squared", () => {
    const v1 = calcMaxTankVolume(1000, 1000)
    const v2 = calcMaxTankVolume(2000, 1000)
    expect(v2 / v1).toBeCloseTo(4, 10)   // (2r)² = 4r²
  })

  it("scales linearly with height", () => {
    const v1 = calcMaxTankVolume(1000, 1000)
    const v2 = calcMaxTankVolume(1000, 3000)
    expect(v2 / v1).toBeCloseTo(3, 10)
  })
})

// ─── calcShellSurfaceArea ─────────────────────────────────────────────────────

describe("calcShellSurfaceArea", () => {
  it("reference case: 24000 × 17500 mm → 1319.47 m²", () => {
    // π × 24 × 17.5 = π × 420 ≈ 1319.469 m²
    expect(calcShellSurfaceArea(D, H)).toBeCloseTo(1319.47, 1)
  })

  it("formula: π × D × H (in m)", () => {
    const d = 10_000   // mm → 10 m
    const h = 5_000    // mm → 5 m
    expect(calcShellSurfaceArea(d, h)).toBeCloseTo(Math.PI * 10 * 5, 8)
  })
})

// ─── calcConeRoofArea ─────────────────────────────────────────────────────────

describe("calcConeRoofArea", () => {
  it("reference case: D=24000 mm → 458.63 m²", () => {
    // r=12 m, h=2 m (1:12 slope), slant=√(144+4)=√148≈12.1655 m
    // A = π × 12 × 12.1655 ≈ 458.63 m²
    expect(calcConeRoofArea(D)).toBeCloseTo(458.63, 1)
  })

  it("cone height is D/12 (1:12 slope)", () => {
    // For D=12000mm: r=6m, h=1m, slant=√37≈6.0828, A=π×6×6.0828≈114.65
    const area = calcConeRoofArea(12_000)
    const r = 6, h = 1
    const slant = Math.sqrt(r * r + h * h)
    expect(area).toBeCloseTo(Math.PI * r * slant, 8)
  })

  it("increases with diameter", () => {
    expect(calcConeRoofArea(20_000)).toBeLessThan(calcConeRoofArea(30_000))
  })
})

// ─── calcTotalSurfaceArea ─────────────────────────────────────────────────────

describe("calcTotalSurfaceArea", () => {
  it("reference case: shell + cone = 1319.47 + 458.63 ≈ 1778.10 m²", () => {
    const shell = calcShellSurfaceArea(D, H)
    const cone  = calcConeRoofArea(D)
    expect(calcTotalSurfaceArea(shell, cone)).toBeCloseTo(1319.47 + 458.63, 0)
  })

  it("is the sum of its parts", () => {
    expect(calcTotalSurfaceArea(100, 50)).toBe(150)
  })
})

// ─── calcWettedArea ───────────────────────────────────────────────────────────

describe("calcWettedArea", () => {
  it("reference case: D=24000, H=17500 → capped at 9144 mm → 689.44 m²", () => {
    // H > 9144 → wetted = π × 24 × 9.144 = π × 219.456 ≈ 689.44 m²
    expect(calcWettedArea(D, H)).toBeCloseTo(689.44, 1)
  })

  it("short tank (H < 9144 mm) uses full shell area", () => {
    const h = 5_000   // less than cap
    const expected = calcShellSurfaceArea(D, h)
    expect(calcWettedArea(D, h)).toBeCloseTo(expected, 8)
  })

  it("tank exactly at cap height uses full shell", () => {
    const h = 9_144
    expect(calcWettedArea(D, h)).toBeCloseTo(calcShellSurfaceArea(D, h), 8)
  })

  it("tank taller than cap is capped", () => {
    const tall = calcWettedArea(D, 20_000)
    const atCap = calcWettedArea(D, 9_144)
    expect(tall).toBeCloseTo(atCap, 8)
  })
})

// ─── calcR_in ─────────────────────────────────────────────────────────────────

describe("calcR_in", () => {
  it("returns 1.0 when insulation thickness is 0", () => {
    // R_in = 1 / (1 + U×0/k) = 1
    expect(calcR_in(5.7, 0, 0.05)).toBe(1)
  })

  it("returns a value < 1 for positive thickness", () => {
    expect(calcR_in(5.7, 102, 0.05)).toBeLessThan(1)
    expect(calcR_in(5.7, 102, 0.05)).toBeGreaterThan(0)
  })

  it("approaches 0 as thickness → very large", () => {
    // R_in = 1 / (1 + U×t/k) = 1/(1 + 5.7×1000/0.05) = 1/114001 ≈ 8.77e-6
    expect(calcR_in(5.7, 1_000_000, 0.05)).toBeLessThan(1e-4)
  })

  it("formula: 1/(1 + U_i × t_m / k) for U=5.7, t=102mm, k=0.05", () => {
    // t = 0.102 m; R_in = 1/(1 + 5.7×0.102/0.05) = 1/(1 + 11.628) = 1/12.628 ≈ 0.07919
    const expected = 1 / (1 + (5.7 * 0.102) / 0.05)
    expect(calcR_in(5.7, 102, 0.05)).toBeCloseTo(expected, 10)
  })

  it("higher U_i yields lower R_in (more insulation effect)", () => {
    const r_low  = calcR_in(2.0,  102, 0.05)
    const r_high = calcR_in(10.0, 102, 0.05)
    expect(r_high).toBeLessThan(r_low)
  })

  it("higher k (conductivity) yields higher R_in (less insulation effect)", () => {
    const r_low_k  = calcR_in(5.7, 102, 0.03)
    const r_high_k = calcR_in(5.7, 102, 0.10)
    expect(r_high_k).toBeGreaterThan(r_low_k)
  })
})

// ─── calcR_inp ────────────────────────────────────────────────────────────────

describe("calcR_inp", () => {
  const A_TTS = 1000   // total surface area m²
  const R_in  = 0.5    // arbitrary

  it("fully insulated (A_inp = A_TTS) → R_inp = R_in", () => {
    expect(calcR_inp(A_TTS, A_TTS, R_in)).toBeCloseTo(R_in, 10)
  })

  it("uninsulated (A_inp = 0) → R_inp = 1.0 (bare metal)", () => {
    expect(calcR_inp(A_TTS, 0, R_in)).toBeCloseTo(1.0, 10)
  })

  it("50% insulated → R_inp = 0.5×R_in + 0.5×1", () => {
    const expected = 0.5 * R_in + 0.5 * 1
    expect(calcR_inp(A_TTS, 500, R_in)).toBeCloseTo(expected, 10)
  })

  it("is always between R_in and 1.0", () => {
    for (const frac of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const r = calcR_inp(A_TTS, A_TTS * frac, R_in)
      expect(r).toBeGreaterThanOrEqual(R_in)
      expect(r).toBeLessThanOrEqual(1.0)
    }
  })
})

// ─── computeDerivedGeometry ───────────────────────────────────────────────────

const BASE_INPUT: CalculationInput = {
  tankNumber: "TK-3120",
  diameter: D,
  height: H,
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

describe("computeDerivedGeometry", () => {
  it("reference case bare-metal: all values match Excel within 0.01%", () => {
    const g = computeDerivedGeometry(BASE_INPUT)
    expect(g.maxTankVolume).toBeCloseTo(7916.81, 1)
    expect(g.shellSurfaceArea).toBeCloseTo(1319.47, 1)
    expect(g.coneRoofArea).toBeCloseTo(458.63, 1)
    expect(g.totalSurfaceArea).toBeCloseTo(1319.47 + 458.63, 0)
    expect(g.wettedArea).toBeCloseTo(689.44, 1)
    expect(g.reductionFactor).toBe(1.0)
  })

  it("non-insulated configs all get reductionFactor = 1.0", () => {
    const configs = [
      TankConfiguration.CONCRETE,
      TankConfiguration.WATER_APPLICATION,
      TankConfiguration.DEPRESSURING,
      TankConfiguration.UNDERGROUND,
      TankConfiguration.EARTH_COVERED,
      TankConfiguration.IMPOUNDMENT_AWAY,
      TankConfiguration.IMPOUNDMENT,
    ]
    for (const tankConfiguration of configs) {
      const g = computeDerivedGeometry({ ...BASE_INPUT, tankConfiguration })
      expect(g.reductionFactor, `config: ${tankConfiguration}`).toBe(1.0)
    }
  })

  describe("INSULATED_FULL", () => {
    const insulatedInput: CalculationInput = {
      ...BASE_INPUT,
      tankConfiguration: TankConfiguration.INSULATED_FULL,
      insideHeatTransferCoeff: 5.7,
      insulationThickness: 102,
      insulationConductivity: 0.05,
    }

    it("computes R_in and uses it as reductionFactor", () => {
      const g = computeDerivedGeometry(insulatedInput)
      const expected = 1 / (1 + (5.7 * 0.102) / 0.05)
      expect(g.reductionFactor).toBeCloseTo(expected, 8)
      expect(g.reductionFactor).toBeLessThan(1.0)
    })

    it("throws when insulation params are missing", () => {
      const bad = { ...BASE_INPUT, tankConfiguration: TankConfiguration.INSULATED_FULL }
      expect(() => computeDerivedGeometry(bad)).toThrow()
    })
  })

  describe("INSULATED_PARTIAL", () => {
    const partialInput: CalculationInput = {
      ...BASE_INPUT,
      tankConfiguration: TankConfiguration.INSULATED_PARTIAL,
      insideHeatTransferCoeff: 5.7,
      insulationThickness: 102,
      insulationConductivity: 0.05,
      insulatedSurfaceArea: 500,
    }

    it("computes R_inp combining insulated and bare fractions", () => {
      const g = computeDerivedGeometry(partialInput)
      const r_in   = 1 / (1 + (5.7 * 0.102) / 0.05)
      const A_TTS  = calcShellSurfaceArea(D, H) + calcConeRoofArea(D)
      const A_inp  = 500
      const expected = (A_inp / A_TTS) * r_in + (1 - A_inp / A_TTS) * 1
      expect(g.reductionFactor).toBeCloseTo(expected, 8)
    })

    it("A_inp = 0 → reductionFactor = 1.0 (effectively bare)", () => {
      const g = computeDerivedGeometry({ ...partialInput, insulatedSurfaceArea: 0 })
      expect(g.reductionFactor).toBeCloseTo(1.0, 8)
    })

    it("A_inp = A_TTS → reductionFactor = R_in (fully insulated equivalent)", () => {
      const A_TTS = calcShellSurfaceArea(D, H) + calcConeRoofArea(D)
      const g = computeDerivedGeometry({ ...partialInput, insulatedSurfaceArea: A_TTS })
      const r_in = 1 / (1 + (5.7 * 0.102) / 0.05)
      expect(g.reductionFactor).toBeCloseTo(r_in, 8)
    })

    it("throws when insulatedSurfaceArea is missing", () => {
      const bad: CalculationInput = {
        ...BASE_INPUT,
        tankConfiguration: TankConfiguration.INSULATED_PARTIAL,
        insideHeatTransferCoeff: 5.7,
        insulationThickness: 102,
        insulationConductivity: 0.05,
        // insulatedSurfaceArea intentionally omitted
      }
      expect(() => computeDerivedGeometry(bad)).toThrow()
    })
  })
})
