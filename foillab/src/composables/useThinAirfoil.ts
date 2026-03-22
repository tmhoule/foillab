import type { FoilProfile } from '../types/foil'
import { interpolateBezierCurve } from './useFoilGeometry'

function computeZeroLiftAlpha(profile: FoilProfile): number {
  const n = 100
  const upperPts = interpolateBezierCurve(profile.upper, n)
  const lowerPts = interpolateBezierCurve(profile.lower, n)

  let integral = 0
  for (let i = 1; i < n; i++) {
    const theta = Math.PI * i / n
    const x = 0.5 * (1 - Math.cos(theta))

    const uIdx = upperPts.findIndex(p => p.x >= x)
    const lIdx = lowerPts.findIndex(p => p.x >= x)
    if (uIdx <= 0 || lIdx <= 0) continue

    const uY = lerp(upperPts[uIdx - 1], upperPts[uIdx], x)
    const lY = lerp(lowerPts[lIdx - 1], lowerPts[lIdx], x)
    const camber = (uY + lY) / 2

    const dx = 0.01
    const x2 = Math.min(x + dx, 1)
    const uIdx2 = upperPts.findIndex(p => p.x >= x2)
    const lIdx2 = lowerPts.findIndex(p => p.x >= x2)
    if (uIdx2 <= 0 || lIdx2 <= 0) continue

    const uY2 = lerp(upperPts[uIdx2 - 1], upperPts[uIdx2], x2)
    const lY2 = lerp(lowerPts[lIdx2 - 1], lowerPts[lIdx2], x2)
    const camber2 = (uY2 + lY2) / 2
    const dzdx = (camber2 - camber) / dx

    const dtheta = Math.PI / n
    integral += dzdx * (Math.cos(theta) - 1) * dtheta
  }

  return integral / Math.PI
}

function lerp(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  x: number,
): number {
  const t = (x - p1.x) / (p2.x - p1.x)
  return p1.y + t * (p2.y - p1.y)
}

export function computeThinAirfoilCL(profile: FoilProfile, alpha: number): number {
  const alphaRad = alpha * Math.PI / 180
  const alphaL0 = computeZeroLiftAlpha(profile)
  return 2 * Math.PI * (alphaRad + alphaL0)
}
