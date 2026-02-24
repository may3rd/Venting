# Plan: Tank Venting Calculator Web App

## Context

GCME/PTTME engineers currently use an Excel spreadsheet (`Book1_1.xlsx`) for atmospheric and low-pressure tank venting calculations per API 2000. This project replaces that spreadsheet with a production-ready Next.js web application. The app computes normal venting (outbreathing/inbreathing), emergency venting (fire exposure), and drain system inbreathing. All lookup table data has been extracted from the Excel file.

**Working directory:** `/Volumes/Ginnungagap/maetee/Code/Venting`
**Current state:** Greenfield — only `PD.md` and `Book1 1.xlsx` exist.

---

## Phase 1: Project Scaffolding

Initialize Next.js 14 + TypeScript + Tailwind + shadcn/ui project.

**Actions:**
- `npx create-next-app@14 . --typescript --tailwind --app --eslint --src-dir=false`
- `npx shadcn@latest init` (New York style, neutral theme)
- Install deps: `zod`, `zustand`, `react-hook-form`, `@hookform/resolvers`, `@react-pdf/renderer`
- Install dev deps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- Add shadcn components: `button`, `input`, `label`, `select`, `card`, `separator`, `tabs`, `collapsible`, `badge`, `tooltip`
- Configure `vitest.config.ts` with jsdom + path aliases
- Set up root `app/layout.tsx`, redirect `/` → `/calculator`
- Create placeholder `app/calculator/page.tsx`

**Verify:** `npm run dev` works, `npm run build` passes, `npx vitest --run` passes (0 tests)

---

## Phase 2: Types, Constants, and Validation

Create the foundation layer everything else imports from.

### Files to create:

**`types/index.ts`** — `TankConfiguration` enum (10 values), `ApiEdition`, `FlashBoilingPointType`, `Stream`, `OutgoingStream`, `CalculationInput`, `DerivedGeometry`, `NormalVentingResult`, `EmergencyVentingResult`, `CalculationResult` interfaces (all per PD.md §8).

**`lib/constants.ts`** — Hexane defaults (L=334.9, T=15.6, M=86.17), thresholds (FP=37.8, BP=149, maxDP=103.4, wettedAreaCap=9144mm), heat input coefficient table (5 brackets from PD.md §6.3), environmental factor map by config, insulation materials list, cone roof slope (1:12 per Excel data: h=D/12).

**`lib/validation/inputSchema.ts`** — Shared Zod schema with `superRefine` for: insulation fields required when config is insulated, design pressure ≤ 103.4 kPag, latitude 0 < lat ≤ 90, drain fields both-or-neither.

**`__tests__/validation.test.ts`** — 10+ test cases covering valid/invalid inputs.

**Verify:** `npx vitest --run` all green.

---

## Phase 3: Lookup Tables + Interpolation

All data values extracted from `Book1 1.xlsx`:

### `lib/lookups/interpolate.ts`
Generic linear interpolation matching Excel VLOOKUP(..., TRUE) behavior. Clamp at boundaries.

### `lib/lookups/yFactor.ts`
Simple per-latitude Y-factor (no capacity dependence):

| Latitude | Y |
|---------|---|
| below 42° | 0.32 |
| 42°–58° | 0.25 |
| above 58° | 0.20 |

### `lib/lookups/cFactor.ts`
Per latitude × vapor pressure class × capacity threshold:

| Latitude | Hexane <25m³ | Hexane ≥25m³ | Other <25m³ | Other ≥25m³ |
|---------|-------------|-------------|-----------|-----------|
| below 42° | 4 | 6.5 | 6.5 | 6.5 |
| 42°–58° | 3 | 5 | 5 | 5 |
| above 58° | 2.5 | 4 | 4 | 4 |

### `lib/lookups/normalVentTable.ts`
22-row table keyed on capacity (m³) with 3 columns:

```
Cap(m³)  |  Inbreathing  |  Out(FP≥37.8/BP≥149)  |  Out(other)
10       |  1.69         |  1.01                  |  1.69
20       |  3.38         |  2.02                  |  3.38
100      |  16.9         |  10.1                  |  16.9
200      |  33.8         |  20.3                  |  33.8
300      |  50.4         |  30.4                  |  50.4
500      |  84.4         |  50.7                  |  84.5
700      |  118          |  71                    |  118
1000     |  169          |  101                   |  169
1500     |  254          |  152                   |  254
2000     |  338          |  203                   |  338
3000     |  507          |  304                   |  507
3180     |  537          |  322                   |  537
4000     |  647          |  388                   |  647
5000     |  787          |  472                   |  787
6000     |  896          |  538                   |  896
10000    |  1210         |  726                   |  1210
12000    |  1345         |  807                   |  1345
14000    |  1480         |  888                   |  1480
16000    |  1615         |  969                   |  1615
18000    |  1750         |  1047                  |  1750
25000    |  2179         |  1307                  |  2179
30000    |  2495         |  1497                  |  2495
```

### `lib/lookups/fFactor.ts`
1D table (conductance paired with thickness):

