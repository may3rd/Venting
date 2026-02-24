import { NextRequest, NextResponse } from "next/server"
import { getEnvironmentalFactor } from "@/lib/lookups/fFactor"
import { TankConfiguration } from "@/types"
import type { ApiError } from "@/types"

const VALID_CONFIGS = new Set<string>(Object.values(TankConfiguration))

/**
 * GET /api/vent/lookup/ffactor
 *
 * Returns the environmental F-factor for a given tank configuration.
 * For insulated configurations, conductivity and thickness are required.
 *
 * Query params:
 *   config        string   TankConfiguration enum value (required)
 *   conductivity  number   Insulation thermal conductivity W/m·K (required for insulated)
 *   thickness     number   Insulation thickness mm (required for insulated)
 *
 * Response:
 *   { fFactor: number }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // ── config ────────────────────────────────────────────────────────────────
  const configRaw = searchParams.get("config")
  if (configRaw === null) {
    const err: ApiError = { error: "Query parameter 'config' is required" }
    return NextResponse.json(err, { status: 400 })
  }
  if (!VALID_CONFIGS.has(configRaw)) {
    const err: ApiError = {
      error: `Invalid config. Valid values: ${[...VALID_CONFIGS].join(", ")}`,
    }
    return NextResponse.json(err, { status: 400 })
  }
  const config = configRaw as TankConfiguration

  // ── conductivity (optional, required for insulated) ───────────────────────
  let conductivity: number | undefined
  const condRaw = searchParams.get("conductivity")
  if (condRaw !== null) {
    const parsed = Number(condRaw)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      const err: ApiError = { error: "conductivity must be a positive number (W/m·K)" }
      return NextResponse.json(err, { status: 400 })
    }
    conductivity = parsed
  }

  // ── thickness (optional, required for insulated) ──────────────────────────
  let thickness: number | undefined
  const thickRaw = searchParams.get("thickness")
  if (thickRaw !== null) {
    const parsed = Number(thickRaw)
    if (!Number.isFinite(parsed) || parsed < 0) {
      const err: ApiError = { error: "thickness must be a non-negative number (mm)" }
      return NextResponse.json(err, { status: 400 })
    }
    thickness = parsed
  }

  try {
    const fFactor = getEnvironmentalFactor(config, conductivity, thickness)
    return NextResponse.json({ fFactor })
  } catch (error) {
    const message = error instanceof Error ? error.message : "F-factor calculation error"
    const err: ApiError = { error: message }
    return NextResponse.json(err, { status: 400 })
  }
}
