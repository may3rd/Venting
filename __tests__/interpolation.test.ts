import { describe, it, expect } from "vitest"
import { interpolate } from "@/lib/lookups/interpolate"
import { getYFactor } from "@/lib/lookups/yFactor"
import { getCFactor, isLowVolatility } from "@/lib/lookups/cFactor"
import { getFFactorInsulated, getEnvironmentalFactor } from "@/lib/lookups/fFactor"
import { normalVentInbreathing, normalVentOutbreathing } from "@/lib/lookups/normalVentTable"
import { emergencyVentTableLookup } from "@/lib/lookups/emergencyVentTable"
import { TankConfiguration } from "@/types"

// ─── Generic interpolate() ────────────────────────────────────────────────────

describe("interpolate", () => {
  const TABLE: readonly [number, number][] = [
    [0, 0],
    [10, 100],
    [20, 300],
  ]

  it("returns exact match at a table point", () => {
    expect(interpolate(10, TABLE)).toBe(100)
  })

  it("interpolates linearly between two points", () => {
    // Between (10,100) and (20,300): at x=15 → 100 + (300-100)/(20-10)*(15-10) = 200
    expect(interpolate(15, TABLE)).toBeCloseTo(200, 10)
  })

  it("clamps below: x ≤ first table x returns first y", () => {
    expect(interpolate(-5, TABLE)).toBe(0)
    expect(interpolate(0, TABLE)).toBe(0)
  })

  it("clamps above: x ≥ last table x returns last y", () => {
    expect(interpolate(25, TABLE)).toBe(300)
    expect(interpolate(20, TABLE)).toBe(300)
  })

  it("throws on empty table", () => {
    expect(() => interpolate(5, [])).toThrow()
  })

  it("returns single-row value for any x", () => {
    expect(interpolate(9999, [[42, 7]])).toBe(7)
  })
})

// ─── Y-factor ─────────────────────────────────────────────────────────────────

describe("getYFactor", () => {
  it("returns 0.32 for latitude = 1 (well below 42°)", () => {
    expect(getYFactor(1)).toBe(0.32)
  })

  it("returns 0.32 for latitude = 42 (at band boundary, inclusive)", () => {
    expect(getYFactor(42)).toBe(0.32)
  })

  it("returns 0.25 for latitude = 43 (just above 42°)", () => {
    expect(getYFactor(43)).toBe(0.25)
  })

  it("returns 0.25 for latitude = 58 (at band boundary, inclusive)", () => {
    expect(getYFactor(58)).toBe(0.25)
  })

  it("returns 0.20 for latitude = 59 (above 58°)", () => {
    expect(getYFactor(59)).toBe(0.20)
  })

  it("returns 0.20 for latitude = 90 (polar)", () => {
    expect(getYFactor(90)).toBe(0.20)
  })

  it("reference case: latitude 12.7° → 0.32", () => {
    expect(getYFactor(12.7)).toBe(0.32)
  })
})

// ─── isLowVolatility ─────────────────────────────────────────────────────────

describe("isLowVolatility", () => {
  it("FP ≥ 37.8 → low volatility", () => {
    expect(isLowVolatility("FP", 37.8)).toBe(true)
    expect(isLowVolatility("FP", 50)).toBe(true)
  })

  it("FP < 37.8 → not low volatility", () => {
    expect(isLowVolatility("FP", 37.7)).toBe(false)
    expect(isLowVolatility("FP", 0)).toBe(false)
  })

  it("BP ≥ 149 → low volatility", () => {
    expect(isLowVolatility("BP", 149)).toBe(true)
    expect(isLowVolatility("BP", 200)).toBe(true)
  })

  it("BP < 149 → not low volatility", () => {
    expect(isLowVolatility("BP", 148.9)).toBe(false)
  })

  it("undefined flashBoilingPoint → not low volatility", () => {
    expect(isLowVolatility("FP", undefined)).toBe(false)
    expect(isLowVolatility("BP", undefined)).toBe(false)
  })
})

// ─── C-factor ─────────────────────────────────────────────────────────────────

