"use client"

import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { CalculationInput } from "@/types"
import { FieldRow } from "../components/FieldRow"

export function DrainSystemSection() {
  const [open, setOpen] = useState(false)

  const {
    register,
    formState: { errors },
  } = useFormContext<CalculationInput>()

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="flex w-full items-center justify-between p-0 h-auto hover:bg-transparent"
            >
              <span className="text-base font-semibold">
                Drain System Inbreathing
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-normal">
                {open ? (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-4 w-4" />
                    Expand (optional)
                  </>
                )}
              </span>
            </Button>
          </CollapsibleTrigger>
          <Separator />
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <p className="text-xs text-muted-foreground">
              Q_drain = 3.48 × (d/1000)² × √(H/1000) × 3600 × 0.94
              — added to design inbreathing if larger than normal venting.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow
                label="Drain Line Size"
                htmlFor="drainLineSize"
                unit="mm"
                error={errors.drainLineSize?.message}
              >
                <Input
                  id="drainLineSize"
                  type="number"
                  step="any"
                  placeholder="e.g. 100"
                  {...register("drainLineSize", { valueAsNumber: true })}
                />
              </FieldRow>
              <FieldRow
                label="Max Height Above Drain"
                htmlFor="maxHeightAboveDrain"
                unit="mm"
                error={errors.maxHeightAboveDrain?.message}
              >
                <Input
                  id="maxHeightAboveDrain"
                  type="number"
                  step="any"
                  placeholder="e.g. 5000"
                  {...register("maxHeightAboveDrain", { valueAsNumber: true })}
                />
              </FieldRow>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
