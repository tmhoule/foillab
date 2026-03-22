import { describe, it, expect } from 'vitest'
import {
  interpolateBezierCurve,
  computeThicknessRatio,
  computeMaxCamber,
  discretizeProfile,
  detectSelfIntersection,
  fitBezierToCoordinates,
} from '../../src/composables/useFoilGeometry'
import type { BezierPoint, FoilProfile } from '../../src/types/foil'

function makePoint(x: number, y: number): BezierPoint {
  return { x, y, handleIn: { dx: 0, dy: 0 }, handleOut: { dx: 0, dy: 0 } }
}

function makeSymmetricProfile(): FoilProfile {
  return {
    name: 'test-symmetric',
    upper: [
      makePoint(0, 0),
      makePoint(0.25, 0.05),
      makePoint(0.5, 0.06),
      makePoint(0.75, 0.04),
      makePoint(1, 0),
    ],
    lower: [
      makePoint(0, 0),
      makePoint(0.25, -0.05),
      makePoint(0.5, -0.06),
      makePoint(0.75, -0.04),
      makePoint(1, 0),
    ],
  }
}

describe('interpolateBezierCurve', () => {
  it('returns endpoints for a two-point curve', () => {
    const points = [makePoint(0, 0), makePoint(1, 0)]
    const result = interpolateBezierCurve(points, 10)
    expect(result.length).toBe(10)
    expect(result[0].x).toBeCloseTo(0)
    expect(result[result.length - 1].x).toBeCloseTo(1)
  })

  it('produces monotonically increasing x for a simple curve', () => {
    const points = [makePoint(0, 0), makePoint(0.5, 0.1), makePoint(1, 0)]
    const result = interpolateBezierCurve(points, 20)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].x).toBeGreaterThanOrEqual(result[i - 1].x)
    }
  })
})

describe('computeThicknessRatio', () => {
  it('returns ~12% for symmetric profile with 6% half-thickness', () => {
    const profile = makeSymmetricProfile()
    const ratio = computeThicknessRatio(profile)
    expect(ratio).toBeCloseTo(0.12, 1)
  })
})

describe('computeMaxCamber', () => {
  it('returns ~0% for a symmetric profile', () => {
    const profile = makeSymmetricProfile()
    const camber = computeMaxCamber(profile)
    expect(camber).toBeCloseTo(0, 2)
  })
})

describe('discretizeProfile', () => {
  it('returns cosine-clustered points with specified count', () => {
    const profile = makeSymmetricProfile()
    const points = discretizeProfile(profile, 100)
    expect(points.length).toBe(100)
    expect(points[0].x).toBeCloseTo(1, 0)
    expect(points[points.length - 1].x).toBeCloseTo(1, 0)
  })
})

describe('detectSelfIntersection', () => {
  it('returns false for a valid profile', () => {
    const profile = makeSymmetricProfile()
    expect(detectSelfIntersection(profile)).toBe(false)
  })
})

describe('fitBezierToCoordinates', () => {
  it('round-trips a set of coordinates through fit and interpolation', () => {
    const coords = [
      { x: 0, y: 0 }, { x: 0.1, y: 0.04 }, { x: 0.3, y: 0.06 },
      { x: 0.5, y: 0.05 }, { x: 0.7, y: 0.03 }, { x: 1, y: 0 },
    ]
    const bezierPoints = fitBezierToCoordinates(coords, 6)
    const interpolated = interpolateBezierCurve(bezierPoints, 50)
    for (const coord of coords) {
      const nearest = interpolated.reduce((best, p) =>
        Math.abs(p.x - coord.x) < Math.abs(best.x - coord.x) ? p : best
      )
      expect(nearest.y).toBeCloseTo(coord.y, 1)
    }
  })
})
