<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFoilStore } from '../stores/foilStore'
import FoilOverlay from './charts/FoilOverlay.vue'
import FoilLibrary from './FoilLibrary.vue'
import { computeThicknessRatio, computeMaxCamber, detectSelfIntersection } from '../composables/useFoilGeometry'
import type { FoilProfile, BezierPoint } from '../types/foil'

const store = useFoilStore()

// ── Local state ──────────────────────────────────────────────────────────────
const selectedIdx = ref(-1)
const selectedSurface = ref<'upper' | 'lower'>('upper')

// Drag state
const isDragging = ref(false)
const dragSurface = ref<'upper' | 'lower'>('upper')
const dragIndex = ref(-1)
const workingProfile = ref<FoilProfile | null>(null)

// Tooltip
const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
const tooltipCoords = ref({ x: 0, y: 0 })

// Constraints
const snapToGrid = ref(false)
const mirrorSymmetry = ref(true)
const showCamberLine = ref(false)

// SVG ref
const svgContainerRef = ref<HTMLDivElement | null>(null)

// ── Helpers ──────────────────────────────────────────────────────────────────
function getSvgEl(): SVGSVGElement | null {
  return svgContainerRef.value?.querySelector('svg') ?? null
}

function mouseToSvg(event: MouseEvent, svgEl: SVGSVGElement): { x: number; y: number } {
  const ctm = svgEl.getScreenCTM()!
  return {
    x: (event.clientX - ctm.e) / ctm.a,
    y: (event.clientY - ctm.f) / ctm.d,
  }
}

function snap(v: number): number {
  return snapToGrid.value ? Math.round(v / 0.01) * 0.01 : v
}

function cloneProfile(p: FoilProfile): FoilProfile {
  return JSON.parse(JSON.stringify(p))
}

// ── Status bar computations ──────────────────────────────────────────────────
const thicknessRatioPct = computed(() =>
  (computeThicknessRatio(store.profile) * 100).toFixed(1)
)
const camberPct = computed(() =>
  (computeMaxCamber(store.profile) * 100).toFixed(2)
)
const pointCount = computed(() =>
  store.profile.upper.length + store.profile.lower.length
)

// Store bound references so we can remove the exact same listener
const boundMouseMove = (e: MouseEvent) => onWindowMouseMove(e)
const boundMouseUp = () => onWindowMouseUp()

// ── Drag / select tool ───────────────────────────────────────────────────────
function onPointMouseDown(index: number, surface: 'upper' | 'lower', _event: MouseEvent) {
  if (store.editorTool === 'delete-point') return // handled in pointClick
  if (store.editorTool !== 'select') return

  selectedIdx.value = index
  selectedSurface.value = surface
  isDragging.value = true
  dragIndex.value = index
  dragSurface.value = surface
  workingProfile.value = cloneProfile(store.profile)

  window.addEventListener('mousemove', boundMouseMove)
  window.addEventListener('mouseup', boundMouseUp)
}

function onWindowMouseMove(event: MouseEvent) {
  if (!isDragging.value || !workingProfile.value) return

  const svgEl = getSvgEl()
  if (!svgEl) return

  const svgCoords = mouseToSvg(event, svgEl)
  const profileX = snap(Math.max(0, Math.min(1, svgCoords.x)))
  const profileY = snap(-svgCoords.y)

  const surface = workingProfile.value[dragSurface.value]
  const pt = surface[dragIndex.value]

  // Enforce min thickness constraint before updating
  const otherSurface = dragSurface.value === 'upper' ? 'lower' : 'upper'
  const otherPts = workingProfile.value[otherSurface]
  const nearest = otherPts.reduce((best: BezierPoint, p: BezierPoint) =>
    Math.abs(p.x - profileX) < Math.abs(best.x - profileX) ? p : best
  )

  let newY = profileY
  if (dragSurface.value === 'upper') {
    newY = Math.max(nearest.y + 0.005, newY)
  } else {
    newY = Math.min(nearest.y - 0.005, newY)
  }

  pt.x = profileX
  pt.y = newY

  // Mirror symmetry: mirror across chord line (y=0)
  if (mirrorSymmetry.value) {
    const mirroredSurface = workingProfile.value[otherSurface]
    if (dragIndex.value < mirroredSurface.length) {
      mirroredSurface[dragIndex.value].x = profileX
      mirroredSurface[dragIndex.value].y = -newY
    }
  }

  // Show the in-progress drag via previewProfile (doesn't touch undo stack)
  store.previewProfile = cloneProfile(workingProfile.value)

  // Show tooltip
  tooltipVisible.value = true
  tooltipX.value = event.clientX + 14
  tooltipY.value = event.clientY - 28
  tooltipCoords.value = { x: profileX, y: newY }
}

