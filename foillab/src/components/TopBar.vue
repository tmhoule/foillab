<script setup lang="ts">
import { ref } from 'vue'
import { useFoilStore } from '../stores/foilStore'
const store = useFoilStore()

const fileInput = ref<HTMLInputElement | null>(null)

function exportProfile() {
  const data = store.exportProfile()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `foillab-${data.name.replace(/\s+/g, '-').toLowerCase()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importProfile() {
  fileInput.value?.click()
}

function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string)
      if (data.version === 1 && Array.isArray(data.upper) && Array.isArray(data.lower)) {
        store.importProfile(data)
      }
    } catch { /* ignore invalid JSON */ }
  }
  reader.readAsText(file)
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <span class="topbar-title">FoilLab</span>
      <span class="topbar-subtitle">Windsurf Foil Analyzer</span>
    </div>
    <div class="topbar-center">
      <button class="io-btn" @click="exportProfile" title="Export profile as JSON">Export</button>
      <button class="io-btn" @click="importProfile" title="Import profile from JSON">Import</button>
      <input
        ref="fileInput"
        type="file"
        accept=".json"
        style="display: none"
        @change="onFileSelected"
      />
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
.topbar-center { display: flex; align-items: center; gap: 6px; }
.topbar-right { display: flex; align-items: center; gap: 12px; }
.topbar-label { color: #888; font-size: 0.85em; }

.io-btn {
  padding: 4px 10px;
  background: #333;
  border: 1px solid #444;
  border-radius: 3px;
  color: #aaa;
  font-size: 0.8em;
  cursor: pointer;
  transition: all 0.15s;
}
.io-btn:hover {
  background: #444;
  color: #ccc;
  border-color: #555;
}

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
