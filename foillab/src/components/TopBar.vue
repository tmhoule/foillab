<script setup lang="ts">
import { useFoilStore } from '../stores/foilStore'
const store = useFoilStore()
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <span class="topbar-title">FoilLab</span>
      <span class="topbar-subtitle">Windsurf Foil Analyzer</span>
    </div>
    <div class="topbar-right">
      <span class="topbar-label">Guided Mode</span>
      <label class="toggle">
        <input type="checkbox" v-model="store.guidedMode" />
        <span class="toggle-slider"></span>
      </label>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 48px;
  background: #1a1a2e;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}
.topbar-left { display: flex; align-items: center; gap: 12px; }
.topbar-title { font-size: 1.2em; font-weight: bold; color: #00d4ff; }
.topbar-subtitle { color: #666; font-size: 0.8em; }
.topbar-right { display: flex; align-items: center; gap: 12px; }
.topbar-label { color: #888; font-size: 0.85em; }
.toggle { position: relative; display: inline-block; width: 40px; height: 20px; }
.toggle input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute; cursor: pointer; inset: 0;
  background: #333; border-radius: 10px; transition: 0.2s;
}
.toggle-slider::before {
  content: ''; position: absolute; height: 16px; width: 16px;
  left: 2px; bottom: 2px; background: #888;
  border-radius: 50%; transition: 0.2s;
}
.toggle input:checked + .toggle-slider { background: #00d4ff33; }
.toggle input:checked + .toggle-slider::before { transform: translateX(20px); background: #00d4ff; }
</style>
