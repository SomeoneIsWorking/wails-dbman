<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center z-[100] p-4"
    @click="close"
  >
    <div
      class="bg-surface rounded shadow-2xl w-full max-w-xl border border-border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      @click.stop
    >
      <div class="toolbar !bg-surface-hover/20 !border-b !h-12 px-4">
        <div class="flex items-center flex-1">
          <Search class="w-4 h-4 mr-3 text-foreground-secondary" />
          <input
            v-model="search"
            type="text"
            placeholder="Search tables, views and procedures..."
            class="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium"
            @keydown.down.prevent="navigateResults(1)"
            @keydown.up.prevent="navigateResults(-1)"
            @keydown.enter.prevent="selectResult"
            @keydown.esc="close"
            ref="searchInput"
          />
        </div>
        <div class="flex items-center gap-2">
          <span
            class="text-sm font-bold uppercase tracking-widest text-foreground-secondary/50 px-1.5 py-0.5 border border-border rounded"
            >⌘K</span
          >
        </div>
      </div>

      <OverlayScrollbarsComponent
        class="flex-1 min-h-[300px] max-h-[60vh] bg-surface"
      >
        <div
          v-if="isLoading"
          class="flex flex-col items-center justify-center py-12 gap-3 opacity-50"
        >
          <Loader class="w-6 h-6 animate-spin text-primary" />
          <span class="text-sm font-bold uppercase tracking-widest"
            >Global Search Active</span
          >
        </div>

        <div
          v-else-if="search && results.length === 0"
          class="flex flex-col items-center justify-center py-12 gap-2 opacity-50"
        >
          <Search class="w-8 h-8 text-foreground-secondary/30" />
          <span class="text-xs font-bold uppercase tracking-widest"
            >No objects found</span
          >
        </div>

        <div
          v-else-if="!search"
          class="flex flex-col items-center justify-center py-12 gap-2 opacity-30"
        >
          <span class="text-sm font-bold uppercase tracking-widest"
            >Search global workspace</span
          >
        </div>

        <div v-else class="divide-y divide-border/50">
          <button
            v-for="(result, index) in results"
            :key="result.id"
            class="w-full text-left px-4 py-2.5 hover:bg-primary/5 group/result transition-colors flex items-center gap-3"
            :class="{ 'bg-primary/5': index === selectedIndex }"
            @click="selectResult"
            @mouseenter="selectedIndex = index"
          >
            <div
              class="w-7 h-7 rounded flex items-center justify-center shrink-0 border border-border/50"
              :class="getIconClass(result.type)"
            >
              <component :is="getIcon(result.type)" class="w-3.5 h-3.5" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-0.5">
                <div
                  class="font-bold text-xs text-foreground truncate uppercase tracking-tight"
                >
                  {{ result.name }}
                </div>
                <div
                  class="text-sm font-bold text-foreground-secondary uppercase tracking-widest opacity-60"
                >
                  {{ result.type }}
                </div>
              </div>
              <div
                class="text-sm text-foreground-secondary truncate opacity-70 font-medium"
              >
                {{ result.path }}
              </div>
            </div>
          </button>
        </div>
      </OverlayScrollbarsComponent>

      <div
        v-if="results.length > 0"
        class="toolbar !bg-surface-hover/10 !border-t px-4 !h-8 text-sm font-bold uppercase tracking-widest text-foreground-secondary/70"
      >
        <span>{{ results.length }} Results</span>
        <div class="flex-1"></div>
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1.5"
            ><ArrowUp class="w-3 h-3" /><ArrowDown class="w-3 h-3" />
            Navigate</span
          >
          <span class="flex items-center gap-1.5"
            ><ChevronRight class="w-3 h-3 rotate-90 scale-x-[-1]" /> Open</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import {
  Search,
  Table,
  Settings,
  File,
  Loader,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Eye,
} from "lucide-vue-next";
import { Search as SearchAPI } from "wailsjs/go/main/App";
import { SearchResult } from "@/types/wails";
import { OverlayScrollbarsComponent } from "overlayscrollbars-vue";

const isOpen = ref(false);
const search = ref("");
const selectedIndex = ref(0);
const results = ref<SearchResult[]>([]);
const isLoading = ref(false);
const searchInput = ref<HTMLInputElement>();

const getIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "table":
      return Table;
    case "procedure":
      return Settings;
    case "view":
      return Eye;
    default:
      return File;
  }
};

const getIconClass = (type: string) => {
  switch (type.toLowerCase()) {
    case "table":
      return "bg-green-500/10 text-green-500";
    case "procedure":
      return "bg-orange-500/10 text-orange-500";
    case "view":
      return "bg-accent/10 text-accent";
    default:
      return "bg-foreground-secondary/10 text-foreground-secondary";
  }
};

const performSearch = async (query: string) => {
  if (!query) {
    results.value = [];
    return;
  }
  // For now, search without specific connection/database context
  // TODO: Get current active connection/database from global state
  const connectionId = "default";
  const database = "master";

  isLoading.value = true;
  try {
    results.value = await SearchAPI(query, connectionId, database);
  } catch (e) {
    results.value = [];
  } finally {
    isLoading.value = false;
  }
};

// Watch search input
watch(search, (newValue) => {
  performSearch(newValue);
});

// Keyboard shortcut to open command palette
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    open();
  }
};

// Add keyboard shortcut listener
onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});

const open = () => {
  isOpen.value = true;
  search.value = "";
  selectedIndex.value = 0;
  nextTick(() => {
    searchInput.value?.focus();
  });
};

const close = () => {
  isOpen.value = false;
};

const navigateResults = (direction: number) => {
  if (results.value.length === 0) return;
  selectedIndex.value =
    (selectedIndex.value + direction + results.value.length) %
    results.value.length;
};

const selectResult = () => {
  const result = results.value[selectedIndex.value];
  if (result) {
    // Logic to open selected object
    console.log("Open", result);
    close();
  }
};

defineExpose({ open, close });
</script>
