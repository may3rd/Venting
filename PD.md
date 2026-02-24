# Product Description: Atmospheric & Low Pressure Tank Venting Calculator

> **Replaces:** `Book1_1.xlsx` — "Atmospheric and Low Pressure Storage Tank Venting Calculation" (GCME Co., Ltd.)
> **Standard:** API 2000 (5th, 6th, and 7th Editions)
> **Framework:** Next.js (App Router) + REST API

---

## 1. Overview

A full-stack web application that replicates and replaces the Excel-based tank venting calculation sheet used by process engineers. Users enter tank geometry, fluid properties, and stream flowrates to instantly compute:

- **Normal venting** requirements (outbreathing & inbreathing)
- **Emergency venting** requirements (fire exposure)
- **Drain system** inbreathing

All calculations strictly follow **API 2000** (user selects edition: 5th, 6th, or 7th). Results are rendered live in the browser and can be exported as a formatted PDF calculation report.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| API | Next.js Route Handlers (`/api/**`) — REST |
| Styling | Tailwind CSS + shadcn/ui |
| Validation | Zod (shared between client & API) |
| State | React Hook Form + Zustand |
| PDF Export | `@react-pdf/renderer` |
| Testing | Vitest + React Testing Library |
| Deployment | Vercel |

---

## 3. Application Pages / Routes

```
/                          → Landing / redirect to /calculator
/calculator                → Main single-page calculator UI
/calculator/results        → Results summary (shareable URL with query params)
/api/vent/calculate        → POST — main calculation endpoint
/api/vent/lookup/ffactor   → GET  — F-factor lookup table
/api/vent/lookup/yfactor   → GET  — Y-factor lookup table
/api/vent/lookup/cfactor   → GET  — C-factor lookup table
```

---

## 4. Input Specification (Section I of the Sheet)

### 4.1 Tank Identification

| Field | Type | Unit | Notes |
|---|---|---|---|
| `tankNumber` | string | — | Tag / equipment number |
| `description` | string | — | Free text |

### 4.2 Tank Detail

| Field | Type | Unit | Validation |
|---|---|---|---|
| `diameter` | number | mm | > 0 |
| `height` | number | mm (TL-TL) | > 0 |
| `latitude` | number | ° | 0 < lat ≤ 90 (equatorial assumption: 42° threshold) |
| `designPressure` | number | kPag | > 0 |
| `tankConfiguration` | enum | — | See §4.5 |
| `insulationThickness` | number | mm | Required if config = insulated |
| `insulationConductivity` | number | W/m·K | Required if config = insulated (or select material from list) |
| `insideHeatTransferCoeff` | number | W/m²·K | Required if config = insulated |

### 4.3 Fluid Properties

| Field | Type | Unit | Notes |
|---|---|---|---|
| `avgStorageTemp` | number | °C | — |
| `vapourPressure` | number | kPa | — |
| `flashOrBoilingPoint` | number | °C | User selects FP or BP |
| `flashOrBoilingPointType` | enum | — | `"FP"` or `"BP"` |
| `latentHeat` | number | kJ/kg | Required for emergency vent; blank → use Hexane (334.9) |
| `relievingTemperature` | number | °C | Required for emergency vent; blank → use Hexane default (15.6) |
| `molecularMass` | number | — | Required for emergency vent; blank → use Hexane (86.17) |

> **Note:** If latent heat, relieving temp, and molecular mass are left blank, the calculator assumes **Hexane** as the reference liquid, per API 2000.

### 4.4 Stream Flowrates

Dynamic list of process streams. Users can add/remove rows.

**Incoming streams** (cause inbreathing):

| Field | Type | Unit |
|---|---|---|
| `streamNo` | string | — |
| `flowrate` | number | m³/h |

**Outgoing streams** (cause outbreathing):

| Field | Type | Unit |
|---|---|---|
| `streamNo` | string | — |
| `description` | string | — |
| `flowrate` | number | m³/h |

