import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AnalysisPanel from '../../src/components/AnalysisPanel.vue'
import { useFoilStore } from '../../src/stores/foilStore'

describe('AnalysisPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders AoA slider', () => {
    const wrapper = mount(AnalysisPanel)
    const slider = wrapper.find('input[type="range"]')
    expect(slider.exists()).toBe(true)
  })

  it('shows coefficient cards after analysis', async () => {
    const store = useFoilStore()
    store.runAnalysis(5)
    const wrapper = mount(AnalysisPanel)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toMatch(/C.*L/)
  })

  it('AoA slider triggers analysis update', async () => {
    const wrapper = mount(AnalysisPanel)
    const store = useFoilStore()
    const slider = wrapper.find('input[type="range"]')
    if (slider.exists()) {
      await slider.setValue('10')
      expect(store.aoa).toBe(10)
    }
  })

  it('displays pressure drag disclaimer', async () => {
    const store = useFoilStore()
    store.runAnalysis(5)
    const wrapper = mount(AnalysisPanel)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Pressure drag only')
  })
})
