import { describe, it, expect } from 'vitest'
import { generateSuggestions } from '../../src/composables/useSuggestions'
import { generateNACA4Digit } from '../../src/data/naca'
import { solvePanelMethod } from '../../src/composables/usePanelMethod'

describe('generateSuggestions', () => {
  it('returns suggestions for max-ld goal', () => {
    const profile = generateNACA4Digit('2412')
    const analysis = solvePanelMethod(profile, 5)
    const suggestions = generateSuggestions(profile, analysis, 'max-ld')
    expect(suggestions.length).toBeGreaterThan(0)
    suggestions.forEach(s => {
      expect(s.title).toBeTruthy()
      expect(s.description).toBeTruthy()
      expect(s.riderDescription).toBeTruthy()
      expect(['high', 'medium', 'low']).toContain(s.impact)
    })
  })

  it('suggestions have unique ids', () => {
    const profile = generateNACA4Digit('2412')
    const analysis = solvePanelMethod(profile, 5)
    const suggestions = generateSuggestions(profile, analysis, 'max-ld')
    const ids = suggestions.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('apply function returns a modified profile', () => {
    const profile = generateNACA4Digit('2412')
    const analysis = solvePanelMethod(profile, 5)
    const suggestions = generateSuggestions(profile, analysis, 'max-ld')
    if (suggestions.length > 0) {
      const modified = suggestions[0].apply(profile)
      expect(modified.upper).toBeDefined()
      expect(modified.lower).toBeDefined()
      const origY = profile.upper.map(p => p.y)
      const modY = modified.upper.map(p => p.y)
      const same = origY.every((y, i) => Math.abs(y - modY[i]) < 1e-10)
      expect(same).toBe(false)
    }
  })

  it('returns different suggestions for different goals', () => {
    const profile = generateNACA4Digit('2412')
    const analysis = solvePanelMethod(profile, 5)
    const ldSugg = generateSuggestions(profile, analysis, 'max-ld')
    const liftSugg = generateSuggestions(profile, analysis, 'max-lift')
    expect(ldSugg.length).toBeGreaterThan(0)
    expect(liftSugg.length).toBeGreaterThan(0)
  })
})