### 4.5 Tank Configuration Enum

```typescript
enum TankConfiguration {
  BARE_METAL           = "Bare Metal Tank (No Insulation)",
  INSULATED_FULL       = "Insulated tank - Fully Insulation",
  INSULATED_PARTIAL    = "Insulated tank - Partial Insulation",
  CONCRETE             = "Concrete tank or Fire proofing",
  WATER_APPLICATION    = "Water-application facilities",
  DEPRESSURING         = "Depressuring and Emptying facilities",
  UNDERGROUND          = "Underground Storage",
  EARTH_COVERED        = "Earth-covered storage above grade",
  IMPOUNDMENT_AWAY     = "Impoundment away from tank",
  IMPOUNDMENT          = "Impoundment",
}
```

### 4.6 Drain System (Optional)

| Field | Type | Unit |
|---|---|---|
| `drainLineSize` | number | mm |
| `maxHeightAboveDrain` | number | mm |

### 4.7 API Standard Selection

| Field | Type | Options |
|---|---|---|
| `apiEdition` | enum | `"5TH"`, `"6TH"`, `"7TH"` |

---

## 5. Derived Geometry (Auto-Computed, Not User Input)

These are computed immediately from tank inputs and displayed as read-only "derived values" in the UI before the user submits.

| Parameter | Formula | Unit |
|---|---|---|
| Max Tank Volume | `π × (D/2)² × H / 10⁹` | m³ |
| Shell + Roof Surface Area | `2π × (D/2) × H / 10⁶` | m² |
| Wetted Area (Emergency) | `min(surface_area, π × D × 9144 / 10⁶)` | m² |
| Cone Roof Slant Height | `√(r² + h_roof²)` | m |
| Cone Roof Area | `π × r × slant_height` | m² |
| Total Surface Area (shell+roof) | `shell_area + cone_roof_area` | m² |

For **Insulated Partial** configuration, two surface areas are tracked:
- `A_TTS` — total tank surface area (shell + cone roof), m²
- `A_inp` — user-specified insulated portion of that surface, m²

#### Reduction Factor for Fully Insulated Tank, R_in

> Applies to: **Insulated tank – Fully Insulation** (API 2000 6th & 7th Ed.)

```
R_in = 1 / (1 + (U_i × t) / k)
```

Where:
| Symbol | Description | Unit |
|---|---|---|
| `U_i` | Inside heat transfer coefficient | W/m²·K |
| `t` | Insulation thickness | m (converted from mm input) |
| `k` | Insulation thermal conductivity | W/m·K |

#### Reduction Factor for Partially Insulated Tank, R_inp

> Applies to: **Insulated tank – Partial Insulation** (API 2000 6th & 7th Ed., Eq. 12)

```
R_inp = (A_inp / A_TTS) × R_in  +  (1 − A_inp / A_TTS)
```

Which simplifies to:

```
R_inp = 1 − (A_inp / A_TTS) × (1 − R_in)
```

Where:
| Symbol | Description | Unit |
|---|---|---|
| `A_TTS` | Total tank surface area (shell + roof) | m² |
| `A_inp` | Insulated surface area of the tank | m² |
| `R_in` | Reduction factor for a fully insulated tank (formula above) | dimensionless |

**Boundary conditions:**
- If `A_inp = 0` → `R_inp = 1` (bare metal, no insulation effect)
- If `A_inp = A_TTS` → `R_inp = R_in` (fully insulated, collapses to R_in)
- `0 < A_inp < A_TTS` → partial insulation, 0 < R_inp < 1

**TypeScript implementation:**

```typescript
function calcR_in(U_i: number, t_mm: number, k: number): number {
  const t = t_mm / 1000  // convert mm → m
  return 1 / (1 + (U_i * t) / k)
}

function calcR_inp(A_TTS: number, A_inp: number, R_in: number): number {
  if (A_TTS === 0) throw new Error("A_TTS cannot be zero")
  const ratio = A_inp / A_TTS
  return ratio * R_in + (1 - ratio)
}
```

