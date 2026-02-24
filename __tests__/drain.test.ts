import { describe, it, expect } from "vitest"
import { computeDrainInbreathing } from "@/lib/calculations/drain"

describe("computeDrainInbreathing", () => {
  it("produces a positive result for positive inputs", () => {
    expect(computeDrainInbreathing(200, 5_000)).toBeGreaterThan(0)
  })

  it("formula: 3.48 × (d/1000)² × √(H/1000) × 3600 × 0.94", () => {
    const d = 200    // mm
    const H = 5_000  // mm
    const expected = 3.48 * (d / 1000) ** 2 * Math.sqrt(H / 1000) * 3600 * 0.94
    expect(computeDrainInbreathing(d, H)).toBeCloseTo(expected, 8)
  })

  it("scales as d² (double diameter → 4× flow)", () => {
    const q1 = computeDrainInbreathing(100, 3_000)
    const q2 = computeDrainInbreathing(200, 3_000)
    expect(q2 / q1).toBeCloseTo(4, 5)
  })

  it("scales as √H (4× height → 2× flow)", () => {
    const q1 = computeDrainInbreathing(150, 1_000)
    const q2 = computeDrainInbreathing(150, 4_000)
    expect(q2 / q1).toBeCloseTo(2, 5)
  })

  it("zero height → zero flow", () => {
    expect(computeDrainInbreathing(200, 0)).toBe(0)
  })

  it("zero diameter → zero flow", () => {
    expect(computeDrainInbreathing(0, 5_000)).toBe(0)
  })

  it("sample value: d=200mm, H=5000mm → expected result", () => {
    // 3.48 × (0.2)² × √5 × 3600 × 0.94
    // = 3.48 × 0.04 × 2.2361 × 3600 × 0.94
    // = 3.48 × 0.04 × 2.2361 × 3384
    // = 3.48 × 0.04 × 7567.04
    // = 3.48 × 302.68
    // = 1053.3 Nm³/h
    const expected = 3.48 * 0.04 * Math.sqrt(5) * 3600 * 0.94
    expect(computeDrainInbreathing(200, 5_000)).toBeCloseTo(expected, 4)
  })
})
