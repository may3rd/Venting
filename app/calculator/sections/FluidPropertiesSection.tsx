"use client"

import { useFormContext, Controller } from "react-hook-form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { CalculationInput } from "@/types"
import { HEXANE_DEFAULTS } from "@/lib/constants"
import { SectionCard } from "../components/SectionCard"
import { FieldRow } from "../components/FieldRow"

export function FluidPropertiesSection() {
  const {
    register,
    watch,
    control,
    formState: { errors },
  } = useFormContext<CalculationInput>()

  const fpType = watch("flashBoilingPointType")

  return (
    <SectionCard title="Fluid Properties">
      <div className="grid grid-cols-2 gap-3">
        <FieldRow
          label="Average Storage Temp"
          htmlFor="avgStorageTemp"
          unit="°C"
          required
          error={errors.avgStorageTemp?.message}
        >
          <Input
            id="avgStorageTemp"
            type="number"
            step="any"
            placeholder="e.g. 25"
            {...register("avgStorageTemp", { valueAsNumber: true })}
          />
        </FieldRow>
        <FieldRow
          label="Vapour Pressure"
          htmlFor="vapourPressure"
          unit="kPa"
          required
          error={errors.vapourPressure?.message}
        >
          <Input
            id="vapourPressure"
            type="number"
            step="any"
            placeholder="e.g. 17.5"
            {...register("vapourPressure", { valueAsNumber: true })}
          />
        </FieldRow>
      </div>

      {/* Flash/Boiling Point */}
      <div className="grid grid-cols-2 gap-3">
        <FieldRow
          label="Flash / Boiling Point Type"
          htmlFor="flashBoilingPointType"
          required
          error={errors.flashBoilingPointType?.message}
          hint="Used to classify fluid volatility"
        >
          <Controller
            name="flashBoilingPointType"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="flashBoilingPointType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FP">Flash Point (FP)</SelectItem>
                  <SelectItem value="BP">Boiling Point (BP)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FieldRow>
        <FieldRow
          label={fpType === "FP" ? "Flash Point" : "Boiling Point"}
          htmlFor="flashBoilingPoint"
          unit="°C"
          error={errors.flashBoilingPoint?.message}
          hint={
            fpType === "FP"
              ? "Low volatility if FP ≥ 37.8°C"
              : "Low volatility if BP ≥ 149°C"
          }
        >
          <Input
            id="flashBoilingPoint"
            type="number"
            step="any"
            placeholder="Optional"
            {...register("flashBoilingPoint", { valueAsNumber: true })}
          />
        </FieldRow>
      </div>

      {/* Hexane defaults section */}
      <div className="rounded-md border border-dashed p-3 space-y-3 bg-muted/20">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Emergency Venting — Reference Fluid
          </p>
          <Badge variant="secondary" className="text-xs">
            Hexane defaults if blank
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <FieldRow
            label="Latent Heat (L)"
            htmlFor="latentHeat"
            unit="kJ/kg"
            error={errors.latentHeat?.message}
          >
            <Input
              id="latentHeat"
              type="number"
              step="any"
              placeholder={`${HEXANE_DEFAULTS.latentHeat}`}
              {...register("latentHeat", { valueAsNumber: true })}
            />
          </FieldRow>
          <FieldRow
            label="Relieving Temp (T_r)"
            htmlFor="relievingTemperature"
            unit="°C"
            error={errors.relievingTemperature?.message}
          >
            <Input
              id="relievingTemperature"
              type="number"
              step="any"
              placeholder={`${HEXANE_DEFAULTS.relievingTemperature}`}
              {...register("relievingTemperature", { valueAsNumber: true })}
            />
          </FieldRow>
          <FieldRow
            label="Molecular Mass (M)"
            htmlFor="molecularMass"
            unit="g/mol"
            error={errors.molecularMass?.message}
          >
            <Input
              id="molecularMass"
              type="number"
              step="any"
              placeholder={`${HEXANE_DEFAULTS.molecularMass}`}
              {...register("molecularMass", { valueAsNumber: true })}
            />
          </FieldRow>
        </div>
      </div>
    </SectionCard>
  )
}
