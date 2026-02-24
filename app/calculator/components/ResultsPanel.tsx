"use client"

import { useCalculatorStore } from "@/lib/store/calculatorStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle } from "lucide-react"
import { SectionCard } from "./SectionCard"
import { TankSchematic } from "./TankSchematic"
import { SummaryResult } from "../results/SummaryResult"
import { NormalVentingResult } from "../results/NormalVentingResult"
import { EmergencyVentingResult } from "../results/EmergencyVentingResult"

export function ResultsPanel() {
  const { calculationResult, isLoading, error } = useCalculatorStore()

  return (
    <div className="space-y-4">
      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculating…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {!calculationResult && !isLoading && !error && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Results</CardTitle>
            <Separator />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground italic text-center py-4">
              Fill in valid inputs to see venting calculation results.
            </p>
          </CardContent>
        </Card>
      )}

      {calculationResult && (
        <>
          {/* ── Warnings ────────────────────────────────────────────────────── */}
          {(calculationResult.warnings.capacityExceedsTable ||
            calculationResult.warnings.undergroundTank ||
            calculationResult.warnings.hexaneDefaults) && (
            <div className="space-y-1.5">
              {calculationResult.warnings.capacityExceedsTable && (
                <WarningBanner color="yellow">
                  Tank capacity exceeds 30,000 m³ — outside normal vent table range
                </WarningBanner>
              )}
              {calculationResult.warnings.undergroundTank && (
                <WarningBanner color="blue">
                  Underground tank — environmental factor F = 0, emergency vent = 0
                </WarningBanner>
              )}
              {calculationResult.warnings.hexaneDefaults && (
                <WarningBanner color="orange">
                  Using Hexane defaults for latent heat / relieving temperature / molecular mass
                </WarningBanner>
              )}
            </div>
          )}

          {/* ── Design Summary ───────────────────────────────────────────────── */}
          <Card className="shadow-sm border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Design Summary</CardTitle>
                <Badge variant="secondary">{calculationResult.apiEdition} Edition</Badge>
              </div>
              <Separator />
            </CardHeader>
            <CardContent>
              <SummaryResult summary={calculationResult.summary} />
            </CardContent>
          </Card>

          {/* ── Tank Schematic ───────────────────────────────────────────────── */}
          <TankSchematic />

          {/* ── Normal Venting ───────────────────────────────────────────────── */}
          <SectionCard title="Normal Venting">
            <NormalVentingResult
              result={calculationResult.normalVenting}
              apiEdition={calculationResult.apiEdition}
              drainInbreathing={calculationResult.drainInbreathing}
            />
          </SectionCard>

          {/* ── Emergency Venting ────────────────────────────────────────────── */}
          <SectionCard
            title="Emergency Venting"
            action={
              <Badge variant="outline" className="text-xs">
                {calculationResult.emergencyVenting.referenceFluid}
              </Badge>
            }
          >
            <EmergencyVentingResult result={calculationResult.emergencyVenting} />
          </SectionCard>
        </>
      )}
    </div>
  )
}

// ─── Local helper ──────────────────────────────────────────────────────────────

type WarningColor = "yellow" | "blue" | "orange"

const WARNING_STYLES: Record<WarningColor, string> = {
  yellow:
    "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400",
  blue:
    "border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400",
  orange:
    "border-orange-500/50 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400",
}

function WarningBanner({
  color,
  children,
}: {
  color: WarningColor
  children: React.ReactNode
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${WARNING_STYLES[color]}`}
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {children}
    </div>
  )
}
