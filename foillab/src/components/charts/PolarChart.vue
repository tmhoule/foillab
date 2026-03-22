<script setup lang="ts">
import { computed } from 'vue'
import type { FoilProfile } from '../../types/foil'
import { computeThinAirfoilCL } from '../../composables/useThinAirfoil'

const props = defineProps<{
  currentAoA: number
  profile: FoilProfile
  converged?: boolean
}>()

// Chart layout constants
const chartLeft = 40
const chartRight = 280
const chartTop = 10
const chartBottom = 180

const aoaMin = -10
const aoaMax = 20
const clMin = -0.5
const clMax = 2.0

function xPos(aoa: number): number {
  return chartLeft + (aoa - aoaMin) / (aoaMax - aoaMin) * (chartRight - chartLeft)
}

function yPos(cl: number): number {
  return chartBottom - (cl - clMin) / (clMax - clMin) * (chartBottom - chartTop)
}

// Generate the CL curve path
const clCurve = computed(() => {
  const points: string[] = []
  for (let aoa = aoaMin; aoa <= aoaMax; aoa++) {
    const cl = computeThinAirfoilCL(props.profile, aoa)
    const x = xPos(aoa)
    const y = yPos(cl)
    points.push(`${points.length === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return points.join(' ')
})

// Current operating point
const currentCL = computed(() => computeThinAirfoilCL(props.profile, props.currentAoA))
const dotX = computed(() => xPos(props.currentAoA))
const dotY = computed(() => yPos(currentCL.value))

// Vertical grid lines: every 5 degrees
const vertGridLines = [-10, -5, 0, 5, 10, 15, 20]
// Horizontal grid lines: CL values
const horizGridLines = [-0.5, 0, 0.5, 1.0, 1.5, 2.0]
// AoA tick labels
const aoaTicks = [-10, -5, 0, 5, 10, 15, 20]
// CL tick labels
const clTicks = [-0.5, 0, 0.5, 1.0, 1.5, 2.0]
</script>

<template>
  <svg
    viewBox="0 0 300 200"
    preserveAspectRatio="xMidYMid meet"
    class="polar-chart"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Background -->
    <rect x="0" y="0" width="300" height="200" fill="#0a0a18" />

    <!-- Grid lines (vertical) -->
    <line
      v-for="aoa in vertGridLines"
      :key="'vg' + aoa"
      :x1="xPos(aoa)"
      :y1="chartTop"
      :x2="xPos(aoa)"
      :y2="chartBottom"
      stroke="#1a1a2e"
      stroke-width="1"
    />

    <!-- Grid lines (horizontal) -->
    <line
      v-for="cl in horizGridLines"
      :key="'hg' + cl"
      :x1="chartLeft"
      :y1="yPos(cl)"
      :x2="chartRight"
      :y2="yPos(cl)"
      stroke="#1a1a2e"
      stroke-width="1"
    />

    <!-- Zero line (CL=0) -->
    <line
      :x1="chartLeft"
      :y1="yPos(0)"
      :x2="chartRight"
      :y2="yPos(0)"
      stroke="#444"
      stroke-width="1"
      stroke-dasharray="4 3"
    />

    <!-- Axis lines -->
    <line :x1="chartLeft" :y1="chartTop" :x2="chartLeft" :y2="chartBottom" stroke="#444" stroke-width="1" />
    <line :x1="chartLeft" :y1="chartBottom" :x2="chartRight" :y2="chartBottom" stroke="#444" stroke-width="1" />

    <!-- AoA tick marks and labels -->
    <template v-for="aoa in aoaTicks" :key="'atick' + aoa">
      <line
        :x1="xPos(aoa)"
        :y1="chartBottom"
        :x2="xPos(aoa)"
        :y2="chartBottom + 3"
        stroke="#444"
        stroke-width="1"
      />
      <text
        :x="xPos(aoa)"
        :y="chartBottom + 10"
        text-anchor="middle"
        fill="#666"
        font-size="7"
        font-family="monospace"
      >{{ aoa }}°</text>
    </template>

    <!-- CL tick marks and labels -->
    <template v-for="cl in clTicks" :key="'ctick' + cl">
      <line
        :x1="chartLeft - 3"
        :y1="yPos(cl)"
        :x2="chartLeft"
        :y2="yPos(cl)"
        stroke="#444"
        stroke-width="1"
      />
      <text
        :x="chartLeft - 5"
        :y="yPos(cl) + 2.5"
        text-anchor="end"
        fill="#666"
        font-size="7"
        font-family="monospace"
      >{{ cl.toFixed(1) }}</text>
    </template>

    <!-- Axis labels -->
    <text
      :x="(chartLeft + chartRight) / 2"
      :y="chartBottom + 22"
      text-anchor="middle"
      fill="#888"
      font-size="7"
      font-family="monospace"
    >Angle of Attack (°)</text>

    <text
      x="8"
      :y="(chartTop + chartBottom) / 2"
      text-anchor="middle"
      fill="#888"
      font-size="7"
      font-family="monospace"
      transform="rotate(-90, 8, 95)"
    >CL</text>

    <!-- CL curve -->
    <path
      :d="clCurve"
      fill="none"
      stroke="#00d4ff"
      stroke-width="1.5"
    />

    <!-- Stall warning -->
    <text
      v-if="converged === false"
      :x="(chartLeft + chartRight) / 2"
      :y="chartTop + 12"
      text-anchor="middle"
      fill="#ff6b6b"
      font-size="7"
      font-family="monospace"
    >Stalled — results unreliable above this AoA</text>

    <!-- Current AoA marker (vertical dashed line) -->
    <line
      :x1="dotX"
      :y1="chartTop"
      :x2="dotX"
      :y2="chartBottom"
      stroke="#ff6b6b44"
      stroke-width="1"
      stroke-dasharray="3 3"
    />

    <!-- Current AoA red dot -->
    <circle
      :cx="dotX"
      :cy="dotY"
      r="4"
      fill="#ff6b6b"
      stroke="#fff"
      stroke-width="1"
    />
  </svg>
</template>

<style scoped>
.polar-chart {
  width: 100%;
  height: 100%;
  background: #0a0a18;
}
</style>
