import { describe, it, expect } from 'vitest'
import { generateNACA4Digit } from '../../src/data/naca'

describe('generateNACA4Digit', () => {
  it('generates a symmetric profile for NACA 0012', () => {
    const profile = generateNACA4Digit('0012')
    expect(profile.name).toBe('NACA 0012')
    const upperY = profile.upper.map(p => p.y)
    const lowerY = profile.lower.map(p => p.y)
    for (let i = 0; i < upperY.length; i++) {
      expect(upperY[i]).toBeCloseTo(-lowerY[i], 2)
    }
  })

  it('generates correct thickness for NACA 0012 (max ~6% half-thickness)', () => {
    const profile = generateNACA4Digit('0012')
    const maxUpper = Math.max(...profile.upper.map(p => p.y))
    expect(maxUpper).toBeCloseTo(0.06, 1)
  })

  it('generates cambered profile for NACA 2412', () => {
    const profile = generateNACA4Digit('2412')
    expect(profile.name).toBe('NACA 2412')
    const maxUpper = Math.max(...profile.upper.map(p => p.y))
    const maxLower = Math.max(...profile.lower.map(p => Math.abs(p.y)))
    expect(maxUpper).toBeGreaterThan(maxLower)
  })

  it('starts at LE (0,0) and ends at TE (1,~0)', () => {
    const profile = generateNACA4Digit('0012')
    expect(profile.upper[0].x).toBeCloseTo(0)
    expect(profile.upper[0].y).toBeCloseTo(0)
    expect(profile.upper[profile.upper.length - 1].x).toBeCloseTo(1)
  })
})
