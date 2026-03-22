import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  FoilProfile, AnalysisResult, RiderPerformance,
  PerformanceSettings, Baseline, EditorMode, EditorTool,
  RightPanelTab, OptimizationGoal, Suggestion, FoilExport,
} from '../types/foil'
import { useUndoStack } from '../composables/useUndoStack'
import { solvePanelMethod } from '../composables/usePanelMethod'
import { computeThinAirfoilCL } from '../composables/useThinAirfoil'
import { computeRiderPerformance } from '../composables/usePerformance'
import { generateSuggestions } from '../composables/useSuggestions'
import { generateNACA4Digit } from '../data/naca'

export const useFoilStore = defineStore('foil', () => {
  const undoStack = useUndoStack<FoilProfile>()
  const defaultProfile = generateNACA4Digit('2412')
  undoStack.push(defaultProfile)

  const profile = computed(() => undoStack.current.value!)

  const analysis = ref<AnalysisResult | null>(null)
  const riderPerformance = ref<RiderPerformance | null>(null)
  const baselines = ref<Baseline[]>([])
  const editorMode = ref<EditorMode>('draw')
  const editorTool = ref<EditorTool>('select')
  const rightPanelTab = ref<RightPanelTab>('analysis')
  const guidedMode = ref(false)
  const aoa = ref(5)
  const previewProfile = ref<FoilProfile | null>(null)
  const selfIntersecting = ref(false)

  const settings = ref<PerformanceSettings>({
    riderWeight: 80,
    foilArea: 0.12,
    waterType: 'salt',
  })

  function loadProfile(p: FoilProfile) {
    undoStack.push(structuredClone(p))
  }

  function updateProfile(p: FoilProfile) {
    undoStack.push(structuredClone(p))
  }

  function undo() { undoStack.undo() }
  function redo() { undoStack.redo() }
  function resetProfile() { undoStack.reset(structuredClone(defaultProfile)) }

  const canUndo = computed(() => undoStack.canUndo.value)
  const canRedo = computed(() => undoStack.canRedo.value)

  function runAnalysis(aoaDeg: number) {
    aoa.value = aoaDeg
    const result = solvePanelMethod(profile.value, aoaDeg)
    analysis.value = result
    riderPerformance.value = computeRiderPerformance(result, profile.value, settings.value)
  }

  function getRealtimeCL(aoaDeg: number): number {
    return computeThinAirfoilCL(profile.value, aoaDeg)
  }

  function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
  }

  function saveBaseline() {
    if (!analysis.value) runAnalysis(aoa.value)
    baselines.value.push({
      name: `Baseline ${baselines.value.length + 1}`,
      profile: deepClone(profile.value),
      analysis: deepClone(analysis.value!),
    })
  }

  function updateSettings(partial: Partial<PerformanceSettings>) {
    Object.assign(settings.value, partial)
    if (analysis.value) {
      riderPerformance.value = computeRiderPerformance(analysis.value, profile.value, settings.value)
    }
  }

  function getSuggestions(goal: OptimizationGoal): Suggestion[] {
    if (!analysis.value) runAnalysis(aoa.value)
    return generateSuggestions(profile.value, analysis.value!, goal)
  }

  function applySuggestion(suggestion: Suggestion) {
    const modified = suggestion.apply(profile.value)
    updateProfile(modified)
    runAnalysis(aoa.value)
  }

  function exportProfile(): FoilExport {
    const p = profile.value
    return {
      version: 1,
      name: p.name,
      upper: p.upper.map(pt => ({
        x: pt.x, y: pt.y,
        hix: pt.handleIn.dx, hiy: pt.handleIn.dy,
        hox: pt.handleOut.dx, hoy: pt.handleOut.dy,
      })),
      lower: p.lower.map(pt => ({
        x: pt.x, y: pt.y,
        hix: pt.handleIn.dx, hiy: pt.handleIn.dy,
        hox: pt.handleOut.dx, hoy: pt.handleOut.dy,
      })),
    }
  }

  function importProfile(data: FoilExport) {
    const p: FoilProfile = {
      name: data.name,
      upper: data.upper.map(pt => ({
        x: pt.x, y: pt.y,
        handleIn: { dx: pt.hix, dy: pt.hiy },
        handleOut: { dx: pt.hox, dy: pt.hoy },
      })),
      lower: data.lower.map(pt => ({
        x: pt.x, y: pt.y,
        handleIn: { dx: pt.hix, dy: pt.hiy },
        handleOut: { dx: pt.hox, dy: pt.hoy },
      })),
    }
    loadProfile(p)
  }

  return {
    profile, analysis, riderPerformance, baselines, settings,
    editorMode, editorTool, rightPanelTab, guidedMode,
    aoa, previewProfile, selfIntersecting,
    canUndo, canRedo,
    loadProfile, updateProfile, undo, redo, resetProfile,
    runAnalysis, getRealtimeCL, saveBaseline, updateSettings,
    getSuggestions, applySuggestion,
    exportProfile, importProfile,
  }
})
