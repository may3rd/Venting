"use client"

import type { VentingSummary } from "@/types"

interface Props {
  summary: VentingSummary
}

interface SummaryMetricProps {
  label: string
  value: number
  sub?: string
}

function SummaryMetric({ label, value, sub }: SummaryMetricProps) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground leading-none mb-1">{label}</p>
      <p className="text-xl font-bold tabular-nums leading-none">
        {value.toFixed(1)}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub ?? "Nm³/h"}</p>
    </div>
  )
}

export function SummaryResult({ summary }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4 py-1">
      <SummaryMetric
        label="Design Outbreathing"
        value={summary.designOutbreathing}
      />
      <SummaryMetric
        label="Design Inbreathing"
        value={summary.designInbreathing}
      />
      <SummaryMetric
        label="Emergency Venting"
        value={summary.emergencyVenting}
      />
    </div>
  )
}
