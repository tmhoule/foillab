<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFoilStore } from '../stores/foilStore'
import { profileLibrary } from '../data/profiles'
import type { LibraryEntry } from '../data/profiles'
import FoilOverlay from './charts/FoilOverlay.vue'

const store = useFoilStore()
const search = ref('')
const activeCategory = ref<string>('all')

const categories = ['all', 'windsurf', 'kitefoil', 'naca']

const filteredProfiles = computed(() => {
  return profileLibrary.filter(entry => {
    const matchesSearch = search.value === '' ||
      entry.profile.name.toLowerCase().includes(search.value.toLowerCase())
    const matchesCategory = activeCategory.value === 'all' ||
      entry.category === activeCategory.value
    return matchesSearch && matchesCategory
  })
})

function selectProfile(entry: LibraryEntry) {
  store.loadProfile(entry.profile)
  store.editorMode = 'draw'
}
</script>

<template>
  <div class="foil-library">
    <!-- Search input -->
    <div class="library-search-row">
      <input
        v-model="search"
        class="library-search"
        type="text"
        placeholder="Search profiles…"
      />
    </div>

    <!-- Category filter chips -->
    <div class="category-chips">
      <button
        v-for="cat in categories"
        :key="cat"
        class="chip"
        :class="{ active: activeCategory === cat }"
        @click="activeCategory = cat"
      >
        {{ cat.charAt(0).toUpperCase() + cat.slice(1) }}
      </button>
    </div>

    <!-- Scrollable profile list -->
    <div class="profile-list">
      <div
        v-for="entry in filteredProfiles"
        :key="entry.profile.name"
        class="profile-card"
        @click="selectProfile(entry)"
      >
        <!-- Thumbnail -->
        <div class="card-thumbnail">
          <FoilOverlay
            :profile="entry.profile"
            :showGrid="false"
            :showControlPoints="false"
            :showChordLine="false"
          />
        </div>

        <!-- Info -->
        <div class="card-info">
          <div class="card-name">{{ entry.profile.name }}</div>
          <div class="card-desc">{{ entry.description }}</div>
        </div>
      </div>

      <div v-if="filteredProfiles.length === 0" class="no-results">
        No profiles match your search.
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────── */
.foil-library {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #0d0d1a;
}

/* ── Search ──────────────────────────────────────────────────────────────── */
.library-search-row {
  padding: 8px 10px 4px;
  flex-shrink: 0;
}

.library-search {
  width: 100%;
  box-sizing: border-box;
  background: #1a1a2e;
  border: 1px solid #333;
  border-radius: 4px;
  color: #ccc;
  font-size: 0.85em;
  padding: 5px 8px;
  outline: none;
  transition: border-color 0.15s;
}
.library-search::placeholder { color: #555; }
.library-search:focus { border-color: #00d4ff; }

/* ── Category chips ──────────────────────────────────────────────────────── */
.category-chips {
  display: flex;
  gap: 6px;
  padding: 4px 10px 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.chip {
  padding: 3px 10px;
  background: transparent;
  border: 1px solid #333;
  border-radius: 12px;
  color: #888;
  font-size: 0.78em;
  cursor: pointer;
  transition: all 0.15s;
  text-transform: capitalize;
}
.chip:hover { border-color: #555; color: #aaa; }
.chip.active {
  border-color: #00d4ff;
  color: #00d4ff;
  background: #00d4ff11;
}

/* ── Profile list ────────────────────────────────────────────────────────── */
.profile-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px 8px;
  scrollbar-width: thin;
  scrollbar-color: #333 transparent;
}
.profile-list::-webkit-scrollbar { width: 6px; }
.profile-list::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

/* ── Profile card ────────────────────────────────────────────────────────── */
.profile-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  margin-bottom: 4px;
  background: #1a1a2e;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.profile-card:hover {
  border-color: #00d4ff33;
  background: #1e1e38;
}

/* ── Thumbnail ───────────────────────────────────────────────────────────── */
.card-thumbnail {
  flex-shrink: 0;
  width: 100px;
  height: 60px;
  overflow: hidden;
  border-radius: 3px;
  background: #0d0d1a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-thumbnail :deep(svg) {
  width: 100%;
  height: 100%;
}

/* ── Card info ───────────────────────────────────────────────────────────── */
.card-info {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-weight: 600;
  font-size: 0.88em;
  color: #ccc;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-desc {
  font-size: 0.76em;
  color: #666;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
.no-results {
  text-align: center;
  color: #555;
  font-size: 0.85em;
  padding: 24px 0;
}
</style>
