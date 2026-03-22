import { describe, it, expect } from 'vitest'
import { computeThinAirfoilCL } from '../../src/composables/useThinAirfoil'
import { generateNACA4Digit } from '../../src/data/naca'

describe('computeThinAirfoilCL', () => {
  it('returns CL ≈ 2π*α for symmetric airfoil (NACA 0012)', () => {
    const profile = generateNACA4Digit('0012')
    const alpha = 5
    const cl = computeThinAirfoilCL(profile, alpha)
    const expected = 2 * Math.PI * (alpha * Math.PI / 180)
    expect(cl).toBeCloseTo(expected, 1)
  })

  it('returns CL ≈ 0 for symmetric airfoil at 0° AoA', () => {
    const profile = generateNACA4Digit('0012')
    const cl = computeThinAirfoilCL(profile, 0)
    expect(cl).toBeCloseTo(0, 1)
  })

  it('returns positive CL for cambered airfoil at 0° AoA', () => {
    const profile = generateNACA4Digit('2412')
    const cl = computeThinAirfoilCL(profile, 0)
    expect(cl).toBeGreaterThan(0)
  })

  it('CL increases linearly with AoA', () => {
    const profile = generateNACA4Digit('0012')
    const cl5 = computeThinAirfoilCL(profile, 5)
    const cl10 = computeThinAirfoilCL(profile, 10)
    expect(cl10).toBeCloseTo(cl5 * 2, 1)
  })
})
