<template>
  <div class="h-screen flex flex-col bg-background">
    <!-- Top Toolbar -->
    <header class="bg-surface border-b border-border px-4 py-2 flex items-center justify-between shadow-sm">
      <h1 class="text-lg font-semibold text-foreground flex items-center gap-2">
        <Database class="w-5 h-5 text-primary" />
        Database Manager
      </h1>
      <div class="flex items-center space-x-2">
        <button
          class="btn-primary"
          @click="commandPalette.open()"
        >
          <Search class="w-4 h-4" />
          Search (⌘K)
        </button>
        <button
          class="btn-success"
          @click="procedureTextSearch.open()"
        >
          <Search class="w-4 h-4" />
          Procedure Search (⌘F)
        </button>
        <button
          class="btn-accent"
          @click="openNewConnection"
        >
          <Plus class="w-4 h-4" />
          New Connection
        </button>
        <button
          class="p-2 hover:bg-surface-hover rounded"
          title="Toggle Theme"
          @click="themeStore.toggleTheme()"
        >
          <Sun v-if="themeStore.theme === 'dark'" class="w-4 h-4 text-yellow-500" />
          <Moon v-else class="w-4 h-4 text-foreground-secondary" />
        </button>
      </div>
    </header>

    <!-- Main Layout -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left Sidebar - Database Explorer -->
      <aside class="bg-surface border-r border-border flex flex-col" :style="{ width: sidebarWidth + 'px' }">
        <div class="flex-1 overflow-y-auto">
          <DatabaseExplorer />
        </div>
      </aside>
      <div class="w-1 bg-border cursor-col-resize hover:bg-primary" @mousedown="startResize"></div>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Tab Bar -->
        <div class="bg-surface border-b border-border px-2 py-1 flex items-center">
          <div class="flex-1 flex overflow-x-auto">
            <TabBar />
          </div>
          <div class="flex items-center gap-1 ml-2">
            <button class="p-1 hover:bg-surface-hover rounded" title="New Query" @click="createNewQuery">
              <FileText class="w-4 h-4" />
            </button>
            <button class="p-1 hover:bg-surface-hover rounded" title="New Data View" @click="createNewDataView">
              <Table class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Content Area -->
        <div class="flex-1 overflow-hidden">
          <TabContent />
        </div>
      </div>
    </div>
 
    <!-- Modals -->
    <CommandPalette ref="commandPalette" />
    <ProcedureTextSearchModal ref="procedureTextSearch" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Search, Plus, Database, FileText, Table, Sun, Moon } from "lucide-vue-next";
import CommandPalette from "./components/CommandPalette.vue";
import ProcedureTextSearchModal from "./components/ProcedureTextSearchModal.vue";
import DatabaseExplorer from "./components/DatabaseExplorer.vue";
import TabBar from "./components/TabBar.vue";
import TabContent from "./components/TabContent.vue";
import { useTabsStore } from "./stores/tabsStore";
import { useThemeStore } from "./stores/themeStore";

const commandPalette = ref();
const procedureTextSearch = ref();

// Use the UI composables
const tabsStore = useTabsStore();
const themeStore = useThemeStore();

const sidebarWidth = ref(320);
const isResizing = ref(false);

const startResize = () => {
  isResizing.value = true;
  document.addEventListener('mousemove', resize);
  document.addEventListener('mouseup', stopResize);
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
  document.removeEventListener('mousemove', resize);
  document.removeEventListener('mouseup', stopResize);
};

const createNewQuery = () => {
  tabsStore.addQueryTab(tabsStore.activeTab?.connectionId || '', tabsStore.activeTab?.database || '')
}

const createNewDataView = () => {
  // TODO: Implement new data view creation
  console.log('Create new data view')
}

const openNewConnection = () => {
  // TODO: Implement new connection creation modal
  console.log('Open new connection modal')
}

// Expose methods globally
defineExpose({
  openCommandPalette: () => commandPalette.value?.open(),
  openProcedureTextSearch: () => procedureTextSearch.value?.open()
})
</script>
