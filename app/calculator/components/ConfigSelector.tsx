"use client"

import { useFormContext, Controller } from "react-hook-form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { TankConfiguration } from "@/types"
import type { CalculationInput } from "@/types"
import { INSULATION_MATERIALS } from "@/lib/constants"
import { FieldRow } from "./FieldRow"

const CONFIG_OPTIONS: { value: TankConfiguration; label: string }[] = [
  { value: TankConfiguration.BARE_METAL, label: "Bare Metal (No Insulation)" },
  { value: TankConfiguration.INSULATED_FULL, label: "Insulated — Fully Insulated" },
  { value: TankConfiguration.INSULATED_PARTIAL, label: "Insulated — Partially Insulated" },
  { value: TankConfiguration.CONCRETE, label: "Concrete / Fire Proofing" },
  { value: TankConfiguration.WATER_APPLICATION, label: "Water Application Facilities" },
  { value: TankConfiguration.DEPRESSURING, label: "Depressuring and Emptying" },
  { value: TankConfiguration.UNDERGROUND, label: "Underground Storage" },
  { value: TankConfiguration.EARTH_COVERED, label: "Earth-Covered Above Grade" },
  { value: TankConfiguration.IMPOUNDMENT_AWAY, label: "Impoundment Away from Tank" },
  { value: TankConfiguration.IMPOUNDMENT, label: "Impoundment" },
]

export function ConfigSelector() {
  const {
    register,
    watch,
    control,
    formState: { errors },
  } = useFormContext<CalculationInput>()

  const config = watch("tankConfiguration")
  const isInsulated =
    config === TankConfiguration.INSULATED_FULL ||
    config === TankConfiguration.INSULATED_PARTIAL
  const isPartial = config === TankConfiguration.INSULATED_PARTIAL

  return (
    <div className="space-y-4">
      {/* Configuration selector */}
      <FieldRow
        label="Tank Configuration"
        htmlFor="tankConfiguration"
        required
        error={errors.tankConfiguration?.message}
      >
        <Controller
          name="tankConfiguration"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="tankConfiguration" className="w-full">
                <SelectValue placeholder="Select configuration…" />
              </SelectTrigger>
              <SelectContent>
                {CONFIG_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldRow>

      {/* Insulation fields — shown only for insulated configs */}
      {isInsulated && (
        <div className="rounded-md border border-dashed p-3 space-y-3 bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Insulation Parameters
          </p>

          <FieldRow
            label="Insulation Thickness"
            htmlFor="insulationThickness"
            unit="mm"
            required
            error={errors.insulationThickness?.message}
          >
            <Input
              id="insulationThickness"
              type="number"
              step="any"
              placeholder="e.g. 102"
              {...register("insulationThickness", { valueAsNumber: true })}
            />
          </FieldRow>

          <FieldRow
            label="Insulation Conductivity (k)"
            htmlFor="insulationConductivity"
            unit="W/m·K"
            required
            error={errors.insulationConductivity?.message}
            hint={`Typical: ${INSULATION_MATERIALS.map((m) => `${m.name} ${m.conductivity}`).join(", ")}`}
          >
            <Input
              id="insulationConductivity"
              type="number"
              step="any"
              placeholder="e.g. 0.05"
              {...register("insulationConductivity", { valueAsNumber: true })}
            />
          </FieldRow>

          <FieldRow
            label="Inside Heat Transfer Coeff (U_i)"
            htmlFor="insideHeatTransferCoeff"
            unit="W/m²·K"
            required
            error={errors.insideHeatTransferCoeff?.message}
          >
            <Input
              id="insideHeatTransferCoeff"
              type="number"
              step="any"
              placeholder="e.g. 11.4"
              {...register("insideHeatTransferCoeff", { valueAsNumber: true })}
            />
          </FieldRow>

          {isPartial && (
            <FieldRow
              label="Insulated Surface Area (A_inp)"
              htmlFor="insulatedSurfaceArea"
              unit="m²"
              required
              error={errors.insulatedSurfaceArea?.message}
              hint="Area of tank covered by insulation"
            >
              <Input
                id="insulatedSurfaceArea"
                type="number"
                step="any"
                placeholder="e.g. 500"
                {...register("insulatedSurfaceArea", { valueAsNumber: true })}
              />
            </FieldRow>
          )}
        </div>
      )}
    </div>
  )
}
