import { describe, it, expect } from 'vitest'
import { solvePanelMethod } from '../../src/composables/usePanelMethod'
import { generateNACA4Digit } from '../../src/data/naca'

describe('solvePanelMethod', () => {
  it('returns CL ≈ 0 for NACA 0012 at 0° AoA', () => {
    const profile = generateNACA4Digit('0012')
    const result = solvePanelMethod(profile, 0)
    expect(result.converged).toBe(true)
    expect(result.cl).toBeCloseTo(0, 1)
  })

  it('returns symmetric Cp for NACA 0012 at 0° AoA', () => {
    const profile = generateNACA4Digit('0012')
    const result = solvePanelMethod(profile, 0)
    expect(result.cpUpper.length).toBeGreaterThan(0)
    expect(result.cpLower.length).toBeGreaterThan(0)
    const midUpper = result.cpUpper.find(p => Math.abs(p.x - 0.5) < 0.1)
    const midLower = result.cpLower.find(p => Math.abs(p.x - 0.5) < 0.1)
    if (midUpper && midLower) {
      expect(midUpper.cp).toBeCloseTo(midLower.cp, 0)
    }
  })

  it('returns CL ≈ 0.85 for NACA 2412 at 5° AoA (within 15%)', () => {
    const profile = generateNACA4Digit('2412')
    const result = solvePanelMethod(profile, 5)
    expect(result.converged).toBe(true)
    expect(result.cl).toBeGreaterThan(0.85 * 0.85)
    expect(result.cl).toBeLessThan(0.85 * 1.15)
  })

  it('returns positive pressure drag for any profile at nonzero AoA', () => {
    const profile = generateNACA4Digit('2412')
    const result = solvePanelMethod(profile, 5)
    expect(result.cd).toBeGreaterThan(0)
  })

  it('CL increases with AoA', () => {
    const profile = generateNACA4Digit('0012')
    const r0 = solvePanelMethod(profile, 0)
    const r5 = solvePanelMethod(profile, 5)
    const r10 = solvePanelMethod(profile, 10)
    expect(r5.cl).toBeGreaterThan(r0.cl)
    expect(r10.cl).toBeGreaterThan(r5.cl)
  })

  it('returns L/D ratio as cl/cd', () => {
    const profile = generateNACA4Digit('2412')
    const result = solvePanelMethod(profile, 5)
    if (result.cd > 0) {
      expect(result.ld).toBeCloseTo(result.cl / result.cd, 1)
    }
  })
})
