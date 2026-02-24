"use client"

import { useFormContext } from "react-hook-form"
import { Label } from "@/components/ui/label"
import type { CalculationInput, ApiEdition } from "@/types"

const EDITIONS: { value: ApiEdition; label: string; description: string }[] = [
  {
    value: "5TH",
    label: "5th Edition",
    description: "max(process, thermal); 0.94 factor on process inbreathing",
  },
  {
    value: "6TH",
    label: "6th Edition",
    description: "process + thermal (sum)",
  },
  {
    value: "7TH",
    label: "7th Edition (Recommended)",
    description: "process + thermal with Y/C-factor adjustments",
  },
]

export function ApiEditionSelector() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CalculationInput>()

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">API 2000 Edition</Label>
      <div className="flex flex-col gap-2">
        {EDITIONS.map(({ value, label, description }) => (
          <label
            key={value}
            className="flex items-start gap-3 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-colors"
          >
            <input
              type="radio"
              value={value}
              {...register("apiEdition")}
              className="mt-0.5 accent-primary"
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium leading-none">{label}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{description}</span>
            </span>
          </label>
        ))}
      </div>
      {errors.apiEdition && (
        <p className="text-xs text-destructive">{errors.apiEdition.message}</p>
      )}
    </div>
  )
}
