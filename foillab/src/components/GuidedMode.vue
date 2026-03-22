<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useFoilStore } from '../stores/foilStore'
import FoilLibrary from './FoilLibrary.vue'
import FoilOverlay from './charts/FoilOverlay.vue'
import type { Suggestion, OptimizationGoal } from '../types/foil'

const store = useFoilStore()

// Step state (1–5)
const currentStep = ref(1)

// Step 2 form state
const riderWeight = ref(store.settings.riderWeight)
const windCondition = ref<'light' | 'moderate' | 'strong'>('moderate')
const skillLevel = ref<'beginner' | 'intermediate' | 'advanced'>('intermediate')

// Step 3 detail toggle
const showDetails = ref(false)

// Step 4 suggestions state
const activeGoal = ref<OptimizationGoal>('min-drag')
const suggestions = ref<Suggestion[]>([])
const previewingId = ref<string | null>(null)

const riderGoals: Array<{ value: OptimizationGoal; label: string }> = [
  { value: 'min-drag',      label: 'Go faster' },
  { value: 'max-lift',      label: 'More lift' },
  { value: 'max-ld',        label: 'Better efficiency' },
  { value: 'stability',     label: 'More stable' },
  { value: 'early-takeoff', label: 'Easier takeoff' },
]

const impactColors: Record<string, string> = {
  high:   '#6bcb77',
  medium: '#ffd93d',
  low:    '#888888',
}

const stepLabels = [
  'Choose Shape',
  'About You',
  'Performance',
  'Improvements',
  'Compare',
]

function goNext() {
  if (currentStep.value < 5) {
    if (currentStep.value === 2) applyRiderSettings()
    if (currentStep.value === 3) loadSuggestions()
    currentStep.value++
  }
}

function goBack() {
  if (currentStep.value > 1) currentStep.value--
}

function applyRiderSettings() {
  store.updateSettings({ riderWeight: riderWeight.value })
  store.runAnalysis(store.aoa)
}

function loadSuggestions() {
  suggestions.value = store.getSuggestions(activeGoal.value)
}

function selectGoal(goal: OptimizationGoal) {
  activeGoal.value = goal
  suggestions.value = store.getSuggestions(goal)
  previewingId.value = null
  store.previewProfile = null
}

function preview(s: Suggestion) {
  store.previewProfile = s.apply(store.profile)
  previewingId.value = s.id
}

function dismissPreview() {
  store.previewProfile = null
  previewingId.value = null
}

function applySuggestion(s: Suggestion) {
  store.applySuggestion(s)
  store.previewProfile = null
  previewingId.value = null
  suggestions.value = store.getSuggestions(activeGoal.value)
}

// Run analysis when step 3 becomes active
watch(currentStep, (step) => {
  if (step === 3) {
    store.runAnalysis(store.aoa)
    showDetails.value = false
  }
  if (step === 4) {
    loadSuggestions()
  }
})

onMounted(() => {
  store.runAnalysis(store.aoa)
})
</script>