| Conductance (W/m²K) | Thickness (mm) | F |
|--------------------|--------------|-----|
| 22.7 | 25 | 0.3 |
| 11.4 | 51 | 0.15 |
| 5.7 | 102 | 0.075 |
| 3.8 | 152 | 0.05 |
| 2.8 | 203 | 0.0375 |
| 2.3 | 254 | 0.03 |
| 1.9 | 305 | 0.025 |

Plus fixed values: bare metal=1.0, underground=0, earth-covered=0.03, impoundment=0.5, impoundment away=0.3.

### `lib/lookups/emergencyVentTable.ts`
26-row table for API 5th/6th editions (wetted area ≤ 103.4 kPag):

```
Area(m²) | Vent(Nm³/h)
2        | 608
3        | 913
9        | 2738
11       | 3347
13       | 3955
15       | 4563
17       | 5172
19       | 5780
22       | 6217
25       | 6684
30       | 7411
35       | 8086
40       | 8721
45       | 9322
50       | 9895
60       | 10971
70       | 11971
80       | 12911
90       | 13801
110      | 15461
130      | 15751
150      | 16532
175      | 17416
200      | 18220
230      | 19102
260      | 19910
```
For >260m² with DP ≤ 7: capped at 19,910. For >260m² with DP > 7: use 7th Ed formula.

### Tests
- `__tests__/interpolation.test.ts` — exact match, between points, boundary clamping, reference case pro-rate (capacity 7916.8 → interpolated between 6000 and 10000)

**Verify:** All interpolation and lookup tests pass.

---

## Phase 4: Geometry Calculations

### `lib/calculations/geometry.ts`

Pure functions:
- `calcMaxTankVolume(D_mm, H_mm)` → π×(D/2)²×H / 10⁹ m³
- `calcShellSurfaceArea(D_mm, H_mm)` → π×D×H / 10⁶ m²
- `calcConeRoofArea(D_mm)` → π×r×√(r²+h²) where h=D_mm/(12×1000) (1:12 slope from Excel)
- `calcTotalSurfaceArea(shell, roof)` → shell + roof
- `calcWettedArea(D_mm, H_mm)` → min(shell, π×D×9144 / 10⁶)
- `calcR_in(U_i, t_mm, k)` → 1/(1 + U_i×t/k) where t=t_mm/1000
- `calcR_inp(A_TTS, A_inp, R_in)` → A_inp/A_TTS × R_in + (1 − A_inp/A_TTS)
- `computeDerivedGeometry(input)` — orchestrator

### `__tests__/geometry.test.ts`
Reference case (24000mm × 17500mm, lat 12.7°):
- Volume: **7,916.81 m³**
- Shell surface area: **1,319.47 m²**
- Wetted area: **689.44 m²**
- Cone roof area: **458.63 m²** (h=2m, r=12m, slant=12.166m)
- R_in/R_inp boundary conditions

**Verify:** All match Excel within 0.01% tolerance.

---

## Phase 5: Calculation Engine

### `lib/calculations/normalVenting.ts`

**Stream direction mapping (critical):** PD.md uses process-perspective naming:
- "Incoming streams" = liquid arriving at the process FROM the tank = tank outflow → **inbreathing**
- "Outgoing streams" = liquid leaving the process TO the tank = tank inflow → **outbreathing**

The Excel confirms: outgoing stream total (368.9) → inbreathing flowrate.

**For 5th edition:**
- Process inbreathing = 0.94 × Σ(incoming stream flowrates)
- Process outbreathing = Σ(outgoing stream flowrates)
- Thermal in/out = lookup from Normal Venting Table
- Total = **max**(process, thermal)

**For 6th edition:**
- Process inbreathing = Σ(incoming stream flowrates)
- Process outbreathing = Σ(outgoing stream flowrates)
- Thermal in/out = lookup from Normal Venting Table
- Total = process **+** thermal

**For 7th edition:**
- Process same as 6th
- Thermal outbreathing = Y-factor × NormalVentTable_outbreathing(capacity) × R
- Thermal inbreathing = C-factor × NormalVentTable_inbreathing(capacity) × R
- Total = process **+** thermal

### `lib/calculations/emergencyVenting.ts`

1. Select heat input coefficients by wetted area range + pressure
2. Q = a × ATWS^n (watts)
3. F = environmental factor from config (fixed or from F-factor table for insulated)
4. V_emergency = (906.6 × Q × F) / (1000 × L) × √((T_r + 273.15) / M)

For 5th/6th: can also use emergency vent table lookup.

### `lib/calculations/drain.ts`
Q_drain = 3.48 × (d/1000)² × √(H/1000) × 3600 × 0.94

### `lib/calculations/index.ts`
Orchestrator: apply Hexane defaults → compute geometry → compute reduction factors → compute all venting → assemble CalculationResult.

### Tests
- Reference case: Q = **5,741,539 W**, F = 1.0, emergency vent = **28,452 Nm³/h**
- Coefficient selection: 689.44 m² is in the 93–260 range → a=630400, n=0.338
- API edition switching (max vs sum)
- Edge cases: underground (F=0), capacity > 30000 warning

**Verify:** Full integration test matches Excel reference case.

---

## Phase 6: API Routes

