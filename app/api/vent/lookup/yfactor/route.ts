import { NextRequest, NextResponse } from "next/server"
import { getYFactor } from "@/lib/lookups/yFactor"
import type { ApiError } from "@/types"

/**
 * GET /api/vent/lookup/yfactor?latitude=<number>
 *
 * Returns the Y-factor for thermal outbreathing based on latitude band.
 *
 * Query params:
 *   latitude  number  degrees (0 < lat ≤ 90)
 *
 * Response:
 *   { yFactor: number }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

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

  return NextResponse.json({ yFactor: getYFactor(latitude) })
}
