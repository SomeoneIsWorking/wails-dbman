<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click="close"
  >
    <div class="bg-white rounded-lg shadow-lg w-full max-w-md mx-4" @click.stop>
      <div class="p-4 border-b">
        <div class="flex items-center">
          <Search class="w-5 h-5 mr-2 text-gray-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search within stored procedure definitions..."
            class="flex-1 outline-none"
            @keydown.down.prevent="navigateResults(1)"
            @keydown.up.prevent="navigateResults(-1)"
            @keydown.enter.prevent="selectResult"
            @keydown.esc="close"
            ref="searchInput"
          />
        </div>
      </div>
      <div class="p-4 max-h-96 overflow-y-auto">
        <div v-if="isLoading" class="text-center py-4">
          <Loader class="w-6 h-6 animate-spin mx-auto text-blue-500" />
        </div>
        <div
          v-else-if="searchResults.length === 0"
          class="py-2 text-center text-gray-500"
        >
          No results found
        </div>
        <div v-else class="space-y-1">
          <button
            v-for="(result, index) in searchResults"
            :key="`${result.connectionId}-${result.database}-${result.name}`"
            class="w-full text-left p-2 rounded hover:bg-gray-100 flex items-center"
            :class="{ 'bg-gray-200': index === selectedIndex }"
            @click="selectResult"
            @mouseenter="selectedIndex = index"
          >
            <Settings class="w-4 h-4 mr-2" />
            <div class="flex-1">
              <div class="font-semibold">{{ result.name }}</div>
              <div class="text-xs text-gray-500">
                {{ result.connectionName }} • {{ result.database }}
              </div>
              <div
                v-if="result.matchedText"
                class="text-xs text-gray-600 mt-1 font-mono bg-gray-100 p-1 rounded"
              >
                ...{{ result.matchedText }}...
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import { Search, Settings, Loader } from "lucide-vue-next";
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
  selectedIndex.value =
    (selectedIndex.value + direction + searchResults.value.length) %
    searchResults.value.length;
};

const selectResult = () => {
  if (searchResults.value.length === 0) return;

  const result = searchResults.value[selectedIndex.value];

  // Split name to get schema and procedure name
  const [schema, procedureName] = result.name.split('.');

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
