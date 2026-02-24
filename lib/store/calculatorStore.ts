import { create } from "zustand"
import type { DerivedGeometry, CalculationResult } from "@/types"

// ─── State shape ──────────────────────────────────────────────────────────────

interface CalculatorState {
  /**
   * Derived geometry computed client-side from valid form inputs.
   * Updated immediately (no debounce) whenever the user changes a geometry field.
   * null while the form is incomplete or invalid.
   */
  derivedGeometry: DerivedGeometry | null

  /**
   * Full calculation result returned by POST /api/vent/calculate.
   * Updated 300 ms after the last valid form change.
   * null before the first successful call or when the form becomes invalid.
   */
  calculationResult: CalculationResult | null

  /** True while an API request is in-flight. */
  isLoading: boolean

  /**
   * Human-readable error message from the last failed API call.
   * null when there is no error.
   */
  error: string | null
}

// ─── Actions ──────────────────────────────────────────────────────────────────

interface CalculatorActions {
  setDerivedGeometry: (geometry: DerivedGeometry | null) => void
  setCalculationResult: (result: CalculationResult | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  /** Reset all state to initial values (e.g. on form reset). */
  reset: () => void
}

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_STATE: CalculatorState = {
  derivedGeometry:   null,
  calculationResult: null,
  isLoading:         false,
  error:             null,
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCalculatorStore = create<CalculatorState & CalculatorActions>()((set) => ({
  ...INITIAL_STATE,

  setDerivedGeometry:   (geometry) => set({ derivedGeometry: geometry }),
  setCalculationResult: (result)   => set({ calculationResult: result }),
  setLoading:           (loading)  => set({ isLoading: loading }),
  setError:             (error)    => set({ error }),
  reset:                ()         => set(INITIAL_STATE),
}))
