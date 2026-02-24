"use client"

import { useEffect, useRef } from "react"
import { useWatch } from "react-hook-form"
import type { Control } from "react-hook-form"
import { z } from "zod"
import { calculationInputSchema } from "@/lib/validation/inputSchema"
import { computeDerivedGeometry } from "@/lib/calculations/geometry"
import { useCalculatorStore } from "@/lib/store/calculatorStore"
import { TankConfiguration } from "@/types"
import type { CalculationInput, CalculationResult } from "@/types"

// Minimal schema covering only the fields needed for client-side geometry.
// This allows the Derived Geometry panel to update as soon as tank dimensions
// are valid, without waiting for fluid properties to be filled in.
// NaN-tolerant optional number: treats NaN (from valueAsNumber on empty inputs) as absent.
const nanOptionalPositive = z
  .number()
  .positive()
  .optional()
  .or(z.nan().transform(() => undefined))

const nanOptionalNonneg = z
  .number()
  .nonnegative()
  .optional()
  .or(z.nan().transform(() => undefined))

const geometrySchema = z
  .object({
    diameter: z.number().positive(),
    height: z.number().positive(),
    latitude: z.number().gt(0).lte(90),
    designPressure: z.number().positive(),
    tankConfiguration: z.nativeEnum(TankConfiguration),
    insulationThickness: nanOptionalPositive,
    insulationConductivity: nanOptionalPositive,
    insideHeatTransferCoeff: nanOptionalPositive,
    insulatedSurfaceArea: nanOptionalNonneg,
  })
  .passthrough()

/** Milliseconds of inactivity before the API call fires. */
const DEBOUNCE_MS = 300

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * `useCalculation` wires a React Hook Form control to the Zustand calculator
 * store, providing two layers of reactivity:
 *
 * 1. **Immediate** — derived geometry (volume, surface areas, reduction factor)
 *    is recomputed client-side on every valid keystroke, so the "Derived
 *    Geometry" panel stays in sync without waiting for the API.
 *
 * 2. **Debounced (300 ms)** — once the form has been idle for 300 ms and all
 *    fields are valid, a POST to /api/vent/calculate is made.  In-flight
 *    requests are cancelled when a newer change arrives (via AbortController).
 *
 * Usage:
 * ```tsx
 * const form = useForm<CalculationInput>({ ... })
 * useCalculation(form.control)
 * ```
 */
export function useCalculation(control: Control<CalculationInput>) {
  const { setDerivedGeometry, setCalculationResult, setLoading, setError } =
    useCalculatorStore()

  // useWatch re-renders this hook only when the watched values change.
  // Returning a stable object reference per React Hook Form conventions.
  const formValues = useWatch({ control })

  // Ref for the in-flight AbortController — lives outside the render cycle.
  const abortRef = useRef<AbortController | null>(null)

  // ── Immediate: client-side derived geometry ────────────────────────────────
  useEffect(() => {
    const parsed = geometrySchema.safeParse(formValues)
    if (!parsed.success) {
      setDerivedGeometry(null)
      return
    }
    try {
      setDerivedGeometry(computeDerivedGeometry(parsed.data as unknown as CalculationInput))
    } catch {
      // e.g. INSULATED_FULL without insulation params — not yet fatal, just clear
      setDerivedGeometry(null)
    }
    // formValues identity changes whenever any field changes — that's the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formValues)])

  // ── Debounced: API call ────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      const parsed = calculationInputSchema.safeParse(formValues)
      if (!parsed.success) {
        // Form is still incomplete — clear stale results and any previous error,
        // and let the checklist handle the "what to fill" guidance.
        setError(null)
        setCalculationResult(null)
        return
      }

      // Cancel any previous in-flight request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/vent/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
          signal: controller.signal,
        })

        if (controller.signal.aborted) return

        if (!response.ok) {
          const body = (await response.json()) as { error?: string }
          setError(body.error ?? "Calculation failed — please check your inputs")
          setCalculationResult(null)
        } else {
          const result = (await response.json()) as CalculationResult
          setCalculationResult(result)
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setError("Network error — please try again")
        setCalculationResult(null)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formValues)])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])
}
