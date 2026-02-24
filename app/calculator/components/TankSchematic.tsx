"use client"

import { useCalculatorStore } from "@/lib/store/calculatorStore"
import { useFormContext } from "react-hook-form"
import type { CalculationInput } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

// ─── SVG Tank Schematic ────────────────────────────────────────────────────────
// Draws a simplified cylindrical tank cross-section with:
//   - Tank shell (rectangle)
//   - Cone roof (triangle)
//   - Wetted area shading (blue fill up to the 9144mm cap or full height)
//   - D and H dimension annotations

interface SchematicSVGProps {
  diameterMm: number
  heightMm: number
  wettedAreaM2: number
  shellAreaM2: number
}

function SchematicSVG({ diameterMm, heightMm, wettedAreaM2, shellAreaM2 }: SchematicSVGProps) {
  // ── Layout constants ────────────────────────────────────────────────────────
  const SVG_W = 260
  const SVG_H = 220
  const MARGIN_L = 40  // left margin for H label
  const MARGIN_R = 20
  const MARGIN_T = 24  // top margin for cone + D label
  const MARGIN_B = 20  // bottom margin

  const tankW = SVG_W - MARGIN_L - MARGIN_R
  const tankH = SVG_H - MARGIN_T - MARGIN_B - 20 // reserve 20px for cone

  // ── Cone dimensions (1:12 slope) ────────────────────────────────────────────
  const coneH = Math.max(8, tankW / 24) // proportional to tank width

  // ── Wetted height ratio ──────────────────────────────────────────────────────
  // wettedArea = π × D × wettedH — solve for wettedH
  const fullShellAreaM2 = shellAreaM2
  const wettedRatio = Math.min(wettedAreaM2 / fullShellAreaM2, 1)
  const wettedPx = tankH * wettedRatio

  // ── Coordinates ─────────────────────────────────────────────────────────────
  const tankLeft  = MARGIN_L
  const tankRight = MARGIN_L + tankW
  const tankTop   = MARGIN_T + coneH
  const tankBot   = tankTop + tankH
  const coneApex  = { x: MARGIN_L + tankW / 2, y: MARGIN_T }

  // Wetted fill (from bottom up)
  const wettedTop = tankBot - wettedPx

  const dmStr = (diameterMm / 1000).toFixed(2)
  const hmStr = (heightMm / 1000).toFixed(2)

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full max-w-[300px] mx-auto"
      aria-label="Tank schematic showing diameter, height, and wetted area"
    >
      {/* Wetted area fill */}
      <rect
        x={tankLeft + 1}
        y={Math.max(wettedTop, tankTop + 1)}
        width={tankW - 2}
        height={Math.min(wettedPx, tankH - 2)}
        fill="hsl(210 80% 70% / 0.25)"
        stroke="none"
      />

      {/* Tank shell rectangle */}
      <rect
        x={tankLeft}
        y={tankTop}
        width={tankW}
        height={tankH}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-foreground"
      />

      {/* Cone roof */}
      <polygon
        points={`${tankLeft},${tankTop} ${coneApex.x},${coneApex.y} ${tankRight},${tankTop}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-foreground"
      />

      {/* Wetted level line */}
      {wettedRatio < 1 && wettedRatio > 0.01 && (
        <>
          <line
            x1={tankLeft}
            y1={wettedTop}
            x2={tankRight}
            y2={wettedTop}
            stroke="hsl(210 80% 50%)"
            strokeWidth={1}
            strokeDasharray="3 2"
          />
          <text
            x={tankRight + 3}
            y={wettedTop + 4}
            fontSize={7}
            fill="hsl(210 80% 50%)"
            className="font-mono"
          >
            ATWS
          </text>
        </>
      )}

      {/* D (diameter) annotation — horizontal, below tank top */}
      <line
        x1={tankLeft}
        y1={tankBot + 10}
        x2={tankRight}
        y2={tankBot + 10}
        stroke="currentColor"
        strokeWidth={0.8}
        className="text-muted-foreground"
        markerStart="url(#arr)"
        markerEnd="url(#arr)"
      />
      <text
        x={tankLeft + tankW / 2}
        y={tankBot + 18}
        textAnchor="middle"
        fontSize={8}
        className="text-muted-foreground fill-current"
        fill="currentColor"
      >
        D = {dmStr} m
      </text>

      {/* H (height) annotation — vertical, left side */}
      <line
        x1={tankLeft - 12}
        y1={tankTop}
        x2={tankLeft - 12}
        y2={tankBot}
        stroke="currentColor"
        strokeWidth={0.8}
        className="text-muted-foreground"
      />
      <text
        x={tankLeft - 18}
        y={(tankTop + tankBot) / 2}
        textAnchor="middle"
        fontSize={8}
        className="text-muted-foreground fill-current"
        fill="currentColor"
        transform={`rotate(-90, ${tankLeft - 18}, ${(tankTop + tankBot) / 2})`}
      >
        H = {hmStr} m
      </text>

      {/* Tick marks for D annotation */}
      {[tankLeft, tankRight].map((x, i) => (
        <line
          key={i}
          x1={x}
          y1={tankBot + 6}
          x2={x}
          y2={tankBot + 14}
          stroke="currentColor"
          strokeWidth={0.8}
          className="text-muted-foreground"
        />
      ))}
      {/* Tick marks for H annotation */}
      {[tankTop, tankBot].map((y, i) => (
        <line
          key={i}
          x1={tankLeft - 16}
          y1={y}
          x2={tankLeft - 8}
          y2={y}
          stroke="currentColor"
          strokeWidth={0.8}
          className="text-muted-foreground"
        />
      ))}

      {/* Legend */}
      <rect x={tankLeft} y={MARGIN_T - 14} width={9} height={9}
        fill="hsl(210 80% 70% / 0.25)" stroke="hsl(210 80% 50%)" strokeWidth={0.7} />
      <text x={tankLeft + 12} y={MARGIN_T - 6} fontSize={7} fill="currentColor">
        Wetted area
      </text>
    </svg>
  )
}

// ─── Card wrapper ──────────────────────────────────────────────────────────────

export function TankSchematic() {
  const derivedGeometry = useCalculatorStore((s) => s.derivedGeometry)
  const { watch } = useFormContext<CalculationInput>()
  const diameter = watch("diameter")
  const height   = watch("height")

  if (!derivedGeometry || !diameter || !height) return null

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Tank Schematic</CardTitle>
        <Separator />
      </CardHeader>
      <CardContent className="pt-2">
        <SchematicSVG
          diameterMm={diameter}
          heightMm={height}
          wettedAreaM2={derivedGeometry.wettedArea}
          shellAreaM2={derivedGeometry.shellSurfaceArea}
        />
      </CardContent>
    </Card>
  )
}
