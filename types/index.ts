// ─── Enums ────────────────────────────────────────────────────────────────────

export enum TankConfiguration {
  BARE_METAL = "Bare Metal Tank (No Insulation)",
  INSULATED_FULL = "Insulated tank - Fully Insulation",
  INSULATED_PARTIAL = "Insulated tank - Partial Insulation",
  CONCRETE = "Concrete tank or Fire proofing",
  WATER_APPLICATION = "Water-application facilities",
  DEPRESSURING = "Depressuring and Emptying facilities",
  UNDERGROUND = "Underground Storage",
  EARTH_COVERED = "Earth-covered storage above grade",
  IMPOUNDMENT_AWAY = "Impoundment away from tank",
  IMPOUNDMENT = "Impoundment",
}

export type ApiEdition = "5TH" | "6TH" | "7TH"
export type FlashBoilingPointType = "FP" | "BP"

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface Stream {
  streamNo: string
  flowrate: number // m³/h
}

export interface OutgoingStream extends Stream {
  description?: string
}

export interface CalculationInput {
  // Identification
  tankNumber: string
  description?: string

  // Tank geometry
  diameter: number // mm
  height: number // mm (TL-TL)
  latitude: number // degrees (0 < lat ≤ 90)
  designPressure: number // kPag

  // Configuration
  tankConfiguration: TankConfiguration
  insulationThickness?: number // mm (required if insulated)
  insulationConductivity?: number // W/m·K (required if insulated)
  insideHeatTransferCoeff?: number // W/m²·K (required if insulated)
  insulatedSurfaceArea?: number // m² (required for INSULATED_PARTIAL — A_inp)

  // Fluid properties
  avgStorageTemp: number // °C
  vapourPressure: number // kPa
  flashBoilingPointType: FlashBoilingPointType
  flashBoilingPoint?: number // °C
  latentHeat?: number // kJ/kg (default: Hexane 334.9)
  relievingTemperature?: number // °C (default: 15.6)
  molecularMass?: number // g/mol (default: Hexane 86.17)

  // Stream flowrates
  // NOTE: naming convention follows PROCESS perspective (per PD.md):
  //   incomingStreams = liquid arriving at the process FROM the tank → tank outflow → inbreathing
  //   outgoingStreams = liquid leaving the process TO the tank → tank inflow → outbreathing
  incomingStreams: Stream[]
  outgoingStreams: OutgoingStream[]

  // Drain system (optional)
  drainLineSize?: number // mm
  maxHeightAboveDrain?: number // mm

  // Calculation settings
  apiEdition: ApiEdition
}

// ─── Derived Geometry ─────────────────────────────────────────────────────────

export interface DerivedGeometry {
  maxTankVolume: number // m³
  shellSurfaceArea: number // m² (cylindrical shell only)
  coneRoofArea: number // m²
  totalSurfaceArea: number // m² (shell + cone roof)
  wettedArea: number // m² (capped at π×D×9144mm)
  reductionFactor: number // R_in or R_inp (1.0 for non-insulated)
}

// ─── Calculation Results ──────────────────────────────────────────────────────

export interface OutbreathingResult {
  processFlowrate: number // Nm³/h
  yFactor: number
  reductionFactor: number
  thermalOutbreathing: number // Nm³/h
  total: number // Nm³/h
}

export interface InbreathingResult {
  processFlowrate: number // Nm³/h
  cFactor: number
  reductionFactor: number
  thermalInbreathing: number // Nm³/h
  total: number // Nm³/h
}

export interface NormalVentingResult {
  outbreathing: OutbreathingResult
  inbreathing: InbreathingResult
}

export interface HeatInputCoefficients {
  a: number
  n: number
}

export interface EmergencyVentingResult {
  heatInput: number // W
  environmentalFactor: number // F
  emergencyVentRequired: number // Nm³/h of air
  coefficients: HeatInputCoefficients
  referenceFluid: "Hexane" | "User-defined"
}

export interface VentingSummary {
  designOutbreathing: number // Nm³/h — governs outbreathing device
  designInbreathing: number // Nm³/h — governs inbreathing device
  emergencyVenting: number // Nm³/h
}

export interface CalculationWarnings {
  capacityExceedsTable?: boolean // capacity > 30,000 m³
  undergroundTank?: boolean // F = 0, emergency vent = 0
  hexaneDefaults?: boolean // latent heat / MW / temp defaulted to Hexane
}

export interface CalculationResult {
  derived: DerivedGeometry
  normalVenting: NormalVentingResult
  emergencyVenting: EmergencyVentingResult
  drainInbreathing?: number // Nm³/h (present only if drain data provided)
  summary: VentingSummary
  warnings: CalculationWarnings
  apiEdition: ApiEdition
  calculatedAt: string // ISO timestamp
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  error: string
  details?: unknown
}