> **Note:** The R factor is used as a multiplier on the thermal venting rate: `Thermal_Vent = Y_or_C_factor × Tank_Capacity_Factor × R_inp`

---

## 6. Calculation Engine (Section II)

### 6.1 Normal Venting — Outbreathing

**A. Process Outbreathing (liquid inflow displaces vapor):**
```
Q_out_process = Σ (outgoing stream flowrates) [m³/h]
```
Convert to Nm³/h using standard conditions.

**B. Thermal Outbreathing:**

Uses **Y-Factor** from API 2000 lookup table:

| Latitude Range | Y-Factor |
|---|---|
| 0° < lat ≤ 42° | Low Y (e.g., 0.32 for <25m³ capacity) |
| 42° < lat ≤ 58° | Medium Y |
| 58° < lat ≤ 90° | High Y |

Y-Factor is interpolated from lookup table keyed on **tank capacity (m³)** (Table 1 of API 2000, 7th Ed.):

```
Thermal_Out = Y × Capacity_Factor × Reduction_Factor [Nm³/h]
```

Where `Reduction_Factor`:
- Bare metal / water app / depressuring: **1.0**
- Fully insulated: **R_in** = `1 / (1 + (U_i × t) / k)` — see §5 for symbol definitions
- Partially insulated: **R_inp** = `(A_inp / A_TTS) × R_in + (1 − A_inp / A_TTS)` — API 2000 6th & 7th Ed., Eq. 12 (see §5)

**Flash Point / Boiling Point selection:**
- FP ≥ 37.8°C or BP ≥ 149°C → use lower Y-factor column
- FP < 37.8°C or BP < 149°C → use higher Y-factor column

**C. Total Normal Outbreathing:**
```
Q_out_total = max(Q_out_process, Thermal_Out)  [API 5th]
Q_out_total = Q_out_process + Thermal_Out       [API 6th/7th]
```
*(Exact formula depends on selected API edition.)*

---

### 6.2 Normal Venting — Inbreathing

**A. Process Inbreathing (liquid outflow draws in air):**
```
Q_in_process = Σ (incoming stream flowrates) [m³/h → Nm³/h]
```

**B. Thermal Inbreathing:**

Uses **C-Factor** from API 2000 lookup table keyed on tank capacity and latitude:

```
Thermal_In = C × Capacity_Factor × Reduction_Factor [Nm³/h]
```

**C. Total Normal Inbreathing:**
```
Q_in_total = max(Q_in_process, Thermal_In)  or  Q_in_process + Thermal_In
```

---

### 6.3 Emergency Venting (Fire Exposure)

**Step 1 — Heat Input Q:**

Based on wetted surface area (ATWS) and design pressure, select coefficients `a` and `n`:

| ATWS (m²) | Design Pressure | a | n |
|---|---|---|---|
| < 18.6 | ≤ 103.4 kPag | 63,150 | 1 |
| 18.6–93 | ≤ 103.4 kPag | 224,200 | 0.566 |
| 93–260 | ≤ 103.4 kPag | 630,400 | 0.338 |
| ≥ 260 | > 7 kPag | 43,200 | 0.82 |
| ≥ 260 | ≤ 7 kPag | 4,129,700 | 0 |

```
Q = a × ATWS^n   [W]
```

**Step 2 — Environmental Factor F:**

Looked up from tank configuration:

| Tank Configuration | F |
|---|---|
| Bare metal / water application / depressuring | 1.0 |
| Insulated (fully) | Varies by insulation conductance & thickness |
| Concrete / fire proofing | See table |
| Underground | 0 |
| Earth-covered above grade | 0.03 |
| Impoundment | 0.5 |
| Impoundment away from tank | 0.3 |

