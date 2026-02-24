import { z } from "zod"
import { TankConfiguration } from "@/types"
import { MAX_DESIGN_PRESSURE_KPAG } from "@/lib/constants"

// ─── NaN-tolerant optional helpers ────────────────────────────────────────────
// Empty number inputs with `valueAsNumber` produce NaN. These helpers coerce
// NaN → undefined so blank optional fields pass validation.

const nanOptionalPositive = z
  .number()
  .positive()
  .optional()
  .or(z.nan().transform(() => undefined))

const nanOptional = z
  .number()
  .optional()
  .or(z.nan().transform(() => undefined))

const nanOptionalNonneg = z
  .number()
  .nonnegative()
  .optional()
  .or(z.nan().transform(() => undefined))

// ─── Stream Schemas ───────────────────────────────────────────────────────────

export const streamSchema = z.object({
  streamNo: z.string(),
  description: z.string().optional(),
  flowrate: z
    .number({ error: "Flowrate must be a number" })
    .nonnegative("Flowrate must be ≥ 0"),
})

export const outgoingStreamSchema = streamSchema.extend({
  description: z.string().optional(),
})

// ─── Main Input Schema ────────────────────────────────────────────────────────

export const calculationInputSchema = z
  .object({
    // Identification
    tankNumber: z.string().min(1, "Tank number is required"),
    description: z.string().optional(),

    // Tank geometry
    diameter: z
      .number({ error: "Diameter must be a number" })
      .positive("Diameter must be > 0"),
    height: z
      .number({ error: "Height must be a number" })
      .positive("Height must be > 0"),
    latitude: z
      .number({ error: "Latitude must be a number" })
      .gt(0, "Latitude must be > 0°")
      .lte(90, "Latitude must be ≤ 90°"),
    designPressure: z
      .number({ error: "Design pressure must be a number" })
      .positive("Design pressure must be > 0"),

    // Configuration
    tankConfiguration: z.nativeEnum(TankConfiguration, {
      error: "Invalid tank configuration",
    }),
    insulationThickness: nanOptionalPositive,
    insulationConductivity: nanOptionalPositive,
    insideHeatTransferCoeff: nanOptionalPositive,
    insulatedSurfaceArea: nanOptionalNonneg,

    // Fluid properties
    avgStorageTemp: z.number({ error: "Average storage temperature must be a number" }),
    vapourPressure: z
      .number({ error: "Vapour pressure must be a number" })
      .nonnegative("Vapour pressure must be ≥ 0"),
    flashBoilingPointType: z.enum(["FP", "BP"] as const, {
      error: "Must be 'FP' or 'BP'",
    }),
    flashBoilingPoint: nanOptional,
    latentHeat: nanOptionalPositive,
    relievingTemperature: nanOptional,
    molecularMass: nanOptionalPositive,

    // Streams
    incomingStreams: z.array(streamSchema).default([]),
    outgoingStreams: z.array(outgoingStreamSchema).default([]),

    // Drain system (both required together or both absent)
    drainLineSize: nanOptionalPositive,
    maxHeightAboveDrain: nanOptionalPositive,

    // Settings
    apiEdition: z.enum(["5TH", "6TH", "7TH"] as const, {
      error: "API edition must be '5TH', '6TH', or '7TH'",
    }),
  })
  .superRefine((data, ctx) => {
    // ── Design pressure limit ──────────────────────────────────────────────────
    if (data.designPressure > MAX_DESIGN_PRESSURE_KPAG) {
      ctx.addIssue({
        code: "custom",
        path: ["designPressure"],
        message: `Design Pressure over ${MAX_DESIGN_PRESSURE_KPAG} kPag — calculation not applicable`,
      })
    }

    // ── Insulation fields required for insulated configurations ───────────────
    const requiresInsulation =
      data.tankConfiguration === TankConfiguration.INSULATED_FULL ||
      data.tankConfiguration === TankConfiguration.INSULATED_PARTIAL

    if (requiresInsulation) {
      if (data.insulationThickness == null) {
        ctx.addIssue({
          code: "custom",
          path: ["insulationThickness"],
          message: "Required for insulated tank configurations",
        })
      }
      if (data.insulationConductivity == null) {
        ctx.addIssue({
          code: "custom",
          path: ["insulationConductivity"],
          message: "Required for insulated tank configurations",
        })
      }
      if (data.insideHeatTransferCoeff == null) {
        ctx.addIssue({
          code: "custom",
          path: ["insideHeatTransferCoeff"],
          message: "Required for insulated tank configurations",
        })
      }
    }

    // ── Partial insulation: insulatedSurfaceArea required ─────────────────────
    if (data.tankConfiguration === TankConfiguration.INSULATED_PARTIAL) {
      if (data.insulatedSurfaceArea == null) {
        ctx.addIssue({
          code: "custom",
          path: ["insulatedSurfaceArea"],
          message: "Required for partially insulated tank (A_inp)",
        })
      }
    }

    // ── Drain fields: both or neither ─────────────────────────────────────────
    const hasDrainSize = data.drainLineSize != null
    const hasDrainHeight = data.maxHeightAboveDrain != null

    if (hasDrainSize && !hasDrainHeight) {
      ctx.addIssue({
        code: "custom",
        path: ["maxHeightAboveDrain"],
        message: "Required when drain line size is specified",
      })
    }
    if (hasDrainHeight && !hasDrainSize) {
      ctx.addIssue({
        code: "custom",
        path: ["drainLineSize"],
        message: "Required when max height above drain is specified",
      })
    }
  })

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type CalculationInputSchema = z.infer<typeof calculationInputSchema>