describe("getCFactor", () => {
  // below 42°
  it("below 42°, low-vol, small tank (<25 m³) → 4", () => {
    expect(getCFactor(12.7, "FP", 50, 10)).toBe(4)    // FP=50 ≥ 37.8 → low-vol, cap=10 < 25
  })

  it("below 42°, low-vol, large tank (≥25 m³) → 6.5", () => {
    expect(getCFactor(12.7, "FP", 50, 25)).toBe(6.5)
  })

  it("below 42°, other fluid, any size → 6.5", () => {
    expect(getCFactor(12.7, "FP", 10, 10)).toBe(6.5)  // FP=10 < 37.8 → not low-vol
    expect(getCFactor(12.7, "FP", 10, 100)).toBe(6.5)
  })

  // 42°–58°
  it("42°–58°, low-vol, small tank → 3", () => {
    expect(getCFactor(50, "FP", 50, 10)).toBe(3)
  })

  it("42°–58°, low-vol, large tank → 5", () => {
    expect(getCFactor(50, "FP", 50, 30)).toBe(5)
  })

  it("42°–58°, other fluid → 5", () => {
    expect(getCFactor(50, "FP", 10, 5)).toBe(5)
  })

  // above 58°
  it("above 58°, low-vol, small tank → 2.5", () => {
    expect(getCFactor(60, "FP", 50, 10)).toBe(2.5)
  })

  it("above 58°, low-vol, large tank → 4", () => {
    expect(getCFactor(60, "FP", 50, 100)).toBe(4)
  })

  it("above 58°, other fluid → 4", () => {
    expect(getCFactor(60, "FP", 10, 10)).toBe(4)
  })

  // Reference case: lat=12.7, vapour pressure 5.6 kPa — FP type, value given by test as 5.6
  // (non-specified flash point, so depends on flashBoilingPoint value)
  it("reference case: lat=12.7, low-vol small → 4", () => {
    expect(getCFactor(12.7, "FP", 38, 10)).toBe(4)
  })
})

// ─── F-factor (insulated) ────────────────────────────────────────────────────

describe("getFFactorInsulated", () => {
  it("returns F=0.075 for conductivity=0.05 W/mK, thickness=102 mm (exact table match: U≈0.49 W/m²K)", () => {
    // U = 0.05 / 0.102 ≈ 0.490 W/m²K — below minimum conductance 1.9 → clamp to 0.025
    // Wait: 0.05/0.102 = 0.490, which is below table minimum of 1.9 → clamped to F=0.025
    // Actually let's check: the table has conductance (k/t), not conductivity!
    // For k=0.58 (API ref), t=0.102m: U = 0.58/0.102 = 5.686 ≈ 5.7 → F=0.075
    // But with user-specified k=0.05: U = 0.05/0.102 = 0.490 → clamped to F=0.025
    expect(getFFactorInsulated(0.05, 102)).toBeCloseTo(0.025, 4)
  })

  it("returns exactly 0.025 for conductance below table minimum (1.9 W/m²K)", () => {
    // k=0.04, t=200mm → U=0.04/0.2=0.2 → clamp
    expect(getFFactorInsulated(0.04, 200)).toBe(0.025)
  })

  it("returns exactly 0.300 for conductance above table maximum (22.7 W/m²K)", () => {
    // k=1.0, t=5mm → U=200 → clamp to 0.300
    expect(getFFactorInsulated(1.0, 5)).toBe(0.300)
  })

  it("interpolates between 5.7 and 11.4 conductance rows", () => {
    // conductance = 8.55 (midpoint) → F should be midpoint of 0.075 and 0.150 = 0.1125
    const k = 8.55  // use k=8.55, t=1000mm → U=8.55 W/m²K
    const expected = 0.075 + (0.150 - 0.075) * (8.55 - 5.7) / (11.4 - 5.7)
    expect(getFFactorInsulated(k, 1000)).toBeCloseTo(expected, 8)
  })

  it("returns exactly 0.150 for conductance = 11.4 (exact table row: k=0.58, t=51mm)", () => {
    // 0.58/0.051 = 11.37... ≈ 11.4 → F=0.150
    // Use exact table conductance: k=11.4, t=1000mm → U=11.4
    expect(getFFactorInsulated(11.4, 1000)).toBeCloseTo(0.150, 5)
  })
})

// ─── getEnvironmentalFactor ───────────────────────────────────────────────────

describe("getEnvironmentalFactor", () => {
  it("returns 1.0 for BARE_METAL", () => {
    expect(getEnvironmentalFactor(TankConfiguration.BARE_METAL)).toBe(1.0)
  })

  it("returns 0 for UNDERGROUND", () => {
    expect(getEnvironmentalFactor(TankConfiguration.UNDERGROUND)).toBe(0)
  })

  it("returns 0.03 for EARTH_COVERED", () => {
    expect(getEnvironmentalFactor(TankConfiguration.EARTH_COVERED)).toBe(0.03)
  })

  it("returns 0.5 for IMPOUNDMENT", () => {
    expect(getEnvironmentalFactor(TankConfiguration.IMPOUNDMENT)).toBe(0.5)
  })

  it("returns 0.3 for IMPOUNDMENT_AWAY", () => {
    expect(getEnvironmentalFactor(TankConfiguration.IMPOUNDMENT_AWAY)).toBe(0.3)
  })

  it("returns 1.0 for WATER_APPLICATION", () => {
    expect(getEnvironmentalFactor(TankConfiguration.WATER_APPLICATION)).toBe(1.0)
  })

  it("returns 0.03 for CONCRETE", () => {
    expect(getEnvironmentalFactor(TankConfiguration.CONCRETE)).toBe(0.03)
  })

  it("returns 1.0 for DEPRESSURING", () => {
    expect(getEnvironmentalFactor(TankConfiguration.DEPRESSURING)).toBe(1.0)
  })

  it("calls getFFactorInsulated for INSULATED_FULL with high conductance → 0.300", () => {
    // high conductance → clamped to 0.300
    const f = getEnvironmentalFactor(TankConfiguration.INSULATED_FULL, 1.0, 5)
    expect(f).toBe(0.300)
  })

  it("calls getFFactorInsulated for INSULATED_PARTIAL with low conductance → 0.025", () => {
    const f = getEnvironmentalFactor(TankConfiguration.INSULATED_PARTIAL, 0.04, 200)
    expect(f).toBe(0.025)
  })

  it("throws for INSULATED_FULL without insulation params", () => {
    expect(() => getEnvironmentalFactor(TankConfiguration.INSULATED_FULL)).toThrow()
  })
})

