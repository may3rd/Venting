import { NextRequest, NextResponse } from "next/server"
import { getCFactor } from "@/lib/lookups/cFactor"
import type { ApiError, FlashBoilingPointType } from "@/types"

/**
 * GET /api/vent/lookup/cfactor
 *
 * Returns the C-factor for thermal inbreathing.
 *
 * Query params:
 *   latitude               number   degrees (0 < lat ≤ 90)
 *   capacity               number   tank volume in m³
 *   flashBoilingPointType  string   "FP" or "BP"
 *   flashBoilingPoint      number   °C (optional — if omitted, fluid is treated as "other")
 *
 * Response:
 *   { cFactor: number }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // ── latitude ──────────────────────────────────────────────────────────────
  const latRaw = searchParams.get("latitude")
  if (latRaw === null) {
    const err: ApiError = { error: "Query parameter 'latitude' is required" }
    return NextResponse.json(err, { status: 400 })
  }
  const latitude = Number(latRaw)
  if (!Number.isFinite(latitude) || latitude <= 0 || latitude > 90) {
    const err: ApiError = { error: "latitude must be a number in the range (0, 90]" }
    return NextResponse.json(err, { status: 400 })
  }

  // ── capacity ──────────────────────────────────────────────────────────────
  const capRaw = searchParams.get("capacity")
  if (capRaw === null) {
    const err: ApiError = { error: "Query parameter 'capacity' is required" }
    return NextResponse.json(err, { status: 400 })
  }
  const capacity = Number(capRaw)
  if (!Number.isFinite(capacity) || capacity < 0) {
    const err: ApiError = { error: "capacity must be a non-negative number (m³)" }
    return NextResponse.json(err, { status: 400 })
  }

  // ── flashBoilingPointType ─────────────────────────────────────────────────
  const fpTypeRaw = searchParams.get("flashBoilingPointType")
  if (fpTypeRaw === null) {
    const err: ApiError = { error: "Query parameter 'flashBoilingPointType' is required ('FP' or 'BP')" }
    return NextResponse.json(err, { status: 400 })
  }
  if (fpTypeRaw !== "FP" && fpTypeRaw !== "BP") {
    const err: ApiError = { error: "flashBoilingPointType must be 'FP' or 'BP'" }
    return NextResponse.json(err, { status: 400 })
  }
  const flashBoilingPointType = fpTypeRaw as FlashBoilingPointType

  // ── flashBoilingPoint (optional) ──────────────────────────────────────────
  let flashBoilingPoint: number | undefined
  const fpRaw = searchParams.get("flashBoilingPoint")
  if (fpRaw !== null) {
    const parsed = Number(fpRaw)
    if (!Number.isFinite(parsed)) {
      const err: ApiError = { error: "flashBoilingPoint must be a valid number (°C)" }
      return NextResponse.json(err, { status: 400 })
    }
    flashBoilingPoint = parsed
  }

  return NextResponse.json({
    cFactor: getCFactor(latitude, flashBoilingPointType, flashBoilingPoint, capacity),
  })
}
