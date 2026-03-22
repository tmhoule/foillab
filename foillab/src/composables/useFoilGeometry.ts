import type { BezierPoint, FoilProfile } from '../types/foil'

function cubicBezier(
  p0: { x: number; y: number }, p1: { x: number; y: number },
  p2: { x: number; y: number }, p3: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const mt = 1 - t
  const mt2 = mt * mt
  const t2 = t * t
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  }
}

export function interpolateBezierCurve(
  points: BezierPoint[],
  numSamples: number,
): Array<{ x: number; y: number }> {
  if (points.length < 2) return points.map(p => ({ x: p.x, y: p.y }))
  const numSegments = points.length - 1
  const result: Array<{ x: number; y: number }> = []
  const samplesPerSegment = Math.max(2, Math.ceil(numSamples / numSegments))

  for (let seg = 0; seg < numSegments; seg++) {
    const p0 = points[seg]
    const p3 = points[seg + 1]
    const p1 = { x: p0.x + p0.handleOut.dx, y: p0.y + p0.handleOut.dy }
    const p2 = { x: p3.x + p3.handleIn.dx, y: p3.y + p3.handleIn.dy }
    for (let i = (seg === 0 ? 0 : 1); i < samplesPerSegment; i++) {
      const t = i / (samplesPerSegment - 1)
      result.push(cubicBezier(p0, p1, p2, p3, t))
    }
  }
  while (result.length > numSamples) result.pop()
  while (result.length < numSamples) result.push(result[result.length - 1])
  return result
}

export function discretizeProfile(
  profile: FoilProfile,
  numPanels: number,
): Array<{ x: number; y: number }> {
  const halfN = Math.floor(numPanels / 2)
  const upperPts = interpolateBezierCurve(profile.upper, halfN + 1)
  const lowerPts = interpolateBezierCurve(profile.lower, halfN + 1)

  function cosineResample(pts: Array<{ x: number; y: number }>, n: number) {
    const resampled: Array<{ x: number; y: number }> = []
    for (let i = 0; i <= n; i++) {
      const t = 0.5 * (1 - Math.cos(Math.PI * i / n))
      const targetX = pts[0].x + t * (pts[pts.length - 1].x - pts[0].x)
      let idx = pts.findIndex(p => p.x >= targetX)
      if (idx <= 0) idx = 1
      if (idx >= pts.length) idx = pts.length - 1
      const frac = (targetX - pts[idx - 1].x) / (pts[idx].x - pts[idx - 1].x || 1)
      resampled.push({
        x: pts[idx - 1].x + frac * (pts[idx].x - pts[idx - 1].x),
        y: pts[idx - 1].y + frac * (pts[idx].y - pts[idx - 1].y),
      })
    }
    return resampled
  }

  const upperResampled = cosineResample(upperPts, halfN)
  const lowerResampled = cosineResample(lowerPts, numPanels - halfN - 1)
  const result = [...upperResampled.reverse(), ...lowerResampled.slice(1)]
  return result
}

export function computeThicknessRatio(profile: FoilProfile): number {
  const n = 100
  const upper = interpolateBezierCurve(profile.upper, n)
  const lower = interpolateBezierCurve(profile.lower, n)
  let maxThickness = 0
  for (let i = 0; i < n; i++) {
    const thickness = upper[i].y - lower[i].y
    if (thickness > maxThickness) maxThickness = thickness
  }
  return maxThickness
}

export function computeMaxCamber(profile: FoilProfile): number {
  const n = 100
  const upper = interpolateBezierCurve(profile.upper, n)
  const lower = interpolateBezierCurve(profile.lower, n)
  let maxCamber = 0
  for (let i = 0; i < n; i++) {
    const camber = (upper[i].y + lower[i].y) / 2
    if (Math.abs(camber) > Math.abs(maxCamber)) maxCamber = camber
  }
  return maxCamber
}

function segmentsIntersect(
  a1: { x: number; y: number }, a2: { x: number; y: number },
  b1: { x: number; y: number }, b2: { x: number; y: number },
): boolean {
  const d1x = a2.x - a1.x, d1y = a2.y - a1.y
  const d2x = b2.x - b1.x, d2y = b2.y - b1.y
  const cross = d1x * d2y - d1y * d2x
  if (Math.abs(cross) < 1e-12) return false
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / cross
  const u = ((b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x) / cross
  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99
}

export function detectSelfIntersection(profile: FoilProfile): boolean {
  const pts = discretizeProfile(profile, 200)
  for (let i = 0; i < pts.length - 1; i++) {
    for (let j = i + 3; j < pts.length - 1; j++) {
      if (segmentsIntersect(pts[i], pts[i + 1], pts[j], pts[j + 1])) return true
    }
  }
  return false
}

export function enforceMinThickness(profile: FoilProfile): FoilProfile {
  const minT = 0.005
  const result = structuredClone(profile)
  for (let i = 0; i < result.upper.length; i++) {
    const up = result.upper[i]
    const lo = result.lower.reduce((best, p) =>
      Math.abs(p.x - up.x) < Math.abs(best.x - up.x) ? p : best
    )
    const thickness = up.y - lo.y
    if (thickness < minT && up.x > 0.01 && up.x < 0.99) {
      const deficit = (minT - thickness) / 2
      up.y += deficit
      lo.y -= deficit
    }
  }
  return result
}

export function fitBezierToCoordinates(
  coords: Array<{ x: number; y: number }>,
  numPoints: number,
): BezierPoint[] {
  if (coords.length < 2) {
    return coords.map(c => ({
      x: c.x, y: c.y,
      handleIn: { dx: 0, dy: 0 }, handleOut: { dx: 0, dy: 0 },
    }))
  }
  const points: BezierPoint[] = []
  for (let i = 0; i < numPoints; i++) {
    const idx = Math.round(i * (coords.length - 1) / (numPoints - 1))
    const c = coords[idx]
    const prev = coords[Math.max(0, idx - 1)]
    const next = coords[Math.min(coords.length - 1, idx + 1)]
    const tx = (next.x - prev.x) / 2
    const ty = (next.y - prev.y) / 2
    const scale = 0.33
    points.push({
      x: c.x, y: c.y,
      handleIn: { dx: -tx * scale, dy: -ty * scale },
      handleOut: { dx: tx * scale, dy: ty * scale },
    })
  }
  points[0].handleIn = { dx: 0, dy: 0 }
  points[points.length - 1].handleOut = { dx: 0, dy: 0 }
  return points
}
