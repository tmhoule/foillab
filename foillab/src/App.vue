<script setup lang="ts">
import TopBar from './components/TopBar.vue'
import SplitPane from './components/SplitPane.vue'
import FoilEditor from './components/FoilEditor.vue'
import AnalysisPanel from './components/AnalysisPanel.vue'
import ComparePanel from './components/ComparePanel.vue'
import SuggestPanel from './components/SuggestPanel.vue'
import { useFoilStore } from './stores/foilStore'

const store = useFoilStore()
</script>

<template>
  <div class="app">
    <TopBar />
    <SplitPane>
      <template #left>
        <FoilEditor />
      </template>
      <template #right>
        <div class="right-panel">
          <div class="tab-bar">
            <button
              v-for="tab in ['analysis', 'compare', 'suggest']"
              :key="tab"
              :class="{ active: store.rightPanelTab === tab }"
              @click="store.rightPanelTab = tab as any"
            >
              {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
            </button>
          </div>
          <AnalysisPanel v-if="store.rightPanelTab === 'analysis'" />
          <SuggestPanel v-else-if="store.rightPanelTab === 'suggest'" />
          <div v-else class="placeholder">{{ store.rightPanelTab }} (coming soon)</div>
        </div>
      </template>
    </SplitPane>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app { height: 100%; }
body { background: #0d0d1a; }
.app {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0d0d1a;
  color: #ccc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #444;
  font-size: 1.2em;
}
.right-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.tab-bar {
  display: flex;
  background: #1a1a2e;
  border-bottom: 1px solid #2a2a4e;
  flex-shrink: 0;
}
.tab-bar button {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #888;
  cursor: pointer;
  font-size: 13px;
  padding: 8px 16px;
  transition: color 0.15s, border-color 0.15s;
  font-family: inherit;
}
.tab-bar button:hover {
  color: #ccc;
}
.tab-bar button.active {
  color: #00d4ff;
  border-bottom-color: #00d4ff;
}
</style>