### `app/api/vent/calculate/route.ts`
POST endpoint: validate with shared Zod schema → call `calculate()` → return JSON.

### `app/api/vent/lookup/{yfactor,cfactor,ffactor}/route.ts`
GET endpoints with query params → return factor values.

**Verify:** `curl` against running dev server matches expected values.

---

## Phase 7: State Management

### `lib/store/calculatorStore.ts`
Zustand store: input state, derived geometry (client-side), calculation result (from API), loading/error flags.

### `lib/hooks/useCalculation.ts`
Debounced (300ms) API call on valid form changes. Immediate client-side derived geometry update.

**Verify:** Store updates correctly, debounce fires after 300ms pause.

---

## Phase 8: UI — Input Panel

Two-column layout: inputs (left), results (right).

### Components:
- `app/calculator/page.tsx` — layout with FormProvider
- `app/calculator/components/InputPanel.tsx` — wraps all sections
- `sections/TankDetailSection.tsx` — diameter, height, latitude, pressure, config selector, conditional insulation fields
- `sections/FluidPropertiesSection.tsx` — temp, vapour pressure, FP/BP toggle, latent heat/temp/MW with Hexane placeholders
- `sections/StreamFlowSection.tsx` — dynamic add/remove rows with `useFieldArray`
- `sections/DrainSystemSection.tsx` — collapsible, collapsed by default
- `sections/ApiEditionSelector.tsx` — 5th/6th/7th radio group
- `components/DerivedGeometry.tsx` — read-only, updates instantly (client-side calc)
- `components/ConfigSelector.tsx` — dropdown + conditional insulation fields

**Verify:** All fields render, conditional visibility works, validation errors inline.

---

## Phase 9: UI — Results Panel

### Components:
- `app/calculator/components/ResultsPanel.tsx` — container with loading/error states
- `results/NormalVentingResult.tsx` — process + thermal + total for both in/outbreathing
- `results/EmergencyVentingResult.tsx` — Q, F, coefficients, vent rate
- `results/SummaryResult.tsx` — design outbreathing, inbreathing, emergency
- `components/TankSchematic.tsx` — simple SVG with D/H annotations, wetted area shading

**Verify:** Fill reference case → results match Excel. Change API edition → totals update.

---

## Phase 10: PDF Export

### `lib/pdf/CalculationReport.tsx`
React-PDF document: header (tank no, desc, date, standard) → Section I (inputs table) → Section II (calculations with intermediates) → Summary table.

### `app/calculator/components/ExportButton.tsx`
Generates PDF blob and triggers download. Disabled without valid results.

**Verify:** PDF downloads with correct data and formatting.

---

## Phase 11: Polish + Edge Cases

- Design pressure > 103.4: block calculation, show error
- Capacity > 30,000: warning banner
- Underground: F=0, emergency=0, info message
- Latitude boundary behavior at 42° and 58°
- Responsive layout (stack on mobile)
- Number formatting with appropriate decimals
- Empty states, loading spinners

---

## Phase 12: Deployment

- `npm run build` — zero errors
- `npx vitest --run` — all green
- `git init` + initial commit
- Deploy to Vercel

---

## Key File Structure

```
app/
  page.tsx                          → redirect to /calculator
  layout.tsx                        → root layout
  calculator/
    page.tsx                        → two-column layout
    components/
      InputPanel.tsx
      ResultsPanel.tsx
      TankSchematic.tsx
      DerivedGeometry.tsx
      ConfigSelector.tsx
      ExportButton.tsx
    sections/
      TankDetailSection.tsx
      FluidPropertiesSection.tsx
      StreamFlowSection.tsx
      DrainSystemSection.tsx
      ApiEditionSelector.tsx
    results/
      NormalVentingResult.tsx
      EmergencyVentingResult.tsx
      SummaryResult.tsx
  api/vent/
    calculate/route.ts
    lookup/
      yfactor/route.ts
      cfactor/route.ts
      ffactor/route.ts
lib/
  constants.ts
  calculations/
    index.ts                        → orchestrator
    geometry.ts
    normalVenting.ts
    emergencyVenting.ts
    drain.ts
  lookups/
    interpolate.ts
    yFactor.ts
    cFactor.ts
    fFactor.ts
    normalVentTable.ts
    emergencyVentTable.ts
  validation/
    inputSchema.ts
  store/
    calculatorStore.ts
  hooks/
    useCalculation.ts
  pdf/
    CalculationReport.tsx
types/
  index.ts
__tests__/
  validation.test.ts
  interpolation.test.ts
  geometry.test.ts
  normalVenting.test.ts
  emergencyVenting.test.ts
  drain.test.ts
  calculate.test.ts
```

## Verification Plan

1. **Unit tests** (Phases 2–5): Run `npx vitest --run` after each phase
2. **Reference case validation** (Phase 5): Match all Excel intermediate values
3. **API smoke test** (Phase 6): `curl` POST with reference case body
4. **Manual UI walkthrough** (Phases 8–9): Fill reference case, verify live results
5. **PDF spot check** (Phase 10): Download and verify content
6. **Build check** (Phase 12): `npm run build` clean
