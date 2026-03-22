<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  cpUpper: Array<{ x: number; cp: number }>
  cpLower: Array<{ x: number; cp: number }>
}>()

// Chart layout constants
const chartLeft = 40
const chartRight = 280
const chartTop = 10
const chartBottom = 180

// X-axis: x/c from 0 to 1
// Y-axis: -Cp, positive up means suction; range approx -1 to 3
const xMin = 0
const xMax = 1
const ncpMin = -1   // -Cp min (negative means pressure, bottom of chart)
const ncpMax = 3    // -Cp max (strong suction, top of chart)

function xPos(xc: number): number {
  return chartLeft + (xc - xMin) / (xMax - xMin) * (chartRight - chartLeft)
}

function yPos(ncp: number): number {
  return chartBottom - (ncp - ncpMin) / (ncpMax - ncpMin) * (chartBottom - chartTop)
}

// Generate SVG path from data array, mapping cp → -cp for y axis
function makeLinePath(data: Array<{ x: number; cp: number }>): string {
  if (data.length === 0) return ''
  return data
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xPos(pt.x).toFixed(2)} ${yPos(-pt.cp).toFixed(2)}`)
    .join(' ')
}

// Generate a filled area path between upper and lower -Cp curves
// Trace upper forward, lower backward, close the path
const shadedAreaPath = computed(() => {
  const upper = props.cpUpper
  const lower = props.cpLower
  if (upper.length === 0 && lower.length === 0) return ''

  const upperParts = upper.map((pt, i) =>
    `${i === 0 ? 'M' : 'L'} ${xPos(pt.x).toFixed(2)} ${yPos(-pt.cp).toFixed(2)}`
  )
  const lowerReversed = [...lower].reverse().map(pt =>
    `L ${xPos(pt.x).toFixed(2)} ${yPos(-pt.cp).toFixed(2)}`
  )
  return [...upperParts, ...lowerReversed, 'Z'].join(' ')
})

const upperPath = computed(() => makeLinePath(props.cpUpper))
const lowerPath = computed(() => makeLinePath(props.cpLower))

// Grid lines
const vertGridLines = [0, 0.2, 0.4, 0.6, 0.8, 1.0]
const horizGridLines = [-1, 0, 1, 2, 3]

const xcTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0]
const ncpTicks = [-1, 0, 1, 2, 3]
</script>

<template>
  <svg
    viewBox="0 0 300 200"
    preserveAspectRatio="xMidYMid meet"
    class="pressure-chart"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Background -->
    <rect x="0" y="0" width="300" height="200" fill="#0a0a18" />

    <!-- Grid lines (vertical) -->
    <line
      v-for="xc in vertGridLines"
      :key="'vg' + xc"
      :x1="xPos(xc)"
      :y1="chartTop"
      :x2="xPos(xc)"
      :y2="chartBottom"
      stroke="#1a1a2e"
      stroke-width="1"
    />

    <!-- Grid lines (horizontal) -->
    <line
      v-for="ncp in horizGridLines"
      :key="'hg' + ncp"
      :x1="chartLeft"
      :y1="yPos(ncp)"
      :x2="chartRight"
      :y2="yPos(ncp)"
      stroke="#1a1a2e"
      stroke-width="1"
    />

    <!-- Zero -Cp line -->
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

    <!-- X tick marks and labels -->
    <template v-for="xc in xcTicks" :key="'xtick' + xc">
      <line
        :x1="xPos(xc)"
        :y1="chartBottom"
        :x2="xPos(xc)"
        :y2="chartBottom + 3"
        stroke="#444"
        stroke-width="1"
      />
      <text
        :x="xPos(xc)"
        :y="chartBottom + 10"
        text-anchor="middle"
        fill="#666"
        font-size="7"
        font-family="monospace"
      >{{ xc.toFixed(1) }}</text>
    </template>

    <!-- -Cp tick marks and labels -->
    <template v-for="ncp in ncpTicks" :key="'ytick' + ncp">
      <line
        :x1="chartLeft - 3"
        :y1="yPos(ncp)"
        :x2="chartLeft"
        :y2="yPos(ncp)"
        stroke="#444"
        stroke-width="1"
      />
      <text
        :x="chartLeft - 5"
        :y="yPos(ncp) + 2.5"
        text-anchor="end"
        fill="#666"
        font-size="7"
        font-family="monospace"
      >{{ ncp }}</text>
    </template>

    <!-- Axis labels -->
    <text
      :x="(chartLeft + chartRight) / 2"
      :y="chartBottom + 22"
      text-anchor="middle"
      fill="#888"
      font-size="7"
      font-family="monospace"
    >x/c</text>

    <text
      x="8"
      :y="(chartTop + chartBottom) / 2"
      text-anchor="middle"
      fill="#888"
      font-size="7"
      font-family="monospace"
      transform="rotate(-90, 8, 95)"
    >−Cp</text>

    <!-- Shaded area between curves -->
    <path
      v-if="shadedAreaPath"
      :d="shadedAreaPath"
      fill="#00d4ff"
      fill-opacity="0.05"
      stroke="none"
    />

    <!-- Lower surface curve (red) -->
    <path
      v-if="lowerPath"
      :d="lowerPath"
      fill="none"
      stroke="#ff6b6b"
      stroke-width="1.5"
    />

    <!-- Upper surface curve (cyan) -->
    <path
      v-if="upperPath"
      :d="upperPath"
      fill="none"
      stroke="#00d4ff"
      stroke-width="1.5"
    />

    <!-- Legend -->
    <line x1="200" y1="20" x2="216" y2="20" stroke="#00d4ff" stroke-width="1.5" />
    <text x="218" y="23" fill="#666" font-size="7" font-family="monospace">Upper</text>
    <line x1="200" y1="30" x2="216" y2="30" stroke="#ff6b6b" stroke-width="1.5" />
    <text x="218" y="33" fill="#666" font-size="7" font-family="monospace">Lower</text>
  </svg>
</template>

<style scoped>
.pressure-chart {
  width: 100%;
  height: 100%;
  background: #0a0a18;
}
</style>