For insulated tanks, F is calculated:
```
F = U × t_insulation / k_insulation   (effective U-value approach)
```
Interpolated from F-factor table based on insulation conductance (W/m²·K) vs thickness (mm).

**Step 3 — Emergency Vent Rate:**

```
V_emergency = (906.6 × Q × F) / (1000 × L) × √((T_r + 273.15) / M)   [Nm³/h of air]
```

Where:
- `Q` = heat input [W]
- `F` = environmental factor [dimensionless]
- `L` = latent heat [kJ/kg], default Hexane = 334.9
- `T_r` = relieving temperature [°C], default = 15.6
- `M` = molecular mass, default Hexane = 86.17

---

### 6.4 Drain System Inbreathing

```
Q_drain = 3.48 × (d/1000)² × √(H_drain/1000) × 3600 × 0.94   [Nm³/h]
```

Where:
- `d` = drain line size [mm]
- `H_drain` = max height above drain line [mm]

---

## 7. Lookup Tables (Static Data, Embedded in API)

All tables are from API 2000 and stored as TypeScript constant arrays in the codebase.

### 7.1 Y-Factor Table (Thermal Outbreathing)
Keyed by: `capacity (m³)` and `latitude band (°)` and `fluid class (FP/BP threshold)`

Capacity breakpoints (m³): 10, 15, 16, 20, 100, 200, 300, 500, 700, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 10000 (max)

### 7.2 C-Factor Table (Thermal Inbreathing)
Same keying as Y-Factor table.

### 7.3 Normal Venting Table
For API 5th/6th editions — tabulated Nm³/h by tank capacity.

### 7.4 F-Factor (Environmental Factor) Table
Keyed by insulation conductance (W/m²·K): 1.9, 2.3, 2.8, 3.8, 5.7, 11.4, 22.7
Vs insulation thickness (mm): 305, 254, 203, 152, 102, 51, 25

### 7.5 Insulation Material Conductivity Reference
| Material | k (W/m·K) |
|---|---|
| Cellular Glass | 0.05 |
| Mineral Fiber | 0.04 |
| Calcium Silicate | 0.06 |
| Perlite | 0.07 |

### 7.6 Emergency Venting Table (API 5th/6th)
Tabulated relief rates by wetted area and design pressure (see §6.3 formula for 7th Ed.).

---

## 8. REST API Specification

### `POST /api/vent/calculate`

**Request Body** (JSON, validated by Zod):

```typescript
{
  // Identification
  tankNumber: string
  description?: string

  // Tank geometry
  diameter: number         // mm
  height: number           // mm
  latitude: number         // degrees
  designPressure: number   // kPag

  // Configuration
  tankConfiguration: TankConfiguration
  insulationThickness?: number        // mm
  insulationConductivity?: number     // W/m·K
  insideHeatTransferCoeff?: number    // W/m²·K

  // Fluid
  avgStorageTemp: number              // °C
  vapourPressure: number              // kPa
  flashBoilingPointType: "FP" | "BP"
  flashBoilingPoint?: number          // °C
  latentHeat?: number                 // kJ/kg (default: 334.9)
  relievingTemperature?: number       // °C (default: 15.6)
  molecularMass?: number              // (default: 86.17)

  // Streams
  incomingStreams: { streamNo: string; flowrate: number }[]
  outgoingStreams: { streamNo: string; description?: string; flowrate: number }[]

  // Drain
  drainLineSize?: number              // mm
  maxHeightAboveDrain?: number        // mm

  // Settings
  apiEdition: "5TH" | "6TH" | "7TH"
}
```

**Response Body** (200 OK):

