import { describe, it, expect } from 'vitest'
import { computeRiderPerformance } from '../../src/composables/usePerformance'
import type { AnalysisResult, FoilProfile, PerformanceSettings } from '../../src/types/foil'

const defaultSettings: PerformanceSettings = {
  riderWeight: 80,
  foilArea: 0.12,
  waterType: 'salt',
}

function makeAnalysis(cl: number, cd: number): AnalysisResult {
  return {
    cl, cd, ld: cd > 0 ? cl / cd : 0,
    aoa: 5, cpUpper: [], cpLower: [], converged: true,
  }
}

function makeHighCamberProfile(): FoilProfile {
  const pt = (x: number, y: number) => ({
    x, y, handleIn: { dx: 0, dy: 0 }, handleOut: { dx: 0, dy: 0 },
  })
  return {
    name: 'high-camber',
    upper: [pt(0, 0), pt(0.3, 0.08), pt(0.5, 0.09), pt(1, 0)],
    lower: [pt(0, 0), pt(0.3, -0.02), pt(0.5, -0.01), pt(1, 0)],
  }
}

describe('computeRiderPerformance', () => {
  it('returns speed range in knots', () => {
    const result = computeRiderPerformance(makeAnalysis(0.8, 0.015), makeHighCamberProfile(), defaultSettings)
    expect(result.speedRange[0]).toBeGreaterThan(0)
    expect(result.speedRange[1]).toBeGreaterThan(result.speedRange[0])
  })

  it('higher CL means lower minimum speed (easier takeoff)', () => {
    const lowCL = computeRiderPerformance(makeAnalysis(0.4, 0.01), makeHighCamberProfile(), defaultSettings)
    const highCL = computeRiderPerformance(makeAnalysis(0.8, 0.01), makeHighCamberProfile(), defaultSettings)
    expect(highCL.speedRange[0]).toBeLessThan(lowCL.speedRange[0])
  })

  it('heavier rider needs more speed', () => {
    const light = computeRiderPerformance(makeAnalysis(0.8, 0.015), makeHighCamberProfile(), { ...defaultSettings, riderWeight: 60 })
    const heavy = computeRiderPerformance(makeAnalysis(0.8, 0.015), makeHighCamberProfile(), { ...defaultSettings, riderWeight: 100 })
    expect(heavy.speedRange[0]).toBeGreaterThan(light.speedRange[0])
  })

  it('returns a character string', () => {
    const result = computeRiderPerformance(makeAnalysis(0.8, 0.015), makeHighCamberProfile(), defaultSettings)
    expect(result.character).toBeTruthy()
    expect(typeof result.character).toBe('string')
  })

  it('returns stability rating', () => {
    const result = computeRiderPerformance(makeAnalysis(0.8, 0.015), makeHighCamberProfile(), defaultSettings)
    expect(['low', 'medium', 'high']).toContain(result.stability)
  })
})
