<script setup lang="ts">
defineProps<{ splitPercent?: number }>()
</script>

<template>
  <div class="split-pane">
    <div class="split-left" :style="{ width: (splitPercent ?? 55) + '%' }">
      <slot name="left" />
    </div>
    <div class="split-right" :style="{ width: (100 - (splitPercent ?? 55)) + '%' }">
      <slot name="right" />
    </div>
  </div>
</template>

<style scoped>
.split-pane { display: flex; flex: 1; overflow: hidden; }
.split-left { border-right: 1px solid #333; display: flex; flex-direction: column; overflow: hidden; }
.split-right { display: flex; flex-direction: column; overflow: hidden; }
</style>
