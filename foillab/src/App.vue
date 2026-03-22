<script setup lang="ts">
import TopBar from './components/TopBar.vue'
import SplitPane from './components/SplitPane.vue'
</script>

<template>
  <div class="app">
    <TopBar />
    <SplitPane>
      <template #left>
        <div class="placeholder">Foil Editor</div>
      </template>
      <template #right>
        <div class="placeholder">Analysis Panel</div>
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
</style>
