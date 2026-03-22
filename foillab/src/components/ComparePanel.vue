<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFoilStore } from '../stores/foilStore'
import { profileLibrary } from '../data/profiles'
import { solvePanelMethod } from '../composables/usePanelMethod'
import FoilOverlay from './charts/FoilOverlay.vue'
import type { FoilProfile, AnalysisResult } from '../types/foil'

const store = useFoilStore()
const selectedIdx = ref(-1)
const targetAnalysis = ref<AnalysisResult | null>(null)
const targetProfile = ref<FoilProfile | null>(null)

// Build options list: library entries + baselines
const options = computed(() => {
  const lib = profileLibrary.map((e, i) => ({ label: e.profile.name, idx: i, type: 'library' as const }))
  const baselines = store.baselines.map((b, i) => ({ label: b.name, idx: i, type: 'baseline' as const }))
  return [...lib, ...baselines]
})

function onSelect(optIdx: number) {
  const opt = options.value[optIdx]
  if (!opt) return
  if (opt.type === 'library') {
    targetProfile.value = profileLibrary[opt.idx].profile
    targetAnalysis.value = solvePanelMethod(targetProfile.value, store.aoa)
  } else {
    const b = store.baselines[opt.idx]
    targetProfile.value = b.profile
    targetAnalysis.value = b.analysis
  }
}

function onSelectChange(e: Event) {
  const val = parseInt((e.target as HTMLSelectElement).value)
  selectedIdx.value = val
  onSelect(val)
}

// Delta helpers
function delta(current: number, target: number): number {
  if (target === 0) return 0
  return ((current - target) / Math.abs(target)) * 100
}

// For CL and L/D: higher is better (positive delta = green)
// For CD: lower is better (negative delta = green)
function deltaColor(metric: 'cl' | 'cd' | 'ld', d: number): string {
  if (metric === 'cd') {
    return d < 0 ? '#6bcb77' : d > 0 ? '#ff6b6b' : '#888'
  }
  return d > 0 ? '#6bcb77' : d < 0 ? '#ff6b6b' : '#888'
}

const currentAnalysis = computed(() => store.analysis)

const rows = computed(() => {
  const cur = currentAnalysis.value
  const tgt = targetAnalysis.value
  if (!cur || !tgt) return null
  return [
    {
      metric: 'CL',
      current: cur.cl.toFixed(3),
      target: tgt.cl.toFixed(3),
      d: delta(cur.cl, tgt.cl),
      key: 'cl' as const,
    },
    {
      metric: 'CD',
      current: cur.cd.toFixed(4),
      target: tgt.cd.toFixed(4),
      d: delta(cur.cd, tgt.cd),
      key: 'cd' as const,
    },
    {
      metric: 'L/D',
      current: cur.ld.toFixed(1),
      target: tgt.ld.toFixed(1),
      d: delta(cur.ld, tgt.ld),
      key: 'ld' as const,
    },
  ]
})
</script>

