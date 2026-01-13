<template>
  <div class="h-screen bg-background text-foreground flex">
    <!-- Main Layout -->
    <!-- Left Sidebar - Database Explorer -->
    <aside
      class="border-r border-border flex flex-col shrink-0"
      :style="{ width: sidebarWidth + 'px' }"
    >
      <DatabaseExplorer />
    </aside>
    <div
      class="w-1 bg-border/50 cursor-col-resize hover:bg-primary/50 transition-colors"
      @mousedown="startResize"
    ></div>
    <div class="flex flex-1 flex-col min-w-0">
      <!-- Top Toolbar -->
      <header class="toolbar shadow-sm z-50 h-10 justify-stretch">
        <ScrollView
          class="flex-1 items-center h-full"
          container-class="flex gap-1 px-2 min-w-max"
        >
          <TabBar />
          <button
            class="p-1 hover:bg-surface-hover rounded"
            title="New Query"
            @click="createNewQuery"
          >
            <Plus class="w-4 h-4" />
          </button>
        </ScrollView>
        <div class="flex items-center gap-2 px-2">
          <button class="btn-secondary" @click="commandPalette.open()">
            <Search class="w-4 h-4" />
            Search
          </button>
          <button class="btn-success" @click="procedureTextSearch.open()">
            <FileCode class="w-4 h-4" />
            Procs
          </button>
          <button class="btn-accent" @click="openNewConnection">
            <PlusCircle class="w-4 h-4" />
            Connect
          </button>
          <div class="toolbar-divider"></div>
          <button
            class="p-1 hover:bg-surface-hover rounded"
            title="Toggle Theme"
            @click="themeStore.toggleTheme()"
          >
            <Sun
              v-if="themeStore.theme === 'dark'"
              class="w-4 h-4 text-yellow-500"
            />
            <Moon v-else class="w-4 h-4 text-foreground-secondary" />
          </button>
        </div>
      </header>
      <!-- Content Area -->
      <TabContent class="min-h-0" />
    </div>

    <!-- Modals -->
    <CommandPalette ref="commandPalette" />
    <ProcedureTextSearchModal ref="procedureTextSearch" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Search, Plus, Sun, Moon, FileCode, PlusCircle } from "lucide-vue-next";
import CommandPalette from "./components/CommandPalette.vue";
import ProcedureTextSearchModal from "./components/ProcedureTextSearchModal.vue";
import DatabaseExplorer from "./components/DatabaseExplorer.vue";
import TabBar from "./components/TabBar.vue";
import TabContent from "./components/TabContent.vue";
import { useTabsStore } from "./stores/tabsStore";
import { useThemeStore } from "./stores/themeStore";
import ScrollView from "./components/ScrollView.vue";

const commandPalette = ref();
const procedureTextSearch = ref();

// Use the UI composables
const tabsStore = useTabsStore();
const themeStore = useThemeStore();

const sidebarWidth = ref(320);
const isResizing = ref(false);

const startResize = () => {
  isResizing.value = true;
  document.addEventListener("mousemove", resize);
  document.addEventListener("mouseup", stopResize);
};

const resize = (e: MouseEvent) => {
  if (isResizing.value) {
    const newWidth = e.clientX;
    if (newWidth >= 200 && newWidth <= 600) {
      sidebarWidth.value = newWidth;
    }
  }
};

const stopResize = () => {
  isResizing.value = false;
  document.removeEventListener("mousemove", resize);
  document.removeEventListener("mouseup", stopResize);
};

const createNewQuery = () => {
  tabsStore.addQueryTab(
    tabsStore.activeTab?.connectionId || "",
    tabsStore.activeTab?.database || ""
  );
};

const openNewConnection = () => {
  // TODO: Implement new connection creation modal
  console.log("Open new connection modal");
};

// Expose methods globally
defineExpose({
  openCommandPalette: () => commandPalette.value?.open(),
  openProcedureTextSearch: () => procedureTextSearch.value?.open(),
});
</script>