<template>
  <div class="guided-mode">

    <!-- Progress bar -->
    <div class="progress-bar">
      <div class="steps-track">
        <template v-for="(_label, i) in stepLabels" :key="i">
          <div
            class="step-dot"
            :class="{
              filled: i + 1 <= currentStep,
              current: i + 1 === currentStep,
            }"
          >
            <span class="dot-number">{{ i + 1 }}</span>
          </div>
          <div
            v-if="i < stepLabels.length - 1"
            class="step-connector"
            :class="{ filled: i + 1 < currentStep }"
          ></div>
        </template>
      </div>
      <div class="step-labels">
        <span
          v-for="(label, i) in stepLabels"
          :key="i"
          class="step-label"
          :class="{ active: i + 1 === currentStep }"
        >{{ label }}</span>
      </div>
    </div>

    <!-- Step content -->
    <div class="step-content">

      <!-- Step 1: Choose a starting shape -->
      <div v-if="currentStep === 1" class="step-pane">
        <h2 class="step-title">Choose a starting shape</h2>
        <p class="step-desc">Browse the foil library and click a profile to load it as your starting point.</p>
        <div class="library-wrapper">
          <FoilLibrary />
        </div>
      </div>

      <!-- Step 2: Tell us about your riding -->
      <div v-else-if="currentStep === 2" class="step-pane">
        <h2 class="step-title">Tell us about your riding</h2>
        <p class="step-desc">We'll use this to tailor performance estimates to you.</p>

        <div class="form-group">
          <label class="form-label">Rider weight (kg)</label>
          <input
            v-model.number="riderWeight"
            type="number"
            class="form-input"
            min="30"
            max="200"
            step="1"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Typical wind conditions</label>
          <select v-model="windCondition" class="form-input">
            <option value="light">Light — 8 to 15 kts</option>
            <option value="moderate">Moderate — 15 to 22 kts</option>
            <option value="strong">Strong — 22 to 30 kts</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Skill level</label>
          <select v-model="skillLevel" class="form-input">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <!-- Step 3: See how it performs -->
      <div v-else-if="currentStep === 3" class="step-pane">
        <h2 class="step-title">See how it performs</h2>
        <p class="step-desc">Here's what this foil shape means for your riding.</p>

        <div v-if="store.riderPerformance" class="perf-cards">

          <div class="perf-big-card">
            <div class="perf-big-label">Speed range</div>
            <div class="perf-big-value">
              {{ store.riderPerformance.speedRange[0] }}–{{ store.riderPerformance.speedRange[1] }}
              <span class="perf-big-unit">kts</span>
            </div>
          </div>

          <div class="perf-big-card">
            <div class="perf-big-label">Wind range</div>
            <div class="perf-big-value">
              {{ store.riderPerformance.windRange[0] }}–{{ store.riderPerformance.windRange[1] }}
              <span class="perf-big-unit">kts</span>
            </div>
          </div>

          <div class="perf-big-card wide">
            <div class="perf-big-label">Character</div>
            <div class="perf-big-value perf-character">{{ store.riderPerformance.character }}</div>
          </div>

          <div class="perf-big-card">
            <div class="perf-big-label">Stability</div>
            <div
              class="stability-badge"
              :class="store.riderPerformance.stability"
            >
              {{ store.riderPerformance.stability }}
            </div>
          </div>

        </div>

        <div v-else class="loading-text">Running analysis...</div>

        <!-- Show details toggle -->
        <button class="details-toggle" @click="showDetails = !showDetails">
          {{ showDetails ? 'Hide details' : 'Show details' }}
        </button>

        <div v-if="showDetails && store.analysis" class="details-grid">
          <div class="detail-item">
            <span class="detail-label" style="color: #00d4ff">CL</span>
            <span class="detail-value" style="color: #00d4ff">{{ store.analysis.cl.toFixed(3) }}</span>
            <span class="detail-sub">Lift coefficient</span>
          </div>
          <div class="detail-item">
            <span class="detail-label" style="color: #ffd93d">CD</span>
            <span class="detail-value" style="color: #ffd93d">{{ store.analysis.cd.toFixed(4) }}</span>
            <span class="detail-sub">Drag coefficient</span>
          </div>
          <div class="detail-item">
            <span class="detail-label" style="color: #6bcb77">L/D</span>
            <span class="detail-value" style="color: #6bcb77">{{ store.analysis.ld.toFixed(1) }}</span>
            <span class="detail-sub">Efficiency ratio</span>
          </div>
        </div>
      </div>

      <!-- Step 4: Explore improvements -->
      <div v-else-if="currentStep === 4" class="step-pane">
        <h2 class="step-title">Explore improvements</h2>
        <p class="step-desc">Pick a goal and we'll suggest changes to the foil shape.</p>

        <div class="goal-chips">
          <button
            v-for="g in riderGoals"
            :key="g.value"
            class="goal-chip"
            :class="{ active: activeGoal === g.value }"
            @click="selectGoal(g.value)"
          >
            {{ g.label }}
          </button>
        </div>

        <div class="suggestions-list">
          <div
            v-for="s in suggestions"
            :key="s.id"
            class="suggestion-card"
          >
            <div class="card-header">
              <span class="card-title">{{ s.title }}</span>
              <span
                class="impact-badge"
                :style="{ color: impactColors[s.impact], borderColor: impactColors[s.impact] }"
              >{{ s.impact }}</span>
            </div>
            <p class="card-desc">{{ s.riderDescription || s.description }}</p>
            <div class="card-actions">
              <template v-if="previewingId === s.id">
                <button class="btn btn-dismiss" @click="dismissPreview">Dismiss</button>
              </template>
              <template v-else>
                <button class="btn btn-preview" @click="preview(s)">Preview</button>
              </template>
              <button class="btn btn-apply" @click="applySuggestion(s)">Apply</button>
            </div>
          </div>

          <div v-if="suggestions.length === 0" class="empty-state">
            No suggestions available for this goal.
          </div>
        </div>
      </div>

      <!-- Step 5: Compare options -->
      <div v-else-if="currentStep === 5" class="step-pane">
        <h2 class="step-title">Compare options</h2>
        <p class="step-desc">See how your current foil stacks up against a saved baseline.</p>

        <div v-if="store.baselines.length > 0" class="compare-content">

          <div class="overlay-wrapper">
            <FoilOverlay
              :profile="store.profile"
              :ghostProfile="store.baselines[store.baselines.length - 1].profile"
              :showControlPoints="false"
              :showGrid="true"
              :showChordLine="true"
            />
          </div>

          <div class="overlay-legend">
            <span class="legend-item"><span class="legend-swatch solid"></span>Current</span>
            <span class="legend-item"><span class="legend-swatch dashed"></span>{{ store.baselines[store.baselines.length - 1].name }}</span>
          </div>

          <div v-if="store.analysis" class="delta-compare">
            <div class="delta-row delta-header-row">
              <span>Metric</span><span>Current</span><span>Baseline</span>
            </div>
            <div class="delta-row">
              <span class="delta-metric">CL</span>
              <span class="delta-current">{{ store.analysis.cl.toFixed(3) }}</span>
              <span class="delta-base">{{ store.baselines[store.baselines.length - 1].analysis.cl.toFixed(3) }}</span>
            </div>
            <div class="delta-row">
              <span class="delta-metric">CD</span>
              <span class="delta-current">{{ store.analysis.cd.toFixed(4) }}</span>
              <span class="delta-base">{{ store.baselines[store.baselines.length - 1].analysis.cd.toFixed(4) }}</span>
            </div>
            <div class="delta-row">
              <span class="delta-metric">L/D</span>
              <span class="delta-current">{{ store.analysis.ld.toFixed(1) }}</span>
              <span class="delta-base">{{ store.baselines[store.baselines.length - 1].analysis.ld.toFixed(1) }}</span>
            </div>
          </div>
        </div>

        <div v-else class="no-baseline">
          <p>No baseline saved yet.</p>
          <p>Go back to a previous step and click <strong>Save as Baseline</strong> to save your current foil for comparison.</p>
          <button class="btn btn-apply baseline-save-btn" @click="store.saveBaseline()">
            Save current as baseline
          </button>
        </div>
      </div>

    </div>

    <!-- Navigation footer -->
    <div class="nav-footer">
      <button
        v-if="currentStep > 1"
        class="btn-nav btn-back"
        @click="goBack"
      >Back</button>
      <div class="nav-spacer"></div>
      <button
        v-if="currentStep < 5"
        class="btn-nav btn-next"
        @click="goNext"
      >Next</button>
      <div v-if="currentStep === 5" class="step-complete">You're all set!</div>
      <button class="exit-link" @click="store.guidedMode = false">Exit Guided Mode</button>
    </div>

  </div>
