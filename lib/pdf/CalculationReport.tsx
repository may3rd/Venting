/**
 * CalculationReport — React-PDF document for the venting calculation report.
 *
 * Sections:
 *   Header  — Tank No., description, standard, date
 *   Section I  — Input parameters
 *   Section II — Calculation intermediates
 *   Summary   — Design flowrates table
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import type { CalculationInput, CalculationResult } from "@/types"

// ─── Styles ───────────────────────────────────────────────────────────────────

const BLUE   = "#1d4ed8"
const GRAY_L = "#f3f4f6"
const GRAY_B = "#9ca3af"
const BLACK  = "#111827"

const s = StyleSheet.create({
  page: {
    fontFamily:  "Helvetica",
    fontSize:    9,
    color:       BLACK,
    paddingTop:  36,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },
  // Header
  headerBox: {
    borderBottom: `2pt solid ${BLUE}`,
    marginBottom: 12,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: BLUE },
  headerSub:   { fontSize: 8, color: GRAY_B, marginTop: 2 },
  headerRight: { fontSize: 8, color: GRAY_B, textAlign: "right" },
  // Section headings
  sectionTitle: {
    fontSize:    10,
    fontFamily:  "Helvetica-Bold",
    color:       BLUE,
    marginTop:   14,
    marginBottom: 5,
    borderBottom: `0.5pt solid ${BLUE}`,
    paddingBottom: 2,
  },
  // Key-value rows
  kvRow: {
    flexDirection:   "row",
    borderBottom:    `0.3pt solid ${GRAY_L}`,
    paddingVertical: 2.5,
  },
  kvLabel:  { width: "55%", color: GRAY_B },
  kvValue:  { width: "30%", textAlign: "right" },
  kvUnit:   { width: "15%", color: GRAY_B, paddingLeft: 4 },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BLUE,
    paddingVertical: 3,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  tableHeaderCell: { color: "#fff", fontFamily: "Helvetica-Bold" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottom: `0.3pt solid ${GRAY_L}`,
  },
  tableRowAlt: { backgroundColor: GRAY_L },
  tableCell: {},
  // Warning
  warning: {
    backgroundColor: "#fef9c3",
    borderLeft: `3pt solid #eab308`,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 6,
    fontSize: 8,
    color: "#713f12",
  },
  // Summary banner
  summaryBox: {
    flexDirection: "row",
    backgroundColor: BLUE,
    borderRadius: 3,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    justifyContent: "space-around",
  },
  summaryItem: { alignItems: "center" },
  summaryLabel: { color: "#bfdbfe", fontSize: 7 },
  summaryValue: { color: "#fff", fontSize: 13, fontFamily: "Helvetica-Bold" },
  summaryUnit:  { color: "#bfdbfe", fontSize: 7, marginTop: 1 },
  // Footer
  footer: {
    position: "absolute",
    bottom: 18,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: GRAY_B,
    borderTop: `0.3pt solid ${GRAY_L}`,
    paddingTop: 4,
  },
})

// ─── Helper components ────────────────────────────────────────────────────────

function KV({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <View style={s.kvRow}>
      <Text style={s.kvLabel}>{label}</Text>
      <Text style={s.kvValue}>{typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : value}</Text>
      {unit && <Text style={s.kvUnit}>{unit}</Text>}
    </View>
  )
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={s.sectionTitle}>{children}</Text>
}

// ─── Document ─────────────────────────────────────────────────────────────────

interface ReportProps {
  input:  CalculationInput
  result: CalculationResult
}

export function CalculationReport({ input, result }: ReportProps) {
  const { derived, normalVenting, emergencyVenting, drainInbreathing, summary, warnings } = result
  const now = new Date(result.calculatedAt).toLocaleString()

  const incomingTotal  = input.incomingStreams.reduce((s, r) => s + r.flowrate, 0)
  const outgoingTotal  = input.outgoingStreams.reduce((s, r) => s + r.flowrate, 0)

  return (
    <Document
      title={`Venting Calc — ${input.tankNumber}`}
      author="Tank Venting Calculator"
      subject="API 2000 Venting Calculation Report"
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={s.headerBox}>
          <View>
            <Text style={s.headerTitle}>Tank Venting Calculation</Text>
            <Text style={s.headerSub}>
              API 2000 {result.apiEdition} Edition — Atmospheric & Low Pressure Storage Tanks
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.headerRight}>Tank No.: {input.tankNumber}</Text>
            {input.description && <Text style={s.headerRight}>{input.description}</Text>}
            <Text style={s.headerRight}>Date: {now}</Text>
          </View>
        </View>

        {/* ── Warnings ───────────────────────────────────────────────────── */}
        {warnings.capacityExceedsTable && (
          <View style={s.warning}>
            <Text>⚠  Tank capacity exceeds 30,000 m³ — outside normal vent table range.</Text>
          </View>
        )}
        {warnings.undergroundTank && (
          <View style={s.warning}>
            <Text>ℹ  Underground tank — environmental factor F = 0.</Text>
          </View>
        )}
        {warnings.hexaneDefaults && (
          <View style={s.warning}>
            <Text>ℹ  Hexane defaults used for latent heat / relieving temperature / molecular mass.</Text>
          </View>
        )}

        {/* ── Section I: Inputs ──────────────────────────────────────────── */}
        <SectionTitle>Section I — Input Parameters</SectionTitle>

        <KV label="Tank Number"            value={input.tankNumber} />
        {input.description && <KV label="Description" value={input.description} />}
        <KV label="API Edition"            value={result.apiEdition} />
        <KV label="Tank Diameter (D)"      value={input.diameter}       unit="mm" />
        <KV label="Tank Height (H, TL-TL)" value={input.height}         unit="mm" />
        <KV label="Site Latitude"          value={input.latitude}       unit="°" />
        <KV label="Design Pressure"        value={input.designPressure} unit="kPag" />
        <KV label="Tank Configuration"     value={input.tankConfiguration} />

        {(input.insulationThickness || input.insulationConductivity) && (
          <>
            {input.insulationThickness   && <KV label="Insulation Thickness"     value={input.insulationThickness}   unit="mm" />}
            {input.insulationConductivity && <KV label="Insulation Conductivity"  value={input.insulationConductivity} unit="W/m·K" />}
            {input.insideHeatTransferCoeff && <KV label="Inside HTC (U_i)"        value={input.insideHeatTransferCoeff} unit="W/m²·K" />}
            {input.insulatedSurfaceArea   && <KV label="Insulated Surface Area"   value={input.insulatedSurfaceArea}   unit="m²" />}
          </>
        )}

        <KV label="Average Storage Temperature" value={input.avgStorageTemp}    unit="°C" />
        <KV label="Vapour Pressure"             value={input.vapourPressure}    unit="kPa" />
        <KV label={`${input.flashBoilingPointType === "FP" ? "Flash Point" : "Boiling Point"}`}
            value={input.flashBoilingPoint ?? "—"} unit="°C" />
        <KV label="Latent Heat (L)"             value={input.latentHeat         ?? `${334.9} (Hexane default)`} unit="kJ/kg" />
        <KV label="Relieving Temperature (T_r)" value={input.relievingTemperature ?? `${15.6} (Hexane default)`}  unit="°C" />
        <KV label="Molecular Mass (M)"          value={input.molecularMass      ?? `${86.17} (Hexane default)`} unit="g/mol" />
        <KV label="Total Incoming Streams"      value={incomingTotal.toFixed(3)} unit="m³/h" />
        <KV label="Total Outgoing Streams"      value={outgoingTotal.toFixed(3)} unit="m³/h" />
        {input.drainLineSize        && <KV label="Drain Line Size"          value={input.drainLineSize}        unit="mm" />}
        {input.maxHeightAboveDrain  && <KV label="Max Height Above Drain"   value={input.maxHeightAboveDrain}  unit="mm" />}

        {/* ── Section II: Calculations ────────────────────────────────────── */}
        <SectionTitle>Section II — Calculation Results</SectionTitle>

        <KV label="Max Tank Volume (V)"       value={derived.maxTankVolume.toFixed(2)}       unit="m³" />
        <KV label="Shell Surface Area"        value={derived.shellSurfaceArea.toFixed(2)}    unit="m²" />
        <KV label="Cone Roof Area"            value={derived.coneRoofArea.toFixed(2)}        unit="m²" />
        <KV label="Total Surface Area"        value={derived.totalSurfaceArea.toFixed(2)}    unit="m²" />
        <KV label="Wetted Area (ATWS)"        value={derived.wettedArea.toFixed(2)}          unit="m²" />
        <KV label="Reduction Factor (R)"      value={derived.reductionFactor.toFixed(6)}     />

        {/* Normal venting */}
        <Text style={{ marginTop: 8, marginBottom: 3, fontFamily: "Helvetica-Bold", fontSize: 9 }}>
          Normal Venting
        </Text>
        <KV label="Process Outbreathing"      value={normalVenting.outbreathing.processFlowrate.toFixed(2)} unit="Nm³/h" />
        <KV label="Thermal Outbreathing"      value={normalVenting.outbreathing.thermalOutbreathing.toFixed(2)} unit="Nm³/h" />
        {(result.apiEdition === "6TH" || result.apiEdition === "7TH") && (
          <KV label="  Y-factor"              value={normalVenting.outbreathing.yFactor} />
        )}
        <KV label="Total Outbreathing"        value={normalVenting.outbreathing.total.toFixed(2)} unit="Nm³/h" />
        <KV label="Process Inbreathing"       value={normalVenting.inbreathing.processFlowrate.toFixed(2)} unit="Nm³/h" />
        <KV label="Thermal Inbreathing"       value={normalVenting.inbreathing.thermalInbreathing.toFixed(2)} unit="Nm³/h" />
        {(result.apiEdition === "6TH" || result.apiEdition === "7TH") && (
          <KV label="  C-factor"              value={normalVenting.inbreathing.cFactor} />
        )}
        <KV label="Total Inbreathing"         value={normalVenting.inbreathing.total.toFixed(2)} unit="Nm³/h" />
        {drainInbreathing !== undefined && (
          <KV label="Drain System Inbreathing" value={drainInbreathing.toFixed(2)} unit="Nm³/h" />
        )}

        {/* Emergency venting */}
        <Text style={{ marginTop: 8, marginBottom: 3, fontFamily: "Helvetica-Bold", fontSize: 9 }}>
          Emergency Venting (Fire Exposure)
        </Text>
        <KV label="Heat Input Coefficient (a)" value={emergencyVenting.coefficients.a.toLocaleString()} />
        <KV label="Heat Input Exponent (n)"    value={emergencyVenting.coefficients.n} />
        <KV label="Heat Input Q = a × ATWS^n"  value={emergencyVenting.heatInput.toFixed(0)} unit="W" />
        <KV label="Environmental Factor (F)"   value={emergencyVenting.environmentalFactor.toFixed(4)} />
        <KV label="Reference Fluid"            value={emergencyVenting.referenceFluid} />
        <KV label="Emergency Vent Required"    value={emergencyVenting.emergencyVentRequired.toFixed(2)} unit="Nm³/h" />

        {/* ── Summary Banner ──────────────────────────────────────────────── */}
        <View style={s.summaryBox}>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Design Outbreathing</Text>
            <Text style={s.summaryValue}>{summary.designOutbreathing.toFixed(1)}</Text>
            <Text style={s.summaryUnit}>Nm³/h</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Design Inbreathing</Text>
            <Text style={s.summaryValue}>{summary.designInbreathing.toFixed(1)}</Text>
            <Text style={s.summaryUnit}>Nm³/h</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Emergency Venting</Text>
            <Text style={s.summaryValue}>{summary.emergencyVenting.toFixed(1)}</Text>
            <Text style={s.summaryUnit}>Nm³/h</Text>
          </View>
        </View>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text>Tank Venting Calculator — API 2000</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
