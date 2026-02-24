"use client"

import { TankDetailSection } from "../sections/TankDetailSection"
import { FluidPropertiesSection } from "../sections/FluidPropertiesSection"
import { StreamFlowSection } from "../sections/StreamFlowSection"
import { DrainSystemSection } from "../sections/DrainSystemSection"
import { ApiEditionSelector } from "../sections/ApiEditionSelector"
import { DerivedGeometry } from "./DerivedGeometry"
import { SectionCard } from "./SectionCard"

export function InputPanel() {
  return (
    <div className="space-y-4">
      <TankDetailSection />
      <DerivedGeometry />
      <FluidPropertiesSection />
      <StreamFlowSection />
      <DrainSystemSection />
      <SectionCard title="Calculation Standard">
        <ApiEditionSelector />
      </SectionCard>
    </div>
  )
}
