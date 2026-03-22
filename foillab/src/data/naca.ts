import type { BezierPoint, FoilProfile } from '../types/foil'

/**
 * NACA 4-digit airfoil generator.
 *
 * Code format: "MPTT"
 *   M  = max camber (% chord)         e.g. '2' → m = 0.02
 *   P  = max camber location (tenths)  e.g. '4' → p = 0.4
 *   TT = max thickness (% chord)       e.g. '12' → t = 0.12
 */

/** Standard NACA thickness half-distribution (normalised chord). */
function thicknessAt(x: number, t: number): number {
  return 5 * t * (
    0.2969 * Math.sqrt(x)
    - 0.1260 * x
    - 0.3516 * x * x
    + 0.2843 * x * x * x
    - 0.1015 * x * x * x * x
  )
}

/** Camber line value at chord position x. */
function camberAt(x: number, m: number, p: number): number {
  if (m === 0 || p === 0) return 0
  if (x < p) {
    return (m / (p * p)) * (2 * p * x - x * x)
  }
  return (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x)
}

/** Derivative of camber line dy_c/dx at chord position x. */
function camberSlopeAt(x: number, m: number, p: number): number {
  if (m === 0 || p === 0) return 0
  if (x < p) {
    return (2 * m / (p * p)) * (p - x)
  }
  return (2 * m / ((1 - p) * (1 - p))) * (p - x)
}

/**
 * Build a cosine-clustered sequence of x stations (12 points, 0 → 1).
 * Cosine clustering concentrates points near LE and TE where curvature is high.
 */
function cosineStations(n: number): number[] {
  const stations: number[] = []
  for (let i = 0; i < n; i++) {
    stations.push(0.5 * (1 - Math.cos(Math.PI * i / (n - 1))))
  }
  return stations
}

/**
 * Estimate Bezier handles using the same finite-difference tangent approach as
 * `fitBezierToCoordinates` in useFoilGeometry.ts.
 */
function buildBezierPoints(coords: Array<{ x: number; y: number }>): BezierPoint[] {
  const n = coords.length
  const points: BezierPoint[] = []

  for (let i = 0; i < n; i++) {
    const c = coords[i]
    const prev = coords[Math.max(0, i - 1)]
    const next = coords[Math.min(n - 1, i + 1)]
    const tx = (next.x - prev.x) / 2
    const ty = (next.y - prev.y) / 2
    const scale = 0.33
    points.push({
      x: c.x,
      y: c.y,
      handleIn:  { dx: -tx * scale, dy: -ty * scale },
      handleOut: { dx:  tx * scale, dy:  ty * scale },
    })
  }

  // Zero out terminal handles so the curve doesn't overshoot the endpoints.
  points[0].handleIn = { dx: 0, dy: 0 }
  points[n - 1].handleOut = { dx: 0, dy: 0 }

  return points
}

/**
 * Generate a NACA 4-digit airfoil profile.
 *
 * @param code  Four-character string, e.g. "0012", "2412", "4415".
 * @returns     FoilProfile with upper and lower BezierPoint arrays.
 */
export function generateNACA4Digit(code: string): FoilProfile {
  if (code.length !== 4 || !/^\d{4}$/.test(code)) {
    throw new Error(`Invalid NACA 4-digit code: "${code}". Expected four digits, e.g. "2412".`)
  }

  const m = parseInt(code[0], 10) / 100   // max camber fraction
  const p = parseInt(code[1], 10) / 10    // max camber location fraction
  const t = parseInt(code.slice(2), 10) / 100  // thickness fraction

  const NUM_STATIONS = 12
  const xs = cosineStations(NUM_STATIONS)

  const upperCoords: Array<{ x: number; y: number }> = []
  const lowerCoords: Array<{ x: number; y: number }> = []

  for (const x of xs) {
    const yt = thicknessAt(x, t)
    const yc = camberAt(x, m, p)
    const dyc = camberSlopeAt(x, m, p)
    const theta = Math.atan(dyc)

    // Upper surface: thickness added perpendicular (above) the camber line
    upperCoords.push({
      x: x - yt * Math.sin(theta),
      y: yc + yt * Math.cos(theta),
    })

    // Lower surface: thickness subtracted perpendicular (below) the camber line
    lowerCoords.push({
      x: x + yt * Math.sin(theta),
      y: yc - yt * Math.cos(theta),
    })
  }

  return {
    name: `NACA ${code}`,
    upper: buildBezierPoints(upperCoords),
    lower: buildBezierPoints(lowerCoords),
  }
}