<template>
  <div class="compare-panel">

    <!-- Save as baseline -->
    <section class="section">
      <button class="baseline-btn" @click="store.saveBaseline()">Save as Baseline</button>
      <div v-if="store.baselines.length > 0" class="baseline-count">
        {{ store.baselines.length }} baseline{{ store.baselines.length === 1 ? '' : 's' }} saved
      </div>
    </section>

    <!-- Comparison source selector -->
    <section class="section">
      <span class="section-title">Compare Against</span>
      <select class="compare-select" :value="selectedIdx" @change="onSelectChange">
        <option value="-1" disabled>— Select a profile or baseline —</option>
        <optgroup label="Library Profiles">
          <option v-for="(opt, i) in options.filter(o => o.type === 'library')" :key="'lib-' + i" :value="i">
            {{ opt.label }}
          </option>
        </optgroup>
        <optgroup v-if="store.baselines.length > 0" label="Saved Baselines">
          <option
            v-for="(opt, i) in options.filter(o => o.type === 'baseline')"
            :key="'base-' + i"
            :value="options.filter(o => o.type === 'library').length + i"
          >
            {{ opt.label }}
          </option>
        </optgroup>
      </select>
    </section>

    <!-- Shape overlay -->
    <section class="section">
      <span class="section-title">Shape Overlay</span>
      <div class="overlay-container">
        <FoilOverlay
          :profile="store.profile"
          :ghostProfile="targetProfile ?? undefined"
          :showControlPoints="false"
          :showGrid="true"
          :showChordLine="true"
        />
      </div>
      <div class="overlay-legend">
        <span class="legend-item"><span class="legend-swatch solid"></span>Current</span>
        <span class="legend-item" v-if="targetProfile"><span class="legend-swatch dashed"></span>Target</span>
      </div>
    </section>

    <!-- Performance delta table -->
    <section class="section" v-if="targetAnalysis">
      <span class="section-title">Performance Delta</span>
      <div class="delta-grid">
        <div class="delta-header">Metric</div>
        <div class="delta-header">Current</div>
        <div class="delta-header">Target</div>
        <div class="delta-header">Delta</div>
        <template v-if="rows" v-for="row in rows" :key="row.metric">
          <div class="delta-metric">{{ row.metric }}</div>
          <div class="delta-val current">{{ row.current }}</div>
          <div class="delta-val">{{ row.target }}</div>
          <div class="delta-val" :style="{ color: deltaColor(row.key, row.d) }">
            {{ row.d > 0 ? '+' : '' }}{{ row.d.toFixed(1) }}%
          </div>
        </template>
      </div>
      <div class="delta-note">Higher is better for CL, L/D. Lower is better for CD.</div>
    </section>

    <!-- Placeholder when no target selected -->
    <div v-if="!targetAnalysis" class="no-target">
      Select a profile or baseline above to compare.
    </div>

  </div>
</template>

<style scoped>
.compare-panel {
  height: 100%;
  overflow-y: auto;
  background: #0d0d1a;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: #ccc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
}

.section {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 12px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #888;
  margin-bottom: 8px;
  display: block;
}

/* Save as baseline button */
.baseline-btn {
  background: #006080;
  border: 1px solid #00d4ff55;
  border-radius: 6px;
  color: #00d4ff;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  transition: background 0.15s, border-color 0.15s;
  width: 100%;
}

.baseline-btn:hover {
  background: #007a9e;
  border-color: #00d4ff99;
}

.baseline-count {
  margin-top: 6px;
  font-size: 11px;
  color: #555;
  text-align: center;
}

/* Comparison selector */
.compare-select {
  background: #0d0d1a;
  border: 1px solid #2a2a4e;
  border-radius: 4px;
  color: #ccc;
  font-family: inherit;
  font-size: 12px;
  outline: none;
  padding: 6px 8px;
  transition: border-color 0.15s;
  width: 100%;
}

.compare-select:focus {
  border-color: #00d4ff55;
}

.compare-select option,
.compare-select optgroup {
  background: #1a1a2e;
  color: #ccc;
}

/* Shape overlay */
.overlay-container {
  width: 100%;
  aspect-ratio: 300 / 150;
  border-radius: 4px;
  overflow: hidden;
}

.overlay-legend {
  display: flex;
  gap: 16px;
  margin-top: 6px;
  font-size: 11px;
  color: #888;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-swatch {
  display: inline-block;
  width: 20px;
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

/* Performance delta table */
.delta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 4px 8px;
  align-items: center;
}

.delta-header {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #555;
  padding-bottom: 4px;
  border-bottom: 1px solid #2a2a4e;
}

.delta-metric {
  font-size: 12px;
  font-weight: 600;
  color: #aaa;
  padding: 3px 0;
}

.delta-val {
  font-size: 12px;
  color: #ccc;
  font-variant-numeric: tabular-nums;
  padding: 3px 0;
}

.delta-val.current {
  color: #00d4ff;
}

.delta-note {
  margin-top: 8px;
  font-size: 10px;
  color: #444;
  line-height: 1.4;
}

/* No target placeholder */
.no-target {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #444;
  font-size: 12px;
  text-align: center;
  padding: 24px;
}
</style>
