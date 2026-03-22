<script setup lang="ts">
import { onMounted } from 'vue'
import { useFoilStore } from '../stores/foilStore'
import PolarChart from './charts/PolarChart.vue'
import PressureChart from './charts/PressureChart.vue'

const store = useFoilStore()

function onAoAChange(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  store.runAnalysis(val)
}

onMounted(() => {
  store.runAnalysis(store.aoa)
})
</script>

<template>
  <div class="analysis-panel">

    <!-- AoA Slider (sticky) -->
    <div class="aoa-sticky">
      <div class="section-header">
        <span class="section-title">Angle of Attack</span>
        <span class="aoa-label">{{ store.aoa.toFixed(1) }}°</span>
      </div>
      <input
        type="range"
        min="-10"
        max="20"
        step="0.5"
        :value="store.aoa"
        @input="onAoAChange"
        class="aoa-slider"
      />
      <div class="aoa-ticks">
        <span>-10°</span>
        <span>0°</span>
        <span>10°</span>
        <span>20°</span>
      </div>
    </div>

    <!-- Coefficient Cards -->
    <section class="section">
      <div class="coeff-grid">
        <div class="coeff-card">
          <div class="coeff-label" style="color: #00d4ff">CL</div>
          <div class="coeff-value" style="color: #00d4ff">
            {{ store.analysis ? store.analysis.cl.toFixed(3) : '—' }}
          </div>
          <div class="coeff-sub">Lift coefficient</div>
        </div>
        <div class="coeff-card">
          <div class="coeff-label" style="color: #ffd93d">CD</div>
          <div class="coeff-value" style="color: #ffd93d">
            {{ store.analysis ? store.analysis.cd.toFixed(4) : '—' }}
          </div>
          <div class="coeff-sub">Pressure drag only — total drag will be higher in practice.</div>
        </div>
        <div class="coeff-card">
          <div class="coeff-label" style="color: #6bcb77">L/D</div>
          <div class="coeff-value" style="color: #6bcb77">
            {{ store.analysis ? store.analysis.ld.toFixed(1) : '—' }}
          </div>
          <div class="coeff-sub">Optimistic estimate.</div>
        </div>
      </div>
    </section>

    <!-- CL vs AoA Polar Chart -->
    <section class="section">
      <div class="section-title">CL vs AoA Polar</div>
      <div class="chart-container">
        <PolarChart
          :currentAoA="store.aoa"
          :profile="store.profile"
          :converged="store.analysis?.converged"
        />
      </div>
    </section>

    <!-- Pressure Distribution -->
    <section class="section">
      <div class="section-title">Pressure Distribution</div>
      <div class="chart-container">
        <PressureChart
          :cpUpper="store.analysis?.cpUpper ?? []"
          :cpLower="store.analysis?.cpLower ?? []"
        />
      </div>
    </section>

    <!-- Rider Performance -->
    <section class="section" v-if="store.riderPerformance">
      <div class="section-title">Rider Performance</div>

      <div class="perf-row">
        <span class="perf-label">Speed</span>
        <span class="perf-range-text">
          {{ store.riderPerformance.speedRange[0] }}–{{ store.riderPerformance.speedRange[1] }} kts
        </span>
      </div>
      <div class="bar-track">
        <div
          class="bar-fill bar-speed"
          :style="{
            left: (store.riderPerformance.speedRange[0] / 40 * 100) + '%',
            width: ((store.riderPerformance.speedRange[1] - store.riderPerformance.speedRange[0]) / 40 * 100) + '%'
          }"
        ></div>
      </div>

      <div class="perf-row">
        <span class="perf-label">Wind</span>
        <span class="perf-range-text">
          {{ store.riderPerformance.windRange[0] }}–{{ store.riderPerformance.windRange[1] }} kts
        </span>
      </div>
      <div class="bar-track">
        <div
          class="bar-fill bar-wind"
          :style="{
            left: (store.riderPerformance.windRange[0] / 50 * 100) + '%',
            width: ((store.riderPerformance.windRange[1] - store.riderPerformance.windRange[0]) / 50 * 100) + '%'
          }"
        ></div>
      </div>

      <div class="perf-row">
        <span class="perf-label">Ideal weight</span>
        <span class="perf-range-text">
          {{ store.riderPerformance.idealWeight[0] }}–{{ store.riderPerformance.idealWeight[1] }} kg
        </span>
      </div>

      <div class="perf-row">
        <span class="perf-label">Character</span>
        <span class="perf-character">{{ store.riderPerformance.character }}</span>
      </div>

      <div class="perf-row">
        <span class="perf-label">Stability</span>
        <span
          class="stability-badge"
          :class="store.riderPerformance.stability"
        >
          {{ store.riderPerformance.stability }}
        </span>
      </div>
    </section>

    <!-- Settings -->
    <section class="section settings-section">
      <div class="section-header">
        <span class="section-title">Settings</span>
        <span class="settings-icon">⚙</span>
      </div>

      <div class="settings-grid">
        <label class="settings-label">Rider Weight (kg)</label>
        <input
          type="number"
          class="settings-input"
          :value="store.settings.riderWeight"
          @change="store.updateSettings({ riderWeight: parseFloat(($event.target as HTMLInputElement).value) })"
          min="30"
          max="200"
          step="1"
        />

        <label class="settings-label">Foil Area (m²)</label>
        <input
          type="number"
          class="settings-input"
          :value="store.settings.foilArea"
          @change="store.updateSettings({ foilArea: parseFloat(($event.target as HTMLInputElement).value) })"
          min="0.01"
          max="1"
          step="0.01"
        />

        <label class="settings-label">Water Type</label>
        <select
          class="settings-input"
          :value="store.settings.waterType"
          @change="store.updateSettings({ waterType: ($event.target as HTMLSelectElement).value as 'salt' | 'fresh' })"
        >
          <option value="salt">Salt</option>
          <option value="fresh">Fresh</option>
        </select>
      </div>
    </section>

  </div>
