import { z } from "zod"
import { TankConfiguration } from "@/types"
import { MAX_DESIGN_PRESSURE_KPAG } from "@/lib/constants"

// ─── Stream Schemas ───────────────────────────────────────────────────────────

export const streamSchema = z.object({
  streamNo: z.string().min(1, "Stream number is required"),
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
    insulationThickness: z
      .number({ error: "Insulation thickness must be a number" })
      .positive("Insulation thickness must be > 0")
      .optional(),
    insulationConductivity: z
      .number({ error: "Insulation conductivity must be a number" })
      .positive("Insulation conductivity must be > 0")
      .optional(),
    insideHeatTransferCoeff: z
      .number({ error: "Inside heat transfer coefficient must be a number" })
      .positive("Inside heat transfer coefficient must be > 0")
      .optional(),
    insulatedSurfaceArea: z
      .number({ error: "Insulated surface area must be a number" })
      .nonnegative("Insulated surface area must be ≥ 0")
      .optional(),

    // Fluid properties
    avgStorageTemp: z.number({ error: "Average storage temperature must be a number" }),
    vapourPressure: z
      .number({ error: "Vapour pressure must be a number" })
      .nonnegative("Vapour pressure must be ≥ 0"),
    flashBoilingPointType: z.enum(["FP", "BP"] as const, {
      error: "Must be 'FP' or 'BP'",
    }),
    flashBoilingPoint: z
      .number({ error: "Flash/boiling point must be a number" })
      .optional(),
    latentHeat: z
      .number({ error: "Latent heat must be a number" })
      .positive("Latent heat must be > 0")
      .optional(),
    relievingTemperature: z
      .number({ error: "Relieving temperature must be a number" })
      .optional(),
    molecularMass: z
      .number({ error: "Molecular mass must be a number" })
      .positive("Molecular mass must be > 0")
      .optional(),

    // Streams
    incomingStreams: z.array(streamSchema).default([]),
    outgoingStreams: z.array(outgoingStreamSchema).default([]),

    // Drain system (both required together or both absent)
    drainLineSize: z
      .number({ error: "Drain line size must be a number" })
      .positive("Drain line size must be > 0")
      .optional(),
    maxHeightAboveDrain: z
      .number({ error: "Max height above drain must be a number" })
      .positive("Max height above drain must be > 0")
      .optional(),

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
