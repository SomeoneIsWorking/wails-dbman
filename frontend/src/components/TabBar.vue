<template>
  <div
    v-for="tab in tabsStore.tabs"
    :key="tab.id"
    :title="tab.title"
    class="p-2"
    :class="[
      'flex items-center gap-1.5 border-r border-border/50 cursor-pointer hover:bg-surface-hover/50 transition-all select-none',
      tabsStore.activeTab === tab
        ? 'tab-active bg-surface shadow-[0_-2px_0_inset_rgb(var(--color-primary))] text-foreground'
        : 'bg-surface-hover/30 text-foreground-secondary',
    ]"
    @click="tabsStore.setActiveTab(tab)"
    @mousedown.middle.prevent="tabsStore.closeTab(tab)"
    @contextmenu.prevent="handleContextMenu($event, tab)"
  >
    <component
      :is="getTabIcon(tab.type)"
      class="w-3.5 h-3.5"
      :class="tabsStore.activeTab === tab ? 'text-primary' : 'text-foreground-secondary/70'"
    />
    <span class="truncate text-sm font-medium flex-1">{{ tab.title }}</span>
    <button
      class="p-0.5 hover:bg-red-500/10 hover:text-red-500 rounded transition-colors"
      @click.stop="tabsStore.closeTab(tab)"
    >
      <X class="w-2.5 h-2.5" />
    </button>
  </div>

  <ContextMenu
    :show="contextMenu.show"
    :x="contextMenu.x"
    :y="contextMenu.y"
    @close="contextMenu.show = false"
  >
    <ContextMenuItem
      label="Close Tab"
      :icon="X"
      @click="closeTab"
    />
    <ContextMenuItem
      label="Close Other Tabs"
      :icon="Ban"
      @click="closeOthers"
    />
    <ContextMenuItem
      label="Close Tabs to Left"
      :icon="ArrowLeft"
      @click="closeLeft"
    />
    <ContextMenuItem
      label="Close Tabs to Right"
      :icon="ArrowRight"
      @click="closeRight"
    />
    <div class="h-px bg-border my-1"></div>
    <ContextMenuItem
      label="Close All Tabs"
      :icon="XCircle"
      @click="closeAll"
    />
  </ContextMenu>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { useTabsStore, type Tab } from "@/stores/tabsStore";
import { 
  FileText, 
  Table, 
  Settings, 
  Eye, 
  X, 
  XCircle, 
  Ban, 
  ArrowLeft, 
  ArrowRight 
} from "lucide-vue-next";
import ContextMenu from "./ContextMenu.vue";
import ContextMenuItem from "./ContextMenuItem.vue";

const tabsStore = useTabsStore();

const contextMenu = reactive({
  show: false,
  x: 0,
  y: 0,
  tab: null as Tab | null,
});

const handleContextMenu = (e: MouseEvent, tab: Tab) => {
  contextMenu.x = e.clientX;
  contextMenu.y = e.clientY;
  contextMenu.tab = tab;
  contextMenu.show = true;
};

const closeTab = () => {
  if (contextMenu.tab) {
    tabsStore.closeTab(contextMenu.tab);
  }
  contextMenu.show = false;
};

const closeOthers = () => {
  if (contextMenu.tab) {
    tabsStore.closeOtherTabs(contextMenu.tab);
  }
  contextMenu.show = false;
};

const closeLeft = () => {
  if (contextMenu.tab) {
    tabsStore.closeTabsToLeft(contextMenu.tab);
  }
  contextMenu.show = false;
};

const closeRight = () => {
  if (contextMenu.tab) {
    tabsStore.closeTabsToRight(contextMenu.tab);
  }
  contextMenu.show = false;
};

const closeAll = () => {
  tabsStore.closeAllTabs();
  contextMenu.show = false;
};

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
