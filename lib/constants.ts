import { TankConfiguration } from "@/types"

// ─── Hexane Reference Fluid Defaults ─────────────────────────────────────────
// Used when latent heat, relieving temperature, and molecular mass are blank.
// Per API 2000 specification.

export const HEXANE_DEFAULTS = {
  latentHeat: 334.9, // kJ/kg
  relievingTemperature: 15.6, // °C
  molecularMass: 86.17, // g/mol
} as const

// ─── Fluid Classification Thresholds ─────────────────────────────────────────

export const FLASH_POINT_THRESHOLD = 37.8 // °C — FP ≥ this → "low volatility"
export const BOILING_POINT_THRESHOLD = 149 // °C — BP ≥ this → "low volatility"

// ─── Design Limits ────────────────────────────────────────────────────────────

export const MIN_DESIGN_PRESSURE_KPAG = -101.3 // kPag — full vacuum lower bound
export const MAX_DESIGN_PRESSURE_KPAG = 103.4  // kPag — error if exceeded

/** Pressure threshold separating Hexane Eq. 16 (DP > 7) from Eq. 17 (DP ≤ 7) in API 2000 §6.3 */
export const EMERGENCY_VENT_PRESSURE_THRESHOLD = 7 // kPag
export const CAPACITY_WARNING_M3 = 30_000 // m³ — warn if exceeded (outside table)
export const WETTED_AREA_HEIGHT_CAP_MM = 9_144 // mm (30 ft) — cap for wetted area calc

// ─── Tank Geometry ────────────────────────────────────────────────────────────

/** Standard cone roof slope: h = D / 12 (1:12 ratio, verified against Excel) */
export const CONE_ROOF_SLOPE = 12 // denominator: h_roof = diameter / CONE_ROOF_SLOPE

// ─── Heat Input Coefficients (API 2000 §6.3) ─────────────────────────────────
// Q = a × ATWS^n  (W)
// Selected by wetted surface area (ATWS, m²) and design pressure (kPag).

export interface HeatCoeffEntry {
  atwsMin: number
  atwsMax: number // Infinity for the last two rows
  pressureMin?: number // kPag (inclusive lower bound — omit = 0)
  pressureMax?: number // kPag (inclusive upper bound — omit = Infinity)
  a: number
  n: number
}

export const HEAT_INPUT_COEFFICIENTS: HeatCoeffEntry[] = [
  // ATWS < 18.6 m², DP ≤ 103.4
  { atwsMin: 0, atwsMax: 18.6, pressureMax: 103.4, a: 63_150, n: 1 },
  // 18.6 ≤ ATWS < 93 m², DP ≤ 103.4
  { atwsMin: 18.6, atwsMax: 93, pressureMax: 103.4, a: 224_200, n: 0.566 },
  // 93 ≤ ATWS < 260 m², DP ≤ 103.4
  { atwsMin: 93, atwsMax: 260, pressureMax: 103.4, a: 630_400, n: 0.338 },
  // ATWS ≥ 260 m², DP > 7 (and ≤ 103.4)
  { atwsMin: 260, atwsMax: Infinity, pressureMin: 7, pressureMax: 103.4, a: 43_200, n: 0.82 },
  // ATWS ≥ 260 m², DP ≤ 7
  { atwsMin: 260, atwsMax: Infinity, pressureMax: 7, a: 4_129_700, n: 0 },
] as const

// ─── Environmental Factors by Tank Configuration ──────────────────────────────
// null = calculated from F-factor table (insulated) or formula (concrete)
// 0   = underground (no fire contribution)

export const FIXED_ENVIRONMENTAL_FACTORS: Partial<Record<TankConfiguration, number>> = {
  [TankConfiguration.BARE_METAL]: 1.0,
  [TankConfiguration.WATER_APPLICATION]: 1.0,
  [TankConfiguration.DEPRESSURING]: 1.0,
  [TankConfiguration.UNDERGROUND]: 0,
  [TankConfiguration.EARTH_COVERED]: 0.03,
  [TankConfiguration.IMPOUNDMENT_AWAY]: 0.3,
  [TankConfiguration.IMPOUNDMENT]: 0.5,
  [TankConfiguration.CONCRETE]: 0.03, // same as earth-covered per API 2000
  // INSULATED_FULL and INSULATED_PARTIAL → lookup from F-factor table
}

// ─── Insulation Material Conductivity Reference (API 2000 §7.5) ──────────────

export interface InsulationMaterial {
  name: string
  conductivity: number // W/m·K
}

export const INSULATION_MATERIALS: InsulationMaterial[] = [
  { name: "Cellular Glass", conductivity: 0.05 },
  { name: "Mineral Fiber", conductivity: 0.04 },
  { name: "Calcium Silicate", conductivity: 0.06 },
  { name: "Perlite", conductivity: 0.07 },
]

// ─── Latitude Bands ───────────────────────────────────────────────────────────

export const LATITUDE_BAND_LOW = 42 // 0 < lat ≤ 42 → "below 42°"
export const LATITUDE_BAND_MID = 58 // 42 < lat ≤ 58 → "between 42° and 58°"
// lat > 58 → "above 58°"