</template>

<style scoped>
.aoa-sticky {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #0d0d1a;
  padding-bottom: 8px;
  border-bottom: 1px solid #333;
  margin-bottom: 12px;
}
.analysis-panel {
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

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
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

.section-header .section-title {
  margin-bottom: 0;
}

/* AoA slider */
.aoa-label {
  font-size: 14px;
  font-weight: 700;
  color: #00d4ff;
  font-variant-numeric: tabular-nums;
}

.aoa-slider {
  width: 100%;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: #2a2a4e;
  outline: none;
  cursor: pointer;
  margin: 4px 0;
}

.aoa-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #00d4ff;
  cursor: pointer;
}

.aoa-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #00d4ff;
  cursor: pointer;
  border: none;
}

.aoa-ticks {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #555;
  margin-top: 2px;
}

/* Coefficient cards */
.coeff-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.coeff-card {
  background: #0d0d1a;
  border-radius: 6px;
  padding: 10px 6px;
  text-align: center;
}

.coeff-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 4px;
}

.coeff-value {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.coeff-sub {
  font-size: 9px;
  color: #555;
  margin-top: 4px;
  line-height: 1.3;
}

/* Charts */
.chart-container {
  width: 100%;
  aspect-ratio: 300 / 200;
}

/* Rider performance */
.perf-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  margin-top: 8px;
}

.perf-label {
  font-size: 11px;
  color: #888;
  min-width: 90px;
}

.perf-range-text {
  font-size: 12px;
  color: #ccc;
  font-variant-numeric: tabular-nums;
}

.perf-character {
  font-size: 11px;
  color: #aaa;
  text-align: right;
  flex: 1;
}

.bar-track {
  position: relative;
  height: 6px;
  background: #0d0d1a;
  border-radius: 3px;
  margin-bottom: 4px;
  overflow: hidden;
}

.bar-fill {
  position: absolute;
  height: 100%;
  border-radius: 3px;
}

.bar-speed {
  background: #00d4ff;
}

.bar-wind {
  background: #ffd93d;
}

.stability-badge {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: 10px;
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

/* Settings */
.settings-icon {
  color: #555;
  font-size: 14px;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 10px;
  align-items: center;
}

.settings-label {
  font-size: 11px;
  color: #888;
}

.settings-input {
  background: #0d0d1a;
  border: 1px solid #2a2a4e;
  border-radius: 4px;
  color: #ccc;
  font-size: 12px;
  padding: 4px 6px;
  width: 100%;
  outline: none;
  transition: border-color 0.15s;
}

.settings-input:focus {
  border-color: #00d4ff55;
}

.settings-input option {
  background: #1a1a2e;
}
</style>
