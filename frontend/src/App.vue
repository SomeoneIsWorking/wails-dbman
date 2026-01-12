<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- Top Toolbar -->
    <header class="bg-white border-b border-gray-300 px-4 py-2 flex items-center justify-between shadow-sm">
      <h1 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
        <Database class="w-5 h-5 text-blue-600" />
        Database Manager
      </h1>
      <div class="flex items-center space-x-2">
        <button
          class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
          @click="commandPalette.open()"
        >
          <Search class="w-4 h-4" />
          Search (⌘K)
        </button>
        <button
          class="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-1"
          @click="procedureTextSearch.open()"
        >
          <Search class="w-4 h-4" />
          Procedure Search (⌘F)
        </button>
        <button
          class="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center gap-1"
          @click="openNewConnection"
        >
          <Plus class="w-4 h-4" />
          New Connection
        </button>
      </div>
    </header>

    <!-- Main Layout -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left Sidebar - Database Explorer -->
      <aside class="w-80 bg-white border-r border-gray-300 flex flex-col">
        <div class="flex-1 overflow-y-auto">
          <DatabaseExplorer />
        </div>
      </aside>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Tab Bar -->
        <div class="bg-white border-b border-gray-300 px-2 py-1 flex items-center">
          <div class="flex-1 flex overflow-x-auto">
            <TabBar />
          </div>
          <div class="flex items-center gap-1 ml-2">
            <button class="p-1 hover:bg-gray-100 rounded" title="New Query" @click="createNewQuery">
              <FileText class="w-4 h-4" />
            </button>
            <button class="p-1 hover:bg-gray-100 rounded" title="New Data View" @click="createNewDataView">
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
import { Search, Plus, Database, FileText, Table } from "lucide-vue-next";
import CommandPalette from "./components/CommandPalette.vue";
import ProcedureTextSearchModal from "./components/ProcedureTextSearchModal.vue";
import DatabaseExplorer from "./components/DatabaseExplorer.vue";
import TabBar from "./components/TabBar.vue";
import TabContent from "./components/TabContent.vue";
import { useTabsStore } from "./stores/tabsStore";

const commandPalette = ref();
const procedureTextSearch = ref();

// Use the UI composables
const tabsStore = useTabsStore();

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
