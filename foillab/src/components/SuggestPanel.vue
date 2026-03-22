<script setup lang="ts">
import { ref } from 'vue'
import { useFoilStore } from '../stores/foilStore'
import type { Suggestion, OptimizationGoal } from '../types/foil'

const store = useFoilStore()
const activeGoal = ref<OptimizationGoal>('max-ld')
const suggestions = ref<Suggestion[]>([])
const previewingId = ref<string | null>(null)

const goals: Array<{ value: OptimizationGoal; label: string }> = [
  { value: 'max-ld', label: 'Max L/D' },
  { value: 'max-lift', label: 'Max Lift' },
  { value: 'min-drag', label: 'Min Drag' },
  { value: 'stability', label: 'Stability' },
  { value: 'early-takeoff', label: 'Early Takeoff' },
]

const impactColors: Record<string, string> = {
  high: '#6bcb77',
  medium: '#ffd93d',
  low: '#888888',
}

const impactBorderColors: Record<string, string> = {
  high: '#6bcb77',
  medium: '#ffd93d',
  low: '#555555',
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

function dismiss() {
  store.previewProfile = null
  previewingId.value = null
}

function apply(s: Suggestion) {
  store.applySuggestion(s)
  store.previewProfile = null
  previewingId.value = null
  suggestions.value = store.getSuggestions(activeGoal.value)
}

// Load initial suggestions
selectGoal('max-ld')
</script>

<template>
  <div class="suggest-panel">
    <div class="goal-row">
      <button
        v-for="g in goals"
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
        :style="{ borderLeftColor: impactBorderColors[s.impact] }"
      >
        <div class="card-header">
          <span class="card-title">{{ s.title }}</span>
          <span
            class="impact-badge"
            :style="{ color: impactColors[s.impact], borderColor: impactColors[s.impact] }"
          >
            {{ s.impact.charAt(0).toUpperCase() + s.impact.slice(1) }}
          </span>
        </div>
        <p class="card-description">{{ s.description }}</p>
        <div class="card-actions">
          <template v-if="previewingId === s.id">
            <button class="btn btn-dismiss" @click="dismiss">Dismiss</button>
          </template>
          <template v-else>
            <button class="btn btn-preview" @click="preview(s)">Preview</button>
          </template>
          <button class="btn btn-apply" @click="apply(s)">Apply</button>
        </div>
      </div>

      <div v-if="suggestions.length === 0" class="empty-state">
        No suggestions available for this goal.
      </div>
    </div>
  </div>
</template>

<style scoped>
.suggest-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 12px;
  gap: 12px;
}

.goal-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex-shrink: 0;
}

.goal-chip {
  padding: 5px 12px;
  border-radius: 999px;
  border: none;
  background: #333;
  color: #ccc;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.goal-chip:hover {
  background: #444;
  color: #fff;
}

.goal-chip.active {
  background: #00d4ff;
  color: #0d0d1a;
  font-weight: 600;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  flex: 1;
}

.suggestion-card {
  background: #1a1a2e;
  border-left: 3px solid #555;
  border-radius: 0 6px 6px 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  font-size: 13px;
  flex: 1;
}

.impact-badge {
  font-size: 11px;
  font-weight: 600;
  border: 1px solid;
  border-radius: 4px;
  padding: 1px 6px;
  white-space: nowrap;
  flex-shrink: 0;
}

.card-description {
  color: #999;
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
}

.card-actions {
  display: flex;
  gap: 6px;
}

.btn {
  font-size: 11px;
  font-family: inherit;
  padding: 4px 10px;
  border-radius: 4px;
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
  font-weight: 600;
}

.btn-apply:hover {
  background: #33ddff;
}

.btn-dismiss {
  background: transparent;
  border: 1px solid #666;
  color: #aaa;
}

.btn-dismiss:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #ccc;
}

.empty-state {
  color: #555;
  font-size: 13px;
  text-align: center;
  padding: 24px 0;
}
</style>
