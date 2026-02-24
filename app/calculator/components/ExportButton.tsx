"use client"

import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { useCalculatorStore } from "@/lib/store/calculatorStore"
import type { CalculationInput } from "@/types"

/**
 * ExportButton — generates a PDF from the current calculation result and
 * triggers a browser download.  Disabled when there is no valid result.
 *
 * Uses a dynamic import of @react-pdf/renderer to avoid SSR issues.
 */
export function ExportButton() {
  const { calculationResult } = useCalculatorStore()
  const { getValues } = useFormContext<CalculationInput>()
  const [generating, setGenerating] = useState(false)

  const handleExport = async () => {
    if (!calculationResult) return

    setGenerating(true)
    try {
      // Dynamic import keeps the heavy PDF library out of the initial bundle
      const [{ pdf }, { CalculationReport }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/CalculationReport"),
      ])

      const input = getValues()
      const blob = await pdf(
        <CalculationReport input={input} result={calculationResult} />
      ).toBlob()

      // Trigger download
      const url = URL.createObjectURL(blob)
      const a   = document.createElement("a")
      a.href     = url
      a.download = `venting-calc-${input.tankNumber || "report"}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("PDF generation failed:", err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!calculationResult || generating}
      onClick={handleExport}
      className="gap-2"
    >
      {generating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating…
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Export PDF
        </>
      )}
    </Button>
  )
}
