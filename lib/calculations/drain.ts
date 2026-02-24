/**
 * Drain system inbreathing (API 2000 §6.4).
 *
 * When a tank drains, the liquid column head drives flow through the drain line.
 * The resulting liquid outflow creates an equal inbreathing demand (volumetric
 * displacement), which must be accommodated by the vent system.
 *
 * Formula (from PD.md §6.4):
 *   Q_drain = 3.48 × (d/1000)² × √(H_drain/1000) × 3600 × 0.94   [Nm³/h]
 *
 * Where:
 *   d       = drain line diameter  [mm]
 *   H_drain = max height of liquid above drain line  [mm]
 *   3.48    = orifice discharge coefficient × √(2g) approximation
 *   3600    = converts m³/s → m³/h
 *   0.94    = additional discharge correction factor
 */
export function computeDrainInbreathing(
  drainLineSizeMm: number,
  maxHeightAboveDrainMm: number,
): number {
  const d = drainLineSizeMm      / 1000   // mm → m
  const H = maxHeightAboveDrainMm / 1000  // mm → m
  return 3.48 * d * d * Math.sqrt(H) * 3600 * 0.94
}
