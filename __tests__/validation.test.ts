import { describe, it, expect } from "vitest"
import { z } from "zod"
import { calculationInputSchema } from "@/lib/validation/inputSchema"
import { TankConfiguration } from "@/types"

type Input = z.input<typeof calculationInputSchema>

// ─── Minimal valid input (bare-metal, API 7th) ────────────────────────────────
// `satisfies` preserves the concrete object type (for spreading) while still
// type-checking against the schema input shape.
const VALID_BASE = {
  tankNumber: "TK-3120",
  diameter: 24_000,
  height: 17_500,
  latitude: 12.7,
  designPressure: 101.32,
  tankConfiguration: TankConfiguration.BARE_METAL,
  avgStorageTemp: 35,
  vapourPressure: 5.6,
  flashBoilingPointType: "FP" as const,
  incomingStreams: [] as Array<{ streamNo: string; flowrate: number }>,
  outgoingStreams: [{ streamNo: "S-1", flowrate: 368.9 }],
  apiEdition: "7TH" as const,
} satisfies Input

// ─── Helper ───────────────────────────────────────────────────────────────────
function errorsFor(data: unknown): string[] {
  const result = calculationInputSchema.safeParse(data)
  if (result.success) return []
  return result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
}

function pathErrors(data: unknown, path: string): string[] {
  const result = calculationInputSchema.safeParse(data)
  if (result.success) return []
  return result.error.issues
    .filter((i) => i.path.join(".") === path)
    .map((i) => i.message)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("calculationInputSchema", () => {
  // ── Valid inputs ─────────────────────────────────────────────────────────────

  it("accepts a valid minimal bare-metal input (API 7th)", () => {
    const result = calculationInputSchema.safeParse(VALID_BASE)
    expect(result.success).toBe(true)
  })

  it("accepts a fully populated insulated-full input (API 6th)", () => {
    const data = {
      ...VALID_BASE,
      tankConfiguration: TankConfiguration.INSULATED_FULL,
      insulationThickness: 102,
      insulationConductivity: 0.05,
      insideHeatTransferCoeff: 5.7,
      latentHeat: 334.9,
      relievingTemperature: 15.6,
      molecularMass: 86.17,
      apiEdition: "6TH",
    }
    const result = calculationInputSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it("accepts partially insulated config with all required fields", () => {
    const data = {
      ...VALID_BASE,
      tankConfiguration: TankConfiguration.INSULATED_PARTIAL,
      insulationThickness: 102,
      insulationConductivity: 0.05,
      insideHeatTransferCoeff: 5.7,
      insulatedSurfaceArea: 800,
    }
    expect(calculationInputSchema.safeParse(data).success).toBe(true)
  })

  it("accepts drain system when both fields are provided", () => {
    const data = { ...VALID_BASE, drainLineSize: 200, maxHeightAboveDrain: 5_000 }
    expect(calculationInputSchema.safeParse(data).success).toBe(true)
  })

  it("accepts empty incoming and outgoing stream arrays", () => {
    const data = { ...VALID_BASE, incomingStreams: [], outgoingStreams: [] }
    expect(calculationInputSchema.safeParse(data).success).toBe(true)
  })

  it("accepts latitude = 90 (boundary)", () => {
    const data = { ...VALID_BASE, latitude: 90 }
    expect(calculationInputSchema.safeParse(data).success).toBe(true)
  })

  it("accepts designPressure = 103.4 (boundary, not over limit)", () => {
    const data = { ...VALID_BASE, designPressure: 103.4 }
    expect(calculationInputSchema.safeParse(data).success).toBe(true)
  })

  // ── Design pressure ───────────────────────────────────────────────────────

  it("rejects designPressure > 103.4 with correct message", () => {
    const data = { ...VALID_BASE, designPressure: 103.5 }
    const errors = pathErrors(data, "designPressure")
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/103\.4 kPag/)
  })

  it("accepts designPressure = 0 (vacuum)", () => {
    const data = { ...VALID_BASE, designPressure: 0 }
    expect(pathErrors(data, "designPressure")).toHaveLength(0)
  })

  it("accepts designPressure = -101.3 (full vacuum boundary)", () => {
    const data = { ...VALID_BASE, designPressure: -101.3 }
    expect(pathErrors(data, "designPressure")).toHaveLength(0)
  })

  it("rejects designPressure below -101.3 kPag", () => {
    const data = { ...VALID_BASE, designPressure: -101.4 }
    expect(pathErrors(data, "designPressure")).toHaveLength(1)
  })

  // ── Latitude ──────────────────────────────────────────────────────────────

  it("accepts latitude = 0 (equator)", () => {
    const data = { ...VALID_BASE, latitude: 0 }
    expect(pathErrors(data, "latitude")).toHaveLength(0)
  })

  it("rejects latitude > 90", () => {
    const data = { ...VALID_BASE, latitude: 91 }
    expect(pathErrors(data, "latitude")).toHaveLength(1)
  })

  it("rejects negative latitude", () => {
    const data = { ...VALID_BASE, latitude: -1 }
    expect(pathErrors(data, "latitude")).toHaveLength(1)
  })

  // ── Tank geometry ─────────────────────────────────────────────────────────

  it("rejects diameter = 0", () => {
    const data = { ...VALID_BASE, diameter: 0 }
    expect(pathErrors(data, "diameter")).toHaveLength(1)
  })

  it("rejects negative height", () => {
    const data = { ...VALID_BASE, height: -100 }
    expect(pathErrors(data, "height")).toHaveLength(1)
  })

  // ── Insulation conditional fields ─────────────────────────────────────────

  it("rejects INSULATED_FULL without insulation fields (3 errors)", () => {
    const data = { ...VALID_BASE, tankConfiguration: TankConfiguration.INSULATED_FULL }
    const all = errorsFor(data)
    const insulationErrors = all.filter((e) =>
      e.includes("insulationThickness") ||
      e.includes("insulationConductivity") ||
      e.includes("insideHeatTransferCoeff")
    )
    expect(insulationErrors).toHaveLength(3)
  })

  it("rejects INSULATED_PARTIAL without insulatedSurfaceArea", () => {
    const data = {
      ...VALID_BASE,
      tankConfiguration: TankConfiguration.INSULATED_PARTIAL,
      insulationThickness: 100,
      insulationConductivity: 0.05,
      insideHeatTransferCoeff: 5.0,
      // insulatedSurfaceArea intentionally omitted
    }
    expect(pathErrors(data, "insulatedSurfaceArea")).toHaveLength(1)
  })

  it("accepts insulatedSurfaceArea = 0 (bare partial — effectively uninsulated)", () => {
    const data = {
      ...VALID_BASE,
      tankConfiguration: TankConfiguration.INSULATED_PARTIAL,
      insulationThickness: 100,
      insulationConductivity: 0.05,
      insideHeatTransferCoeff: 5.0,
      insulatedSurfaceArea: 0,
    }
    expect(calculationInputSchema.safeParse(data).success).toBe(true)
  })

  // ── Drain system ──────────────────────────────────────────────────────────

  it("rejects drain line size without max height above drain", () => {
    const data = { ...VALID_BASE, drainLineSize: 200 }
    expect(pathErrors(data, "maxHeightAboveDrain")).toHaveLength(1)
  })

  it("rejects max height above drain without drain line size", () => {
    const data = { ...VALID_BASE, maxHeightAboveDrain: 5_000 }
    expect(pathErrors(data, "drainLineSize")).toHaveLength(1)
  })

  // ── API edition ───────────────────────────────────────────────────────────

  it("accepts all valid API editions", () => {
    for (const edition of ["5TH", "6TH", "7TH"] as const) {
      const data = { ...VALID_BASE, apiEdition: edition }
      expect(calculationInputSchema.safeParse(data).success).toBe(true)
    }
  })

  it("rejects an invalid API edition string", () => {
    const data = { ...VALID_BASE, apiEdition: "4TH" }
    expect(pathErrors(data, "apiEdition")).toHaveLength(1)
  })

  // ── Tank number ───────────────────────────────────────────────────────────

  it("rejects empty tank number", () => {
    const data = { ...VALID_BASE, tankNumber: "" }
    expect(pathErrors(data, "tankNumber")).toHaveLength(1)
  })

  // ── Streams ───────────────────────────────────────────────────────────────

  it("rejects a stream with negative flowrate", () => {
    const data = {
      ...VALID_BASE,
      outgoingStreams: [{ streamNo: "S-1", flowrate: -1 }],
    }
    expect(errorsFor(data).some((e) => e.includes("outgoingStreams"))).toBe(true)
  })

  // ── Multiple configs pass without insulation ──────────────────────────────

  it.each([
    TankConfiguration.BARE_METAL,
    TankConfiguration.CONCRETE,
    TankConfiguration.WATER_APPLICATION,
    TankConfiguration.DEPRESSURING,
    TankConfiguration.UNDERGROUND,
    TankConfiguration.EARTH_COVERED,
    TankConfiguration.IMPOUNDMENT_AWAY,
    TankConfiguration.IMPOUNDMENT,
  ] as const)("accepts %s config without insulation fields", (config) => {
    const data = { ...VALID_BASE, tankConfiguration: config }
    expect(calculationInputSchema.safeParse(data).success).toBe(true)
  })
})
