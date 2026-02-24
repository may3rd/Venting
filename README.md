# Tank Venting Calculator

> Atmospheric and low-pressure storage tank venting calculator per **API 2000** (5th, 6th, and 7th Editions).

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18?logo=vitest)
![License](https://img.shields.io/badge/license-MIT-green)

A full-stack web application that replaces the Excel-based tank venting calculation sheet used by process engineers. Enter tank geometry, fluid properties, and stream flowrates to instantly compute venting requirements — with live results and PDF export.

---

## Features

- **Normal venting** — process + thermal outbreathing and inbreathing for all three API 2000 editions
- **Emergency venting** — fire exposure heat input (Q), environmental factor (F), and required vent rate per API 2000 Table 3A
- **Drain system inbreathing** — optional drain line calculation
- **All API editions** — 5th, 6th, and 7th with correct edition-specific logic
- **Live calculation** — results update automatically (300 ms debounce) as you type
- **Insulation reduction factors** — fully and partially insulated tanks (R_in, R_inp per API 2000 Eq. 12)
- **PDF export** — formatted calculation report with all inputs, intermediate values, and summary
- **Requirements checklist** — guides users through required vs optional inputs before results appear

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Validation | Zod (shared between client & API) |
| State | React Hook Form + Zustand |
| PDF Export | @react-pdf/renderer |
| Testing | Vitest |
| Deployment | Vercel |

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000/calculator](http://localhost:3000/calculator).

### Running Tests

```bash
npm run test        # watch mode
npm run test:run    # single run (CI)
```

---

## Calculation Overview

### Normal Venting

| Component | Formula (6th/7th Ed.) |
|---|---|
| Process outbreathing | Σ incoming stream flowrates |
| Thermal outbreathing | Y × V_tk^0.9 × R |
| Process inbreathing | Σ outgoing stream flowrates |
| Thermal inbreathing | C × V_tk^0.7 × R |
| Total (6th/7th) | process + thermal |
| Total (5th) | max(process, thermal) |

Where Y and C are latitude/volatility-dependent factors from API 2000 tables, and R is the insulation reduction factor.

### Emergency Venting (API 2000 Table 3A)

| ATWS (m²) | Design Pressure | Formula |
|---|---|---|
| < 260 | ≤ 103.4 kPag | F × Table 7 lookup |
| ≥ 260 | ≤ 7 kPag | F × 19,910 Nm³/h |
| ≥ 260 | > 7 kPag | 208.2 × F × ATWS^0.82 |

The same formula applies to all API editions (5th, 6th, 7th).

For full specification including lookup tables, interpolation logic, and edge cases, see [PD.md](./PD.md).

---

## API Reference

### `POST /api/vent/calculate`

Submit tank inputs and receive all venting results.

**Request** (JSON): tank geometry, fluid properties, stream flowrates, tank configuration, API edition.
**Response** (JSON): derived geometry, normal venting (outbreathing + inbreathing), emergency venting, drain inbreathing, design summary, warnings.

See [PD.md §8](./PD.md) for full request/response schemas.

### Lookup Endpoints

```
GET /api/vent/lookup/ffactor  — Environmental factor F
GET /api/vent/lookup/yfactor  — Thermal outbreathing Y-factor
GET /api/vent/lookup/cfactor  — Thermal inbreathing C-factor
```

---

## Project Structure

```
├── app/
│   ├── api/vent/           — Calculation & lookup API routes
│   └── calculator/         — Main UI page and components
├── lib/
│   ├── calculations/       — Core calculation functions
│   ├── lookups/            — API 2000 table data + interpolation
│   └── validation/         — Shared Zod schemas
├── types/                  — TypeScript type definitions
└── __tests__/              — Unit and integration tests
```

---

## License

MIT — see [LICENSE](./LICENSE).