function onWindowMouseUp() {
  window.removeEventListener('mousemove', boundMouseMove)
  window.removeEventListener('mouseup', boundMouseUp)

  if (!isDragging.value || !workingProfile.value) {
    isDragging.value = false
    return
  }

  const finalProfile = workingProfile.value

  // Now push to undo stack (single entry for the whole drag)
  store.updateProfile(finalProfile)

  if (detectSelfIntersection(finalProfile)) {
    store.selfIntersecting = true
  } else {
    store.selfIntersecting = false
    store.runAnalysis(store.aoa)
  }

  isDragging.value = false
  workingProfile.value = null
  store.previewProfile = null
  tooltipVisible.value = false
}

// ── Add point tool ───────────────────────────────────────────────────────────
function onSvgClick(event: MouseEvent) {
  if (store.editorTool !== 'add-point') return

  const svgEl = getSvgEl()
  if (!svgEl) return

  const svgCoords = mouseToSvg(event, svgEl)
  const px = snap(Math.max(0, Math.min(1, svgCoords.x)))
  const py = snap(-svgCoords.y)

  // Find which surface (upper or lower) and where to insert
  const profile = cloneProfile(store.profile)
  let bestSurface: 'upper' | 'lower' = 'upper'
  let bestSegIdx = 0
  let bestDist = Infinity

  for (const surfaceName of ['upper', 'lower'] as const) {
    const pts = profile[surfaceName]
    for (let i = 0; i < pts.length - 1; i++) {
      // Distance from click to line segment
      const ax = pts[i].x, ay = -pts[i].y
      const bx = pts[i + 1].x, by = -pts[i + 1].y
      const abx = bx - ax, aby = by - ay
      const len2 = abx * abx + aby * aby
      if (len2 === 0) continue
      const t = Math.max(0, Math.min(1, ((svgCoords.x - ax) * abx + (svgCoords.y - ay) * aby) / len2))
      const closestX = ax + t * abx
      const closestY = ay + t * aby
      const dx = svgCoords.x - closestX
      const dy = svgCoords.y - closestY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < bestDist) {
        bestDist = dist
        bestSurface = surfaceName
        bestSegIdx = i
      }
    }
  }

  const surface = profile[bestSurface]
  const prevPt = surface[bestSegIdx]
  const nextPt = surface[bestSegIdx + 1]

  // Approximate tangent-based handles for the new point
  const tx = (nextPt.x - prevPt.x) / 3
  const ty = (nextPt.y - prevPt.y) / 3

  const newPt: BezierPoint = {
    x: px,
    y: py,
    handleIn: { dx: -tx, dy: -ty },
    handleOut: { dx: tx, dy: ty },
  }

  surface.splice(bestSegIdx + 1, 0, newPt)
  store.updateProfile(profile)

  if (detectSelfIntersection(profile)) {
    store.selfIntersecting = true
  } else {
    store.selfIntersecting = false
    store.runAnalysis(store.aoa)
  }
}

// ── Delete point tool ────────────────────────────────────────────────────────
function onPointClick(index: number, surface: 'upper' | 'lower') {
  if (store.editorTool !== 'delete-point') return

  const profile = cloneProfile(store.profile)
  const pts = profile[surface]
  if (pts.length <= 3) return // min 3 points per surface

  pts.splice(index, 1)
  store.updateProfile(profile)

  if (detectSelfIntersection(profile)) {
    store.selfIntersecting = true
  } else {
    store.selfIntersecting = false
    store.runAnalysis(store.aoa)
  }

  if (selectedSurface.value === surface && selectedIdx.value === index) {
    selectedIdx.value = -1
  }
}
</script>

