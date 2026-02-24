"use client"

import type { NormalVentingResult as NVResult, ApiEdition } from "@/types"

interface Props {
  result: NVResult
  apiEdition: ApiEdition
  drainInbreathing?: number
}

interface RowProps {
  label: string
  value: number
  bold?: boolean
}

function Row({ label, value, bold }: RowProps) {
  return (
    <div className={`flex justify-between px-3 py-1.5 text-xs ${bold ? "bg-muted/30 font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className="font-mono tabular-nums">{value.toFixed(2)} Nm³/h</span>
    </div>
  )
}

export function NormalVentingResult({ result, apiEdition, drainInbreathing }: Props) {
  const { outbreathing, inbreathing } = result
  const show7th = apiEdition === "7TH"

  return (
    <div className="space-y-4">
      {/* Outbreathing */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Outbreathing
        </p>
        <div className="divide-y rounded-md border overflow-hidden">
          <Row label="Process flowrate" value={outbreathing.processFlowrate} />
          <Row
            label={
              show7th
                ? `Thermal (Y = ${outbreathing.yFactor.toFixed(2)}, R = ${outbreathing.reductionFactor.toFixed(4)})`
                : "Thermal outbreathing"
            }
            value={outbreathing.thermalOutbreathing}
          />
          <Row label="Total outbreathing" value={outbreathing.total} bold />
        </div>
      </div>

      {/* Inbreathing */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Inbreathing
        </p>
        <div className="divide-y rounded-md border overflow-hidden">
          <Row label="Process flowrate" value={inbreathing.processFlowrate} />
          <Row
            label={
              show7th
                ? `Thermal (C = ${inbreathing.cFactor.toFixed(2)}, R = ${inbreathing.reductionFactor.toFixed(4)})`
                : "Thermal inbreathing"
            }
            value={inbreathing.thermalInbreathing}
          />
          <Row label="Total inbreathing" value={inbreathing.total} bold />
        </div>
      </div>

      {/* Drain */}
      {drainInbreathing !== undefined && (
        <div className="flex justify-between px-3 py-1.5 text-xs rounded-md border">
          <span className="text-muted-foreground">Drain system inbreathing</span>
          <span className="font-mono tabular-nums">{drainInbreathing.toFixed(2)} Nm³/h</span>
        </div>
      )}
    </div>
  )
}
