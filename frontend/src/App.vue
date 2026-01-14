<template>
  <div class="h-screen bg-background text-foreground flex">
    <!-- Main Layout -->
    <!-- Left Sidebar - Database Explorer -->
    <Resizable horizontal v-model:width="sidebarWidth" :min="250" :max="600">
      <aside class="border-r border-border flex flex-col min-w-0 min-h-0">
        <DatabaseExplorer />
      </aside>
    </Resizable>
    <div class="flex flex-1 flex-col min-w-0">
      <!-- Top Toolbar -->
      <header class="toolbar shadow-sm z-50 h-10 justify-stretch">
        <OverlayScrollbarsComponent class="flex-1 items-center h-full">
          <div class="flex">
            <TabBar />
            <button
              class="p-1 hover:bg-surface-hover rounded"
              title="New Query"
              @click="createNewQuery"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>
        </OverlayScrollbarsComponent>
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
import Resizable from "./components/Resizable.vue";
import TabBar from "./components/TabBar.vue";
import TabContent from "./components/TabContent.vue";
import { useTabsStore } from "./stores/tabsStore";
import { useThemeStore } from "./stores/themeStore";
import { OverlayScrollbarsComponent } from "overlayscrollbars-vue";

const commandPalette = ref();
const procedureTextSearch = ref();

// Use the UI composables
const tabsStore = useTabsStore();
const themeStore = useThemeStore();

const sidebarWidth = ref(320);

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
