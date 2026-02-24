"use client"

import { useCalculatorStore } from "@/lib/store/calculatorStore"
import { useFormContext } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, CheckCircle2, Circle } from "lucide-react"
import { SectionCard } from "./SectionCard"
import { TankSchematic } from "./TankSchematic"
import { SummaryResult } from "../results/SummaryResult"
import { NormalVentingResult } from "../results/NormalVentingResult"
import { EmergencyVentingResult } from "../results/EmergencyVentingResult"
import type { CalculationInput } from "@/types"

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

      {/* Empty state — show what's still needed */}
      {!calculationResult && !isLoading && !error && (
        <RequirementsChecklist />
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

// ─── Requirements checklist (empty state) ─────────────────────────────────────

function RequirementsChecklist() {
  const { watch } = useFormContext<CalculationInput>()
  const values = watch()

  const isValidNumber = (v: unknown) =>
    typeof v === "number" && !isNaN(v) && isFinite(v)

  const isInsulated =
    values.tankConfiguration === "Insulated tank - Fully Insulation" ||
    values.tankConfiguration === "Insulated tank - Partial Insulation"
  const isPartialInsulation = values.tankConfiguration === "Insulated tank - Partial Insulation"

  const requiredChecks = [
    {
      label: "Tank number",
      hint: "Tag / equipment number — e.g. T-101",
      done: typeof values.tankNumber === "string" && values.tankNumber.trim().length > 0,
    },
    {
      label: "Tank geometry",
      hint: "Diameter, Height, Latitude, Design Pressure",
      done:
        isValidNumber(values.diameter) && (values.diameter as number) > 0 &&
        isValidNumber(values.height) && (values.height as number) > 0 &&
        isValidNumber(values.latitude) && (values.latitude as number) > 0 &&
        isValidNumber(values.designPressure) && (values.designPressure as number) > 0,
    },
    {
      label: "Average storage temperature",
      hint: "e.g. 25 °C",
      done: isValidNumber(values.avgStorageTemp),
    },
    {
      label: "Vapour pressure",
      hint: "e.g. 17.5 kPa",
      done: isValidNumber(values.vapourPressure) && (values.vapourPressure as number) >= 0,
    },
    ...(isInsulated
      ? [
        {
          label: "Insulation properties",
          hint: "Thickness, conductivity, and inside heat transfer coefficient are required for insulated tanks",
          done:
            isValidNumber(values.insulationThickness) && (values.insulationThickness as number) > 0 &&
            isValidNumber(values.insulationConductivity) && (values.insulationConductivity as number) > 0 &&
            isValidNumber(values.insideHeatTransferCoeff) && (values.insideHeatTransferCoeff as number) > 0,
        },
      ]
      : []),
    ...(isPartialInsulation
      ? [
        {
          label: "Insulated surface area (A_inp)",
          hint: "Required for partially insulated tank — m²",
          done: isValidNumber(values.insulatedSurfaceArea) && (values.insulatedSurfaceArea as number) >= 0,
        },
      ]
      : []),
  ]

  const optionalChecks = [
    {
      label: "Flash / Boiling point",
      hint: "Leave blank to treat fluid as high-volatility",
      done: isValidNumber(values.flashBoilingPoint),
    },
    {
      label: "Reference fluid (emergency venting)",
      hint: "Latent heat, relieving temp, molecular mass — defaults to Hexane",
      done:
        isValidNumber(values.latentHeat) &&
        isValidNumber(values.relievingTemperature) &&
        isValidNumber(values.molecularMass),
    },
    {
      label: "Stream flowrates",
      hint: "Add incoming / outgoing streams — defaults to 0",
      done:
        (values.incomingStreams?.length ?? 0) > 0 ||
        (values.outgoingStreams?.length ?? 0) > 0,
    },
  ]

  const allChecks = [
    ...requiredChecks.map((c) => ({ ...c, optional: false })),
    ...optionalChecks.map((c) => ({ ...c, optional: true })),
  ]

  const missingRequired = requiredChecks.filter((c) => !c.done).length
  const allRequiredDone = missingRequired === 0

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Results</CardTitle>
          {allRequiredDone ? (
            <Badge variant="secondary" className="text-xs">Calculating…</Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {missingRequired} required {missingRequired !== 1 ? "fields" : "field"} missing
            </Badge>
          )}
        </div>
        <Separator />
      </CardHeader>
      <CardContent className="space-y-1.5 pt-1">
        <p className="text-xs text-muted-foreground mb-3">
          Complete the following to generate results:
        </p>
        {allChecks.map((check) => (
          <ChecklistItem key={check.label} check={check} optional={check.optional} />
        ))}
      </CardContent>
    </Card>
  )
}

function ChecklistItem({
  check,
  optional,
}: {
  check: { label: string; hint: string; done: boolean }
  optional: boolean
}) {
  return (
    <div className="flex items-start gap-2.5">
      {check.done ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
      ) : (
        <Circle
          className={`h-4 w-4 shrink-0 mt-0.5 ${optional ? "text-muted-foreground/40" : "text-orange-400"}`}
        />
      )}
      <div>
        <p
          className={`text-xs font-medium leading-tight ${check.done
            ? "text-muted-foreground line-through"
            : optional
              ? "text-muted-foreground"
              : ""
            }`}
        >
          {check.label}
          {optional && !check.done && (
            <span className="ml-1.5 font-normal text-muted-foreground/60">optional</span>
          )}
        </p>
        {!check.done && (
          <p className="text-xs text-muted-foreground/70 leading-tight mt-0.5">
            {check.hint}
          </p>
        )}
      </div>
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