<template>
  <div class="foil-editor">
    <!-- ── Header: mode toggle ─────────────────────────────────────────────── -->
    <div class="editor-header">
      <button
        class="mode-btn"
        :class="{ active: store.editorMode === 'draw' }"
        @click="store.editorMode = 'draw'"
      >
        Draw
      </button>
      <button
        class="mode-btn"
        :class="{ active: store.editorMode === 'library' }"
        @click="store.editorMode = 'library'"
      >
        Library
      </button>
    </div>

    <!-- ── Draw mode ──────────────────────────────────────────────────────── -->
    <template v-if="store.editorMode === 'draw'">
      <!-- Toolbar -->
      <div class="toolbar">
        <button
          class="tool-btn"
          :class="{ active: store.editorTool === 'select' }"
          @click="store.editorTool = 'select'"
          title="Select & drag points"
        >
          Select
        </button>
        <button
          class="tool-btn"
          :class="{ active: store.editorTool === 'add-point' }"
          @click="store.editorTool = 'add-point'"
          title="Add point to surface"
        >
          Add Point
        </button>
        <button
          class="tool-btn"
          :class="{ active: store.editorTool === 'delete-point' }"
          @click="store.editorTool = 'delete-point'"
          title="Delete a control point"
        >
          Delete Point
        </button>

        <div class="toolbar-sep" />

        <button
          class="tool-btn"
          data-testid="undo-btn"
          :disabled="!store.canUndo"
          @click="store.undo()"
          title="Undo"
        >
          Undo
        </button>
        <button
          class="tool-btn"
          @click="store.resetProfile()"
          title="Reset to default NACA profile"
        >
          Reset
        </button>
      </div>

      <!-- SVG canvas -->
      <div
        ref="svgContainerRef"
        class="canvas-wrapper"
        @click="onSvgClick"
      >
        <FoilOverlay
          :profile="isDragging && store.previewProfile ? store.previewProfile : store.profile"
          :showControlPoints="true"
          :ghostProfile="!isDragging && store.previewProfile ? store.previewProfile : undefined"
          :selectedPointIndex="selectedIdx"
          :selectedSurface="selectedSurface"
          :showChordLine="true"
          :showGrid="true"
          @pointMouseDown="onPointMouseDown"
          @pointClick="onPointClick"
        />
      </div>

      <!-- Constraints -->
      <div class="constraints-row">
        <label class="constraint-label">
          <input type="checkbox" v-model="snapToGrid" />
          Snap to grid
        </label>
        <label class="constraint-label">
          <input type="checkbox" v-model="mirrorSymmetry" />
          Mirror symmetry
        </label>
        <label class="constraint-label">
          <input type="checkbox" v-model="showCamberLine" />
          Show camber line
        </label>
      </div>

      <!-- Self-intersection warning -->
      <div v-if="store.selfIntersecting" class="self-intersect-warning">
        ⚠ Self-intersecting profile — fix to see analysis
      </div>

      <!-- Status bar -->
      <div class="status-bar">
        <span class="status-item">Chord: 1.00</span>
        <span class="status-sep">|</span>
        <span class="status-item">Thickness: {{ thicknessRatioPct }}%</span>
        <span class="status-sep">|</span>
        <span class="status-item">Camber: {{ camberPct }}%</span>
        <span class="status-sep">|</span>
        <span class="status-item">Points: {{ pointCount }}</span>
      </div>
    </template>

    <!-- ── Library mode ───────────────────────────────────────────────────── -->
    <template v-else>
      <FoilLibrary />
    </template>
  </div>

  <!-- ── Coordinate tooltip (teleported to body to avoid clipping) ─────────── -->
  <Teleport to="body">
    <div
      v-if="tooltipVisible"
      class="coord-tooltip"
      :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
    >
      x: {{ tooltipCoords.x.toFixed(3) }}, y: {{ tooltipCoords.y.toFixed(3) }}
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────── */
.foil-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0d0d1a;
  overflow: hidden;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.editor-header {
  display: flex;
  gap: 2px;
  padding: 6px 8px;
  background: #1a1a2e;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}

.mode-btn {
  padding: 4px 16px;
  background: transparent;
  border: 1px solid #333;
  border-radius: 4px;
  color: #888;
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.15s;
}
.mode-btn:hover { border-color: #555; color: #aaa; }
.mode-btn.active { border-color: #00d4ff; color: #00d4ff; }

/* ── Toolbar ─────────────────────────────────────────────────────────────── */
.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: #111122;
  border-bottom: 1px solid #2a2a3e;
  flex-shrink: 0;
}

.tool-btn {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid #333;
  border-radius: 3px;
  color: #888;
  font-size: 0.8em;
  cursor: pointer;
  transition: all 0.15s;
}
.tool-btn:hover:not(:disabled) { border-color: #555; color: #aaa; }
.tool-btn.active { border-color: #00d4ff; color: #00d4ff; }
.tool-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.toolbar-sep {
  width: 1px;
  height: 20px;
  background: #333;
  margin: 0 4px;
  flex-shrink: 0;
}

/* ── Canvas ──────────────────────────────────────────────────────────────── */
.canvas-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
  cursor: crosshair;
}

/* ── Constraints ─────────────────────────────────────────────────────────── */
.constraints-row {
  display: flex;
  gap: 16px;
  padding: 6px 10px;
  background: #111122;
  border-top: 1px solid #2a2a3e;
  flex-shrink: 0;
}

.constraint-label {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #888;
  font-size: 0.8em;
  cursor: pointer;
  user-select: none;
}
.constraint-label input[type="checkbox"] {
  accent-color: #00d4ff;
  cursor: pointer;
}

/* ── Self-intersection warning ───────────────────────────────────────────── */
.self-intersect-warning {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  background: #332200;
  border-top: 1px solid #554400;
  color: #ffd93d;
  font-size: 0.78em;
  flex-shrink: 0;
}

/* ── Status bar ──────────────────────────────────────────────────────────── */
.status-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: #1a1a2e;
  border-top: 1px solid #2a2a3e;
  flex-shrink: 0;
}

.status-item {
  color: #888;
  font-size: 0.78em;
  font-variant-numeric: tabular-nums;
}
.status-sep { color: #444; font-size: 0.78em; }

</style>

<!-- Tooltip is not scoped — rendered in body via Teleport -->
<style>
.coord-tooltip {
  position: fixed;
  pointer-events: none;
  background: #1a1a2eee;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 3px 8px;
  color: #00d4ff;
  font-size: 0.78em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  z-index: 9999;
}
</style>
