"use client"

import { useCalculatorStore } from "@/lib/store/calculatorStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

interface MetricRowProps {
  label: string
  value: string
  unit: string
}

function MetricRow({ label, value, unit }: MetricRowProps) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-mono font-medium tabular-nums">
        {value}{" "}
        <span className="text-muted-foreground font-normal">{unit}</span>
      </span>
    </div>
  )
}

export function DerivedGeometry() {
  const derivedGeometry = useCalculatorStore((s) => s.derivedGeometry)

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Derived Geometry</CardTitle>
          <Badge variant={derivedGeometry ? "secondary" : "outline"} className="text-xs">
            {derivedGeometry ? "Live" : "Pending input"}
          </Badge>
        </div>
        <Separator />
      </CardHeader>
      <CardContent>
        {derivedGeometry == null ? (
          <p className="text-xs text-muted-foreground italic text-center py-2">
            Enter valid tank dimensions to see geometry.
          </p>
        ) : (
          <div className="divide-y">
            <MetricRow
              label="Max Tank Volume"
              value={derivedGeometry.maxTankVolume.toFixed(2)}
              unit="m³"
            />
            <MetricRow
              label="Shell Surface Area"
              value={derivedGeometry.shellSurfaceArea.toFixed(2)}
              unit="m²"
            />
            <MetricRow
              label="Cone Roof Area"
              value={derivedGeometry.coneRoofArea.toFixed(2)}
              unit="m²"
            />
            <MetricRow
              label="Total Surface Area"
              value={derivedGeometry.totalSurfaceArea.toFixed(2)}
              unit="m²"
            />
            <MetricRow
              label="Wetted Area (ATWS)"
              value={derivedGeometry.wettedArea.toFixed(2)}
              unit="m²"
            />
            <MetricRow
              label="Reduction Factor (R)"
              value={derivedGeometry.reductionFactor.toFixed(4)}
              unit=""
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
