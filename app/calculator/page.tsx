"use client"

import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { calculationInputSchema } from "@/lib/validation/inputSchema"
import { useCalculation } from "@/lib/hooks/useCalculation"
import type { CalculationInput } from "@/types"
import { TankConfiguration } from "@/types"
import type { Resolver } from "react-hook-form"
import { InputPanel } from "./components/InputPanel"
import { ResultsPanel } from "./components/ResultsPanel"
import { ExportButton } from "./components/ExportButton"

// ─── Default form values ───────────────────────────────────────────────────────
// Required enum fields must have valid defaults; numeric fields start empty.

const DEFAULT_VALUES = {
  tankNumber:            "",
  description:           "",
  tankConfiguration:     TankConfiguration.BARE_METAL,
  flashBoilingPointType: "FP" as const,
  incomingStreams:       [] as CalculationInput["incomingStreams"],
  outgoingStreams:       [] as CalculationInput["outgoingStreams"],
  apiEdition:            "7TH" as const,
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalculatorPage() {
  const form = useForm<CalculationInput>({
    // Cast required because zodResolver infers stream array inputs as possibly
    // undefined (due to .default([])) which differs from CalculationInput's
    // required Stream[] — behaviour is correct at runtime.
    resolver: zodResolver(calculationInputSchema) as Resolver<CalculationInput>,
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  })

  // Wire form → store (derived geometry + debounced API call)
  useCalculation(form.control)

  return (
    // FormProvider wraps the entire page so ExportButton (in the header)
    // can access form values via useFormContext.
    <FormProvider {...form}>
      <main className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold leading-tight">
                  Tank Venting Calculator
                </h1>
                <p className="text-sm text-muted-foreground">
                  Atmospheric &amp; Low Pressure Storage Tank — API 2000 (5th / 6th / 7th Edition)
                </p>
              </div>
              <ExportButton />
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* Left — Inputs */}
            <div>
              <InputPanel />
            </div>

            {/* Right — Results (sticky on large screens) */}
            <div className="xl:sticky xl:top-6">
              <ResultsPanel />
            </div>
          </div>
        </div>
      </main>
    </FormProvider>
  )
}