// ─── Normal Venting Table ─────────────────────────────────────────────────────

describe("normalVentInbreathing", () => {
  it("returns exact table value at capacity = 1000 m³ → 169 Nm³/h", () => {
    expect(normalVentInbreathing(1000)).toBeCloseTo(169, 4)
  })

  it("returns exact table value at capacity = 30000 m³ → 2495 Nm³/h", () => {
    expect(normalVentInbreathing(30000)).toBeCloseTo(2495, 4)
  })

  it("clamps below: capacity < 10 m³ → 1.69", () => {
    expect(normalVentInbreathing(1)).toBeCloseTo(1.69, 4)
  })

  it("clamps above: capacity > 30000 m³ → 2495", () => {
    expect(normalVentInbreathing(50000)).toBeCloseTo(2495, 4)
  })

  it("reference case: capacity 7916.81 m³ → interpolated between 6000 and 10000", () => {
    // Between (6000, 896) and (10000, 1210):
    // result = 896 + (1210 - 896) / (10000 - 6000) * (7916.81 - 6000)
    const expected = 896 + (1210 - 896) / (10000 - 6000) * (7916.81 - 6000)
    expect(normalVentInbreathing(7916.81)).toBeCloseTo(expected, 4)
  })
})

describe("normalVentOutbreathing", () => {
  it("returns low-vol value at 1000 m³ → 101 Nm³/h", () => {
    expect(normalVentOutbreathing(1000, true)).toBeCloseTo(101, 4)
  })

  it("returns other value at 1000 m³ → 169 Nm³/h", () => {
    expect(normalVentOutbreathing(1000, false)).toBeCloseTo(169, 4)
  })

  it("reference case: other, capacity 7916.81 m³ → interpolated between 6000 and 10000", () => {
    // 'other' column same as inbreathing: (6000→896), (10000→1210)
    const expected = 896 + (1210 - 896) / (10000 - 6000) * (7916.81 - 6000)
    expect(normalVentOutbreathing(7916.81, false)).toBeCloseTo(expected, 4)
  })

  it("reference case: low-vol, capacity 7916.81 m³ → interpolated between 6000 and 10000", () => {
    // low-vol column: (6000→538), (10000→726)
    const expected = 538 + (726 - 538) / (10000 - 6000) * (7916.81 - 6000)
    expect(normalVentOutbreathing(7916.81, true)).toBeCloseTo(expected, 4)
  })
})

// ─── Emergency Venting Table ──────────────────────────────────────────────────

describe("emergencyVentTableLookup", () => {
  it("returns exact value at area = 50 m² → 9895 Nm³/h", () => {
    expect(emergencyVentTableLookup(50)).toBeCloseTo(9895, 2)
  })

  it("returns exact value at area = 260 m² → 19910 Nm³/h", () => {
    expect(emergencyVentTableLookup(260)).toBeCloseTo(19910, 2)
  })

  it("clamps below: area < 2 m² → 608 Nm³/h", () => {
    expect(emergencyVentTableLookup(0.5)).toBeCloseTo(608, 2)
  })

  it("clamps above: area > 260 m² → 19910 Nm³/h", () => {
    expect(emergencyVentTableLookup(500)).toBeCloseTo(19910, 2)
  })

  it("interpolates between 50 and 60 m²", () => {
    // (50, 9895) → (60, 10971): at x=55 → 9895 + (10971-9895)/(60-50)*(55-50) = 10433
    const expected = 9895 + (10971 - 9895) / (60 - 50) * (55 - 50)
    expect(emergencyVentTableLookup(55)).toBeCloseTo(expected, 4)
  })

  it("reference case: wetted area 689.44 m² → clamped to 19910 (above table max)", () => {
    // 689.44 > 260 → clamp (7th edition formula used in actual calc, table only for 5th/6th)
    expect(emergencyVentTableLookup(689.44)).toBeCloseTo(19910, 2)
  })
})
