<template>
  <div
    v-for="tab in tabsStore.tabs"
    :key="tab.id"
    :title="tab.title"
    class="p-2"
    :class="[
      'flex items-center gap-1.5 border-r border-border/50 cursor-pointer hover:bg-surface-hover/50 transition-all select-none',
      tabsStore.activeTab === tab
        ? 'bg-surface shadow-[0_-2px_0_inset_rgb(var(--color-primary))] text-foreground'
        : 'bg-surface-hover/30 text-foreground-secondary',
    ]"
    @click="tabsStore.setActiveTab(tab)"
  >
    <component
      :is="getTabIcon(tab.type)"
      class="w-3.5 h-3.5 flex-shrink-0"
      :class="tabsStore.activeTab === tab ? 'text-primary' : 'text-foreground-secondary/70'"
    />
    <span class="truncate text-sm font-medium flex-1">{{ tab.title }}</span>
    <button
      class="p-0.5 hover:bg-red-500/10 hover:text-red-500 rounded flex-shrink-0 transition-colors"
      @click.stop="tabsStore.closeTab(tab)"
    >
      <X class="w-2.5 h-2.5" />
    </button>
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
