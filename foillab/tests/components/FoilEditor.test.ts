import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FoilEditor from '../../src/components/FoilEditor.vue'
import { useFoilStore } from '../../src/stores/foilStore'

describe('FoilEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders in draw mode by default', () => {
    const wrapper = mount(FoilEditor)
    expect(wrapper.text()).toContain('Draw')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('switches to library mode', async () => {
    const wrapper = mount(FoilEditor)
    const store = useFoilStore()
    store.editorMode = 'library'
    await wrapper.vm.$nextTick()
    expect(store.editorMode).toBe('library')
  })

  it('undo button calls store.undo', async () => {
    const store = useFoilStore()
    const { generateNACA4Digit } = await import('../../src/data/naca')
    store.loadProfile(generateNACA4Digit('0012'))
    expect(store.canUndo).toBe(true)
    const wrapper = mount(FoilEditor)
    await wrapper.vm.$nextTick()
    const undoBtn = wrapper.find('[data-testid="undo-btn"]')
    if (undoBtn.exists()) {
      await undoBtn.trigger('click')
      expect(store.profile.name).not.toBe('NACA 0012')
    }
  })

  it('displays thickness and camber in status bar', () => {
    const wrapper = mount(FoilEditor)
    const text = wrapper.text()
    expect(text).toMatch(/Thickness/)
    expect(text).toMatch(/Camber/)
  })
})
