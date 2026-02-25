"use client"

import type { ApiEdition } from "@/types"
import type { EmergencyVentingResult as EVResult } from "@/types"

interface Props {
  result: EVResult
  apiEdition: ApiEdition
}

function getEquationHint(result: EVResult, apiEdition: ApiEdition): string {
  if (result.referenceFluid === "User-defined") {
    const k = apiEdition === "5TH" ? "881.55" : "906.6"
    return `V = ${k} x Q x F / (1000 x L) x sqrt((T_r + 273.15) / M)`
  }

  // Hexane-like fluid, ATWS < 260 m² uses table path.
  if (result.coefficients.n === 1 || result.coefficients.n === 0.566 || result.coefficients.n === 0.338) {
    return "V = F x Table 7(ATWS)"
  }

  // Hexane, ATWS >= 260
  if (result.coefficients.n === 0) {
    return "V = 19,910"
  }
  return "V = 208.2 x F x ATWS^0.82"
}

export function EmergencyVentingResult({ result, apiEdition }: Props) {
  const equationHint = getEquationHint(result, apiEdition)

  return (
    <div className="divide-y rounded-md border overflow-hidden">
      <div className="flex justify-between px-3 py-1.5 text-xs">
        <span className="text-muted-foreground">
          Coefficients (a = {result.coefficients.a.toLocaleString()}, n = {result.coefficients.n})
        </span>
        <span className="font-mono tabular-nums text-muted-foreground">Q = a × ATWS^n</span>
      </div>
      <div className="flex justify-between px-3 py-1.5 text-xs">
        <span className="text-muted-foreground">Emergency vent equation</span>
        <span className="font-mono tabular-nums text-muted-foreground">{equationHint}</span>
      </div>
      <div className="flex justify-between px-3 py-1.5 text-xs">
        <span className="text-muted-foreground">Heat input (Q)</span>
        <span className="font-mono tabular-nums">
          {result.heatInput.toLocaleString(undefined, { maximumFractionDigits: 0 })} W
        </span>
      </div>
      <div className="flex justify-between px-3 py-1.5 text-xs">
        <span className="text-muted-foreground">Environmental factor (F)</span>
        <span className="font-mono tabular-nums">{result.environmentalFactor.toFixed(4)}</span>
      </div>
      <div className="flex justify-between px-3 py-1.5 text-xs bg-muted/30 font-semibold">
        <span>Emergency vent required</span>
        <span className="font-mono tabular-nums">
          {result.emergencyVentRequired.toFixed(2)} Nm³/h
        </span>
      </div>
    </div>
  )
}