</template>

<style scoped>
/* ── Outer shell ──────────────────────────────────────────────────────────── */
.guided-mode {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0d0d1a;
  color: #ccc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
}

/* ── Progress bar ─────────────────────────────────────────────────────────── */
.progress-bar {
  flex-shrink: 0;
  padding: 16px 20px 10px;
  border-bottom: 1px solid #1e1e3a;
  background: #111127;
}

.steps-track {
  display: flex;
  align-items: center;
  gap: 0;
}

.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #333;
  border: 2px solid #444;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s, border-color 0.2s;
  position: relative;
  z-index: 1;
}

.step-dot.filled {
  background: #00d4ff;
  border-color: #00d4ff;
}

.step-dot.current {
  box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.25);
}

.dot-number {
  font-size: 11px;
  font-weight: 700;
  color: #0d0d1a;
  line-height: 1;
}

.step-dot:not(.filled) .dot-number {
  color: #666;
}

.step-connector {
  flex: 1;
  height: 2px;
  background: #333;
  transition: background 0.2s;
}

.step-connector.filled {
  background: #00d4ff;
}

.step-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
}

.step-label {
  font-size: 10px;
  color: #555;
  text-align: center;
  width: 28px;
  flex-shrink: 0;
  white-space: nowrap;
  transform: translateX(-50%);
  margin-left: 14px;
  transition: color 0.2s;
}