```typescript
{
  // Derived geometry
  derived: {
    maxTankVolume: number         // m³
    surfaceArea: number           // m²
    wettedArea: number            // m²
    totalSurfaceArea: number      // m²
    coneRoofArea?: number         // m²
  }

  // Normal venting
  normalVenting: {
    outbreathing: {
      processFlowrate: number          // Nm³/h
      yFactor: number
      reductionFactor: number
      thermalOutbreathing: number      // Nm³/h
      total: number                    // Nm³/h
    }
    inbreathing: {
      processFlowrate: number          // Nm³/h
      cFactor: number
      reductionFactor: number
      thermalInbreathing: number       // Nm³/h
      total: number                    // Nm³/h
    }
  }

  // Emergency venting
  emergencyVenting: {
    heatInput: number                  // W
    environmentalFactor: number        // F
    emergencyVentRequired: number      // Nm³/h of air
    coefficients: { a: number; n: number }
    referenceFluid: "Hexane" | "User-defined"
  }

  // Drain
  drainInbreathing?: number            // Nm³/h

  // Summary
  summary: {
    designOutbreathing: number         // Nm³/h — governs outbreathing device
    designInbreathing: number          // Nm³/h — governs inbreathing device
    emergencyVenting: number           // Nm³/h
  }

  // Metadata
  apiEdition: string
  calculatedAt: string                 // ISO timestamp
}
```

**Error Response** (400):
```typescript
{
  error: string
  details: ZodError["issues"]
}
```

---

### `GET /api/vent/lookup/ffactor?config=<TankConfiguration>&conductance=<number>&thickness=<number>`

Returns computed F-factor value.

### `GET /api/vent/lookup/yfactor?capacity=<number>&latitude=<number>&fluidClass=<"high"|"low">`

Returns interpolated Y-factor value.

### `GET /api/vent/lookup/cfactor?capacity=<number>&latitude=<number>`

Returns interpolated C-factor value.

---

## 9. UI Component Structure

```
/app
  /calculator
    page.tsx                     ← Main calculator page
    /components
      InputPanel.tsx             ← All input sections (left column)
      ResultsPanel.tsx           ← Live results display (right column)
      TankSchematic.tsx          ← SVG visual of tank with annotations
      StreamTable.tsx            ← Dynamic add/remove stream rows
      ConfigSelector.tsx         ← Tank configuration dropdown with visual
      DerivedGeometry.tsx        ← Auto-computed geometry read-only display
      ExportButton.tsx           ← Trigger PDF export
    /sections
      TankDetailSection.tsx
      FluidPropertiesSection.tsx
      StreamFlowSection.tsx
      DrainSystemSection.tsx
      ApiEditionSelector.tsx
    /results
      NormalVentingResult.tsx
      EmergencyVentingResult.tsx
      SummaryResult.tsx
```

---

## 10. UI/UX Behavior

1. **Two-column layout**: Inputs on the left, live results on the right.
2. **Live calculation**: Results update on every valid input change (debounced 300ms, calls POST /api/vent/calculate).
3. **Contextual field visibility**: 
   - Insulation fields appear only when config = Insulated.
   - Drain fields are optional; collapsed by default.
   - Fluid defaults shown as placeholder text when blank (e.g., "Default: Hexane 334.9 kJ/kg").
4. **Validation feedback**: Inline Zod errors per field. API edition selector warns if inputs are insufficient for chosen edition.
5. **Result highlighting**: Governing design values (max of process + thermal) are highlighted in bold.
6. **Tank Schematic**: Simple SVG showing tank dimensions (D, H), wetted area annotation.

---

## 11. PDF Export

Generated PDF report includes:
- Project header: Tank No., Description, Date, Standard
- Section I: All user inputs in tabular form with units
- Section II: Calculations with intermediate values (Y-factor, C-factor, heat input Q, F-factor)
- Summary table: Design outbreathing, inbreathing, emergency vent
- Reference: "Calculated per API 2000 [Edition]"

---

## 12. Interpolation Logic

For all lookup tables that require interpolation between data points:

