import { NextRequest, NextResponse } from "next/server"
import { calculationInputSchema } from "@/lib/validation/inputSchema"
import { calculate } from "@/lib/calculations"
import { computeDerivedGeometry } from "@/lib/calculations/geometry"
import type { ApiError } from "@/types"

/**
 * POST /api/vent/calculate
 *
 * Accepts a JSON body matching `CalculationInput`, runs the full venting
 * calculation, and returns a `CalculationResult` JSON object.
 *
 * Error responses:
 *   400 — Zod validation failure (details: ZodIssue[])
 *   500 — Unexpected server error (includes requestId + timestamp for tracing)
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    const err: ApiError = { error: "Request body must be valid JSON" }
    return NextResponse.json(err, { status: 400 })
  }

  const parsed = calculationInputSchema.safeParse(body)
  if (!parsed.success) {
    const err: ApiError = {
      error: "Validation failed",
      details: parsed.error.issues,
    }
    return NextResponse.json(err, { status: 400 })
  }

  // ── Cross-validate insulatedSurfaceArea ≤ total tank surface area ──────────
  if (parsed.data.insulatedSurfaceArea !== undefined) {
    const derived = computeDerivedGeometry(parsed.data)
    if (parsed.data.insulatedSurfaceArea > derived.totalSurfaceArea) {
      const err: ApiError = {
        error: "Validation failed",
        details: [{
          path: ["insulatedSurfaceArea"],
          message:
            `Insulated surface area (${parsed.data.insulatedSurfaceArea.toFixed(2)} m²) ` +
            `exceeds total tank surface area (${derived.totalSurfaceArea.toFixed(2)} m²)`,
        }],
      }
      return NextResponse.json(err, { status: 400 })
    }
  }

  try {
    const result = calculate(parsed.data)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected calculation error"
    const err: ApiError = {
      error: message,
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    return NextResponse.json(err, { status: 500 })
  }
}
