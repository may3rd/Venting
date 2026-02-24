"use client"

import { useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import type { CalculationInput } from "@/types"
import { SectionCard } from "../components/SectionCard"
import { FieldRow } from "../components/FieldRow"
import { ConfigSelector } from "../components/ConfigSelector"

export function TankDetailSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CalculationInput>()

  return (
    <SectionCard title="Tank Details">
      {/* Identification */}
      <div className="grid grid-cols-2 gap-3">
        <FieldRow
          label="Tank Number"
          htmlFor="tankNumber"
          required
          error={errors.tankNumber?.message}
          className="col-span-1"
        >
          <Input
            id="tankNumber"
            placeholder="e.g. T-101"
            {...register("tankNumber")}
          />
        </FieldRow>
        <FieldRow
          label="Description"
          htmlFor="description"
          error={errors.description?.message}
          className="col-span-1"
        >
          <Input
            id="description"
            placeholder="Optional description"
            {...register("description")}
          />
        </FieldRow>
      </div>

      {/* Geometry */}
      <div className="grid grid-cols-2 gap-3">
        <FieldRow
          label="Diameter (D)"
          htmlFor="diameter"
          unit="mm"
          required
          error={errors.diameter?.message}
        >
          <Input
            id="diameter"
            type="number"
            step="any"
            placeholder="e.g. 24000"
            {...register("diameter", { valueAsNumber: true })}
          />
        </FieldRow>
        <FieldRow
          label="Height (TL–TL)"
          htmlFor="height"
          unit="mm"
          required
          error={errors.height?.message}
        >
          <Input
            id="height"
            type="number"
            step="any"
            placeholder="e.g. 17500"
            {...register("height", { valueAsNumber: true })}
          />
        </FieldRow>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow
          label="Latitude"
          htmlFor="latitude"
          unit="°"
          required
          error={errors.latitude?.message}
          hint="[0°, 90°] — for thermal factors"
        >
          <Input
            id="latitude"
            type="number"
            step="any"
            placeholder="e.g. 12.7"
            {...register("latitude", { valueAsNumber: true })}
          />
        </FieldRow>
        <FieldRow
          label="Design Pressure"
          htmlFor="designPressure"
          unit="kPag"
          required
          error={errors.designPressure?.message}
          hint="-101.3 to 103.4 kPag"
        >
          <Input
            id="designPressure"
            type="number"
            step="any"
            placeholder="e.g. 5"
            {...register("designPressure", { valueAsNumber: true })}
          />
        </FieldRow>
      </div>

      {/* Configuration */}
      <ConfigSelector />
    </SectionCard>
  )
}