```typescript
function interpolate(
  x: number,
  table: [number, number][],  // [x, y] sorted pairs
): number {
  const lower = table.findLast(([xi]) => xi <= x)!
  const upper = table.find(([xi]) => xi > x)
  if (!upper) return lower[1]
  const [x0, y0] = lower
  const [x1, y1] = upper
  return y0 + ((y1 - y0) / (x1 - x0)) * (x - x0)
}
```

This matches the Excel `VLOOKUP(..., TRUE)` + manual interpolation behavior in the sheet.

---

## 13. Edge Cases & Validation Rules

| Case | Handling |
|---|---|
| Design pressure > 103.4 kPag | Return error: "Design Pressure over 103.4 kPag — calculation not applicable" |
| Tank capacity > 30,000 m³ | Warn: "Area exceeds table range — consult API 2000 directly" |
| Latitude > 90° or ≤ 0° | Validation error |
| Latitude 0–42° | Use "below 42°" Y/C factor band |
| Latitude 42–58° | Use "between 42° and 58°" band |
| Latitude 58–90° | Use "above 58°" band |
| Latitude outside 0–90 | "Latitude Error" |
| Blank latent heat / MW / temp | Default to Hexane values, flag in response |
| Flash point vs Boiling point | User selects type; FP ≥ 37.8 OR BP ≥ 149 → low-volatility path |
| Underground tank (F = 0) | Emergency vent = 0, show info message |

---

## 14. File Structure

```
tank-vent-calculator/
├── app/
│   ├── api/
│   │   └── vent/
│   │       ├── calculate/route.ts
│   │       └── lookup/
│   │           ├── ffactor/route.ts
│   │           ├── yfactor/route.ts
│   │           └── cfactor/route.ts
│   ├── calculator/
│   │   ├── page.tsx
│   │   └── components/
│   └── layout.tsx
├── lib/
│   ├── calculations/
│   │   ├── geometry.ts           ← Tank geometry formulas
│   │   ├── normalVenting.ts      ← Outbreathing / inbreathing
│   │   ├── emergencyVenting.ts   ← Fire exposure Q, F, result
│   │   └── drain.ts              ← Drain inbreathing
│   ├── lookups/
│   │   ├── yFactor.ts            ← Y-factor table data + interpolation
│   │   ├── cFactor.ts            ← C-factor table data + interpolation
│   │   ├── fFactor.ts            ← F-factor table data + interpolation
│   │   └── normalVentTable.ts    ← API 5th/6th tabulated values
│   └── validation/
│       └── inputSchema.ts        ← Shared Zod schema
├── types/
│   └── index.ts
├── __tests__/
│   ├── geometry.test.ts
│   ├── normalVenting.test.ts
│   ├── emergencyVenting.test.ts
│   └── api.test.ts
├── PD.md                         ← This file
└── package.json
```

---

## 15. Test Cases (from Excel)

Use the following reference case (from the spreadsheet sample inputs) to validate calculations:

| Parameter | Value |
|---|---|
| Tank Diameter | 24,000 mm |
| Tank Height (TL-TL) | 17,500 mm |
| Latitude | 12.7° |
| Design Pressure | 101.32 kPag |
| Configuration | Insulated tank - Partial Insulation |
| Avg Storage Temp | 35°C |
| Vapour Pressure | 5.6 kPa |
| API Edition | 7th |
| Outgoing Flowrate Total | 368.9 m³/h |

**Expected intermediate results:**
- Max Tank Volume: 7,916.8 m³
- Surface Area: 1,319.5 m²
- Wetted Area (emergency): 689.4 m²
- Emergency Heat Input Q: ~5,741,539 W
- Environmental Factor F: 1.0 (bare metal baseline)
- Emergency Vent Required: ~28,452 Nm³/h

---

## 16. Out of Scope (v1.0)

- Multi-tank comparison
- User accounts / saved calculations
- Integration with AVEVA / PDS / Smart P&ID
- Nozzle sizing (separate calculation)
- Pressure-vacuum valve sizing
- Tank breathing losses (evaporation loss per API 2000 Annex B)