.step-label:first-child {
  margin-left: 0;
  transform: none;
}

.step-label:last-child {
  transform: translateX(-100%);
}

.step-label.active {
  color: #00d4ff;
  font-weight: 600;
}

/* ── Step content ─────────────────────────────────────────────────────────── */
.step-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scrollbar-width: thin;
  scrollbar-color: #333 transparent;
}

.step-content::-webkit-scrollbar { width: 6px; }
.step-content::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

.step-pane {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.step-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 0;
  line-height: 1.2;
}

.step-desc {
  font-size: 14px;
  color: #888;
  margin: 0;
  line-height: 1.5;
}

/* ── Step 1: Library ──────────────────────────────────────────────────────── */
.library-wrapper {
  flex: 1;
  min-height: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #1e1e3a;
}

/* ── Step 2: Form ─────────────────────────────────────────────────────────── */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #bbb;
}

.form-input {
  background: #1a1a2e;
  border: 1px solid #2a2a4e;
  border-radius: 6px;
  color: #ccc;
  font-size: 15px;
  font-family: inherit;
  padding: 10px 12px;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
}

.form-input:focus {
  border-color: #00d4ff55;
}

.form-input option {
  background: #1a1a2e;
}

/* ── Step 3: Performance ──────────────────────────────────────────────────── */
.perf-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.perf-big-card {
  background: #1a1a2e;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.perf-big-card.wide {
  grid-column: span 2;
}

.perf-big-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #666;
  font-weight: 600;
}

.perf-big-value {
  font-size: 26px;
  font-weight: 700;
  color: #fff;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.perf-big-value.perf-character {
  font-size: 16px;
  color: #ccc;
  font-weight: 500;
}

.perf-big-unit {
  font-size: 14px;
  font-weight: 400;
  color: #888;
  margin-left: 2px;
}

.stability-badge {
  display: inline-block;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 4px 12px;
  border-radius: 999px;
  align-self: flex-start;
}

.stability-badge.high {
  background: rgba(107, 203, 119, 0.2);
  color: #6bcb77;
  border: 1px solid #6bcb7755;
}

.stability-badge.medium {
  background: rgba(255, 217, 61, 0.2);
  color: #ffd93d;
  border: 1px solid #ffd93d55;
}

.stability-badge.low {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
  border: 1px solid #ff6b6b55;
}

.loading-text {
  color: #555;
  font-size: 14px;
  text-align: center;
  padding: 32px 0;
}

.details-toggle {
  background: transparent;
  border: 1px solid #333;
  border-radius: 6px;
  color: #888;
  font-size: 13px;
  font-family: inherit;
  padding: 8px 16px;
  cursor: pointer;
  align-self: flex-start;
  transition: border-color 0.15s, color 0.15s;
}

