<template>
  <div class="flex">
    <div
      v-for="tab in tabsStore.tabs"
      :key="tab.id"
      :class="[
        'flex items-center px-3 py-2 border-r border-border cursor-pointer hover:bg-surface-hover min-w-0 flex-shrink-0',
        tabsStore.activeTab === tab
          ? 'bg-blue-50 dark:bg-blue-900/20 border-b-2 border-b-primary text-primary'
          : 'text-foreground-secondary',
      ]"
      @click="tabsStore.setActiveTab(tab)"
    >
      <component
        :is="getTabIcon(tab.type)"
        class="w-4 h-4 mr-2 flex-shrink-0"
      />
      <span class="truncate text-sm">{{ tab.title }}</span>
      <button
        class="ml-2 p-1 hover:bg-surface-hover rounded flex-shrink-0"
        @click.stop="tabsStore.closeTab(tab)"
      >
        <X class="w-3 h-3" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTabsStore } from "@/stores/tabsStore";
import { FileText, Table, Settings, Eye, X } from "lucide-vue-next";

const tabsStore = useTabsStore();

const getTabIcon = (type: string) => {
  switch (type) {
    case "query":
      return FileText;
    case "table":
      return Table;
    case "procedure":
      return Settings;
    case "view":
      return Eye;
    default:
      return FileText;
  }
};
</script>
