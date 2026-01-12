<template>
  <div class="flex">
    <div
      v-for="tab in tabsStore.tabs"
      :key="tab.id"
      :class="[
        'flex items-center px-3 py-2 border-r border-gray-200 cursor-pointer hover:bg-gray-50 min-w-0 flex-shrink-0',
        tabsStore.activeTab === tab
          ? 'bg-blue-50 border-b-2 border-b-blue-500 text-blue-700'
          : 'text-gray-600',
      ]"
      @click="tabsStore.setActiveTab(tab)"
    >
      <component
        :is="getTabIcon(tab.type)"
        class="w-4 h-4 mr-2 flex-shrink-0"
      />
      <span class="truncate text-sm">{{ tab.title }}</span>
      <button
        class="ml-2 p-1 hover:bg-gray-200 rounded flex-shrink-0"
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
