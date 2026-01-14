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
      <div
        class="flex items-center justify-between border-b border-border bg-surface-hover/20 h-12 px-4"
      >
        <div class="flex items-center flex-1">
          <Search class="w-4 h-4 mr-3 text-foreground-secondary" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search procedure definitions..."
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
            >ESC</span
          >
        </div>
      </div>

      <div class="flex-1 min-h-[300px] max-h-[60vh] bg-surface">
        <div
          v-if="isLoading"
          class="flex flex-col items-center justify-center py-12 gap-3 opacity-50"
        >
          <Loader class="w-6 h-6 animate-spin text-primary" />
          <span class="text-sm font-bold uppercase tracking-widest"
            >Searching codebases...</span
          >
        </div>

        <div
          v-else-if="searchQuery && searchResults.length === 0"
          class="flex flex-col items-center justify-center py-12 gap-2 opacity-50"
        >
          <Search class="w-8 h-8 text-foreground-secondary/30" />
          <span class="text-xs font-bold uppercase tracking-widest"
            >No definitions found</span
          >
        </div>

        <div
          v-else-if="!searchQuery"
          class="flex flex-col items-center justify-center py-12 gap-2 opacity-30"
        >
          <span class="text-sm font-bold uppercase tracking-widest"
            >Type to search procedures</span
          >
        </div>

        <div v-else class="divide-y divide-border/50">
          <button
            v-for="(result, index) in searchResults"
            :key="`${result.connectionId}-${result.database}-${result.name}`"
            class="w-full text-left px-4 py-3 hover:bg-primary/5 group/result transition-colors flex items-start gap-3"
            :class="{ 'bg-primary/5': index === selectedIndex }"
            @click="selectResult"
            @mouseenter="selectedIndex = index"
          >
            <div
              class="w-8 h-8 rounded bg-orange-500/10 flex items-center justify-center mt-0.5"
            >
              <Settings class="w-4 h-4 text-orange-500" />
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
                  {{ result.database }}
                </div>
              </div>

              <div
                class="text-sm text-foreground-secondary mb-2 truncate opacity-70"
              >
                Connection: {{ result.connectionName }}
              </div>

              <div
                v-if="result.matchedText"
                class="text-sm font-mono bg-surface-hover/50 p-2 rounded border border-border/50 text-foreground-secondary leading-relaxed overflow-hidden"
              >
                <span class="opacity-30">...</span>
                {{ result.matchedText }}
                <span class="opacity-30">...</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div
        v-if="searchResults.length > 0"
        class="flex items-center justify-between border-t border-border bg-surface-hover/10 h-8 px-4 text-sm font-bold uppercase tracking-widest text-foreground-secondary/70"
      >
        <span>{{ searchResults.length }} Results Found</span>
        <div class="flex-1"></div>
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1.5"
            ><ArrowUp class="w-3 h-3" /><ArrowDown class="w-3 h-3" />
            Navigate</span
          >
          <span class="flex items-center gap-1.5"
            ><ChevronRight class="w-3 h-3 rotate-90 scale-x-[-1]" />
            Select</span
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
  Settings,
  Loader,
  ArrowUp,
  ArrowDown,
  ChevronRight,
} from "lucide-vue-next";
import { ProcedureSearch } from "wailsjs/go/main/App";
import type { ProcedureSearchResult } from "~/types/wails";
import { useTabsStore } from "@/stores/tabsStore";

const tabsStore = useTabsStore();
const isOpen = ref(false);
const searchQuery = ref("");
const selectedIndex = ref(0);
const searchResults = ref<ProcedureSearchResult[]>([]);
const isLoading = ref(false);
const searchInput = ref<HTMLInputElement>();

const performSearch = async (query: string) => {
  if (!query) {
    searchResults.value = [];
    return;
  }
  isLoading.value = true;
  try {
    searchResults.value = (await ProcedureSearch(
      query
    )) as ProcedureSearchResult[];
  } catch (e) {
    searchResults.value = [];
  } finally {
    isLoading.value = false;
  }
};

// Watch search input
watch(searchQuery, (newValue) => {
  performSearch(newValue);
});

// Keyboard shortcut to open search modal
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "f") {
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
  searchQuery.value = "";
  selectedIndex.value = 0;
  nextTick(() => {
    searchInput.value?.focus();
  });
};

const close = () => {
  isOpen.value = false;
  searchQuery.value = "";
  searchResults.value = [];
};

const navigateResults = (direction: number) => {
  if (searchResults.value.length === 0) return;
  selectedIndex.value =
    (selectedIndex.value + direction + searchResults.value.length) %
    searchResults.value.length;
};

const selectResult = () => {
  if (searchResults.value.length === 0) return;

  const result = searchResults.value[selectedIndex.value];

  // Split name to get schema and procedure name
  let schema = "dbo";
  let procedureName = result.name;
  if (result.name.includes(".")) {
    [schema, procedureName] = result.name.split(".");
  }

  // Create procedure tab
  tabsStore.addProcedureTab(
    result.connectionId,
    result.database,
    schema,
    procedureName
  );

  close();
};

// Expose methods to parent
defineExpose({
  open,
  close,
});
</script>
