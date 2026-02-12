<template>
  <div class="h-screen bg-background text-foreground flex">
    <!-- Main Layout -->
    <!-- Left Sidebar - Database Explorer -->
    <Resizable horizontal v-model:width="sidebarWidth" :min="270" :max="600">
      <aside class="border-r border-border flex flex-col min-w-0 min-h-0">
        <DatabaseExplorer @new-connection="openNewConnection" />
      </aside>
    </Resizable>
    <div class="flex flex-1 flex-col min-w-0">
      <!-- Top Toolbar -->
      <header
        class="flex items-center justify-between border-b border-border bg-surface shadow-sm z-50 h-10"
      >
        <ScrollableContainer ref="scrollContainer">
          <div class="flex items-center h-full">
            <TabBar />
            <button
              class="p-1 hover:bg-surface-hover rounded mx-1 shrink-0"
              title="New Query"
              @click="createNewQuery"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>
        </ScrollableContainer>
        <div
          class="flex items-center gap-2 px-2 shrink-0 border-l border-border h-full ml-1 bg-surface relative z-20"
        >
          <button class="btn-secondary" @click="commandPalette?.open()">
            <Search class="w-4 h-4" />
            Search
          </button>
          <div class="h-4 w-px bg-border mx-1"></div>
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

    <ConnectionDialog
      :is-open="showNewConnectionDialog"
      title="New Connection"
      :is-editing="false"
      :form-state="newConnectionForm"
      @save="handleConnectionSaved"
      @cancel="showNewConnectionDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { Search, Plus, Sun, Moon } from "lucide-vue-next";
import CommandPalette from "./components/CommandPalette.vue";
import DatabaseExplorer from "./components/DatabaseExplorer.vue";
import Resizable from "./components/Resizable.vue";
import TabBar from "./components/TabBar.vue";
import TabContent from "./components/TabContent.vue";
import ScrollableContainer from "./components/ScrollableContainer.vue";
import ConnectionDialog from "./components/ConnectionDialog.vue";
import { useTabsStore } from "./stores/tabsStore";
import { useConnectionsStore } from "./stores/connectionsStore";
import { useThemeStore } from "./stores/themeStore";
import { useConnectionForm } from "./composables/useConnectionForm";

const commandPalette = ref<InstanceType<typeof CommandPalette> | null>(null);
const scrollContainer = ref<InstanceType<typeof ScrollableContainer> | null>(null);

// Use the UI composables
const tabsStore = useTabsStore();
const themeStore = useThemeStore();
const sidebarWidth = ref(320);

const connectionsStore = useConnectionsStore();
const showNewConnectionDialog = ref(false);
const newConnectionForm = useConnectionForm();

watch(
  () => tabsStore.tabs,
  () => {
    nextTick(() => {
      scrollContainer.value?.update();
    });
  },
  { deep: true },
);

watch(
  () => tabsStore.activeTab,
  (activeTab) => {
    if (activeTab) {
      nextTick(() => {
        scrollContainer.value?.scrollIntoView(".tab-active");
      });
    }
  },
);

const createNewQuery = () => {
  tabsStore.addQueryTab(
    tabsStore.activeTab?.connectionId || "",
    tabsStore.activeTab?.database || "",
  );
};

const openNewConnection = () => {
  newConnectionForm.reset();
  showNewConnectionDialog.value = true;
};

const handleConnectionSaved = async () => {
  await connectionsStore.loadConnections();
  showNewConnectionDialog.value = false;
};

// Expose methods globally
defineExpose({
  openCommandPalette: () => commandPalette.value?.open(),
});
</script>
