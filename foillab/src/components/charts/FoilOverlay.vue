<script setup lang="ts">
import { computed } from 'vue'
import type { FoilProfile } from '../../types/foil'
import { interpolateBezierCurve } from '../../composables/useFoilGeometry'

const props = withDefaults(defineProps<{
  profile: FoilProfile
  ghostProfile?: FoilProfile
  color?: string
  ghostColor?: string
  showControlPoints?: boolean
  selectedPointIndex?: number
  selectedSurface?: 'upper' | 'lower'
  showGrid?: boolean
  showChordLine?: boolean
}>(), {
  color: '#00d4ff',
  ghostColor: '#ffd93d',
  showControlPoints: false,
  selectedPointIndex: -1,
  showGrid: true,
  showChordLine: true,
})

const emit = defineEmits<{
  pointMouseDown: [index: number, surface: 'upper' | 'lower', event: MouseEvent]
  pointClick: [index: number, surface: 'upper' | 'lower']
}>()

function profileToPath(profile: FoilProfile, numSamples = 80): string {
  const upper = interpolateBezierCurve(profile.upper, numSamples)
  const lower = interpolateBezierCurve(profile.lower, numSamples)
  // Path: start at LE, trace upper surface to TE, then lower surface back to LE
  const pts = [...upper, ...lower.reverse()]
  if (pts.length === 0) return ''
  return 'M ' + pts.map(p => `${p.x.toFixed(4)} ${(-p.y).toFixed(4)}`).join(' L ') + ' Z'
}

const mainPath = computed(() => profileToPath(props.profile))
const ghostPath = computed(() => props.ghostProfile ? profileToPath(props.ghostProfile) : '')

// Selected point's bezier handles
const selectedPoint = computed(() => {
  if (props.selectedPointIndex < 0 || !props.selectedSurface) return null
  const surface = props.selectedSurface === 'upper' ? props.profile.upper : props.profile.lower
  const pt = surface[props.selectedPointIndex]
  if (!pt) return null
  return {
    x: pt.x, y: -pt.y,
    hInX: pt.x + pt.handleIn.dx, hInY: -(pt.y + pt.handleIn.dy),
    hOutX: pt.x + pt.handleOut.dx, hOutY: -(pt.y + pt.handleOut.dy),
  }
})
</script>

<template>
  <svg
    viewBox="0 -0.15 1 0.3"
    preserveAspectRatio="xMidYMid meet"
    class="foil-overlay"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Grid -->
    <template v-if="showGrid">
      <line v-for="i in 9" :key="'gv'+i" :x1="i*0.1" y1="-0.15" :x2="i*0.1" y2="0.15" stroke="#1a1a2e" stroke-width="0.001" />
      <line v-for="i in 5" :key="'gh'+i" :x1="0" :y1="-0.15 + i*0.06" :x2="1" :y2="-0.15 + i*0.06" stroke="#1a1a2e" stroke-width="0.001" />
    </template>

    <!-- Chord line -->
    <line v-if="showChordLine" x1="0" y1="0" x2="1" y2="0" stroke="#333" stroke-width="0.001" stroke-dasharray="0.01 0.005" />

    <!-- Ghost profile -->
    <path v-if="ghostPath" :d="ghostPath" fill="none" :stroke="ghostColor" stroke-width="0.003" stroke-dasharray="0.01 0.005" />

    <!-- Main profile -->
    <path :d="mainPath" :fill="color + '08'" :stroke="color" stroke-width="0.003" style="pointer-events: none" />

    <!-- Control points -->
    <template v-if="showControlPoints">
      <!-- Upper surface points -->
      <template v-for="(pt, i) in profile.upper" :key="'u'+i">
        <!-- Invisible larger hit area for easier grabbing -->
        <circle
          :cx="pt.x" :cy="-pt.y" r="0.02"
          fill="transparent"
          style="cursor: grab"
          @mousedown.prevent="emit('pointMouseDown', i, 'upper', $event)"
          @click.stop="emit('pointClick', i, 'upper')"
        />
        <!-- Visible dot -->
        <circle
          :cx="pt.x" :cy="-pt.y" r="0.008"
          fill="#ff6b6b" stroke="#fff" stroke-width="0.002"
          style="cursor: grab; pointer-events: none"
        />
      </template>
      <!-- Lower surface points -->
      <template v-for="(pt, i) in profile.lower" :key="'l'+i">
        <circle
          :cx="pt.x" :cy="-pt.y" r="0.02"
          fill="transparent"
          style="cursor: grab"
          @mousedown.prevent="emit('pointMouseDown', i, 'lower', $event)"
          @click.stop="emit('pointClick', i, 'lower')"
        />
        <circle
          :cx="pt.x" :cy="-pt.y" r="0.008"
          fill="#ff6b6b" stroke="#fff" stroke-width="0.002"
          style="cursor: grab; pointer-events: none"
        />
      </template>
    </template>

    <!-- Selected point handles -->
    <template v-if="selectedPoint">
      <line :x1="selectedPoint.hInX" :y1="selectedPoint.hInY" :x2="selectedPoint.x" :y2="selectedPoint.y"
            stroke="#ff6b6b55" stroke-width="0.002" />
      <line :x1="selectedPoint.x" :y1="selectedPoint.y" :x2="selectedPoint.hOutX" :y2="selectedPoint.hOutY"
            stroke="#ff6b6b55" stroke-width="0.002" />
      <circle :cx="selectedPoint.hInX" :cy="selectedPoint.hInY" r="0.005" fill="#ff6b6b88" />
      <circle :cx="selectedPoint.hOutX" :cy="selectedPoint.hOutY" r="0.005" fill="#ff6b6b88" />
    </template>
  </svg>
</template>

<style scoped>
.foil-overlay {
  width: 100%;
  height: 100%;
  background: #0a0a18;
}
</style>
