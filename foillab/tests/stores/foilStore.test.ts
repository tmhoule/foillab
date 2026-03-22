import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFoilStore } from '../../src/stores/foilStore'
import { generateNACA4Digit } from '../../src/data/naca'

describe('foilStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with a default profile', () => {
    const store = useFoilStore()
    expect(store.profile).toBeTruthy()
    expect(store.profile.upper.length).toBeGreaterThan(0)
  })

  it('loads a profile from library', () => {
    const store = useFoilStore()
    const naca = generateNACA4Digit('0012')
    store.loadProfile(naca)
    expect(store.profile.name).toBe('NACA 0012')
  })

  it('supports undo after loading', () => {
    const store = useFoilStore()
    const origName = store.profile.name
    store.loadProfile(generateNACA4Digit('0012'))
    expect(store.profile.name).toBe('NACA 0012')
    store.undo()
    expect(store.profile.name).toBe(origName)
  })

  it('saves and retrieves baselines', () => {
    const store = useFoilStore()
    store.saveBaseline()
    expect(store.baselines.length).toBe(1)
    expect(store.baselines[0].name).toBe('Baseline 1')
  })

  it('updates analysis when profile changes', () => {
    const store = useFoilStore()
    store.loadProfile(generateNACA4Digit('2412'))
    store.runAnalysis(5)
    expect(store.analysis).toBeTruthy()
    expect(store.analysis!.cl).toBeGreaterThan(0)
  })

  it('manages performance settings', () => {
    const store = useFoilStore()
    store.updateSettings({ riderWeight: 90 })
    expect(store.settings.riderWeight).toBe(90)
  })

  it('tracks editor mode and tool', () => {
    const store = useFoilStore()
    expect(store.editorMode).toBe('draw')
    store.editorMode = 'library'
    expect(store.editorMode).toBe('library')
  })
})