.details-toggle:hover {
  border-color: #555;
  color: #bbb;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.detail-item {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 14px 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.detail-value {
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.detail-sub {
  font-size: 10px;
  color: #555;
}

/* ── Step 4: Improvements ─────────────────────────────────────────────────── */
.goal-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.goal-chip {
  padding: 8px 16px;
  border-radius: 999px;
  border: none;
  background: #1a1a2e;
  color: #aaa;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  border: 1px solid #2a2a4e;
}

.goal-chip:hover {
  background: #222244;
  color: #fff;
}

.goal-chip.active {
  background: #00d4ff;
  color: #0d0d1a;
  font-weight: 700;
  border-color: #00d4ff;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.suggestion-card {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-title {
  font-weight: 700;
  color: #fff;
  font-size: 14px;
  flex: 1;
}

.impact-badge {
  font-size: 11px;
  font-weight: 600;
  border: 1px solid;
  border-radius: 4px;
  padding: 2px 8px;
  white-space: nowrap;
  flex-shrink: 0;
  text-transform: capitalize;
}

.card-desc {
  color: #999;
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
}

.card-actions {
  display: flex;
  gap: 8px;
}

/* ── Navigation footer ────────────────────────────────────────────────────── */
.nav-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid #1e1e3a;
  background: #111127;
}

.nav-spacer {
  flex: 1;
}

.btn-nav {
  font-size: 14px;
  font-family: inherit;
  padding: 9px 22px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.btn-back {
  background: transparent;
  border: 1px solid #444;
  color: #aaa;
}

.btn-back:hover {
  border-color: #666;
  color: #ccc;
}

.btn-next {
  background: #00d4ff;
  border: 1px solid #00d4ff;
  color: #0d0d1a;
}

.btn-next:hover {
  background: #33ddff;
  border-color: #33ddff;
}

.step-complete {
  font-size: 14px;
  color: #6bcb77;
  font-weight: 600;
}

.exit-link {
  background: transparent;
  border: none;
  color: #555;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 0.15s;
  margin-left: 8px;
}

.exit-link:hover {
  color: #888;
}

/* ── Shared buttons ───────────────────────────────────────────────────────── */
.btn {
  font-size: 12px;
  font-family: inherit;
  padding: 6px 14px;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, opacity 0.15s;
  font-weight: 500;
}

.btn-preview {
  background: transparent;
  border: 1px solid #00d4ff;
  color: #00d4ff;
}

.btn-preview:hover {
  background: rgba(0, 212, 255, 0.12);
}

.btn-apply {
  background: #00d4ff;
  border: 1px solid #00d4ff;
  color: #0d0d1a;
  font-weight: 700;
}

.btn-apply:hover {
  background: #33ddff;
}

.btn-dismiss {
  background: transparent;
  border: 1px solid #555;
  color: #888;
}

.btn-dismiss:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #bbb;
}

/* ── Step 5: Compare ──────────────────────────────────────────────────────── */
.compare-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.overlay-wrapper {
  width: 100%;
  aspect-ratio: 3 / 1.5;
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
}

.overlay-legend {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #888;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-swatch {
  display: inline-block;
  width: 22px;
  height: 2px;
}

.legend-swatch.solid {
  background: #00d4ff;
}

.legend-swatch.dashed {
  background: repeating-linear-gradient(
    to right,
    #ffd93d 0px,
    #ffd93d 6px,
    transparent 6px,
    transparent 10px
  );
}

.delta-compare {
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
}

.delta-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 10px 14px;
  gap: 8px;
  font-size: 13px;
  border-bottom: 1px solid #0d0d1a;
}

.delta-row:last-child {
  border-bottom: none;
}

.delta-header-row {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #555;
  padding: 8px 14px;
}

.delta-metric {
  font-weight: 600;
  color: #bbb;
}

.delta-current {
  color: #00d4ff;
  font-variant-numeric: tabular-nums;
}

.delta-base {
  color: #aaa;
  font-variant-numeric: tabular-nums;
}

.no-baseline {
  background: #1a1a2e;
  border-radius: 10px;
  padding: 28px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.no-baseline p {
  font-size: 14px;
  color: #888;
  margin: 0;
  line-height: 1.5;
}

.no-baseline strong {
  color: #ccc;
}

.baseline-save-btn {
  margin-top: 6px;
  font-size: 13px;
  padding: 10px 20px;
}

.empty-state {
  color: #555;
  font-size: 13px;
  text-align: center;
  padding: 28px 0;
}
</style>
