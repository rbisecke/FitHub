/**
 * Distance formatting utilities.
 *
 * All distances are stored in the database as metres (distance_m).
 * These helpers convert to the user's preferred display unit (km or mi).
 */

export type DistanceUnit = "km" | "mi";

/**
 * Format a distance in metres to the user's preferred unit.
 *
 * @example
 * fmtDistance(2000, "km") // "2.00 km"
 * fmtDistance(2000, "mi") // "1.24 mi"
 */
export function fmtDistance(meters: number, unit: DistanceUnit): string {
  if (unit === "mi") return `${(meters / 1609.344).toFixed(2)} mi`;
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Format a pace (time per distance unit) from raw time and distance values.
 *
 * @param timeS    Total time in seconds
 * @param distanceM  Distance in metres
 * @param unit     The display unit ("km" or "mi")
 *
 * @example
 * fmtPace(7 * 60 + 12, 2000, "km") // "3:36 /km"
 * fmtPace(7 * 60 + 12, 2000, "mi") // "5:47 /mi"
 */
export function fmtPace(
  timeS: number,
  distanceM: number,
  unit: DistanceUnit,
): string {
  if (unit === "mi") {
    const pacePerMile = timeS / (distanceM / 1609.344);
    const m = Math.floor(pacePerMile / 60);
    const s = Math.round(pacePerMile % 60);
    return `${m}:${String(s).padStart(2, "0")} /mi`;
  }
  const pacePerKm = timeS / (distanceM / 1000);
  const m = Math.floor(pacePerKm / 60);
  const s = Math.round(pacePerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}
