"use client"

import type { EmergencyVentingResult as EVResult } from "@/types"

interface Props {
  result: EVResult
}

export function EmergencyVentingResult({ result }: Props) {
  return (
    <div className="divide-y rounded-md border overflow-hidden">
      <div className="flex justify-between px-3 py-1.5 text-xs">
        <span className="text-muted-foreground">
          Coefficients (a = {result.coefficients.a.toLocaleString()}, n = {result.coefficients.n})
        </span>
        <span className="font-mono tabular-nums text-muted-foreground">Q = a × ATWS^n</span>
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
