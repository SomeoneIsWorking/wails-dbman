<template>
  <TabView title="Query Editor" :subtitle="tab.database" type="query">
    <template #actions>
      <button
        class="btn-primary"
        title="Execute Query (⌘Enter)"
        @click="executeQuery"
      >
        <PlayIcon class="w-3.5 h-3.5" />
        Run
      </button>
    </template>

    <div class="h-full flex flex-col">
      <div class="flex-1 min-h-[200px] relative">
        <SqlEditor
          v-model="queryContent"
          height="100%"
          :connection-id="tab.connectionId"
          :database="tab.database"
        />
      </div>

      <!-- Result Area -->
      <div
        class="border-t border-border bg-surface flex flex-col"
        :style="{ height: resultHeight + 'px' }"
      >
        <div
          class="h-8 px-3 border-b border-border bg-surface-hover/50 flex-none flex items-center justify-between shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)]"
        >
          <div class="flex items-center gap-4">
            <span
              class="text-[10px] font-black uppercase tracking-widest text-foreground-secondary"
              >Results</span
            >
            <div class="toolbar-divider !h-3"></div>
            <span
              class="text-[10px] font-bold text-foreground-secondary opacity-60 uppercase tracking-tighter"
              >0 Rows Affected</span
            >
          </div>

          <div class="flex items-center gap-2">
            <span
              class="text-[10px] font-bold text-foreground-secondary uppercase tracking-tight"
              >{{ queryContent.length }} bytes</span
            >
          </div>
        </div>

        <OverlayScrollbarsComponent
          class="flex-1 bg-surface-hover/20 flex flex-col items-center justify-center gap-3 opacity-30 grayscale p-12"
        >
          <Database class="w-12 h-12 stroke-1" />
          <p
            class="text-[10px] font-bold uppercase tracking-[0.2em] max-w-[200px] text-center leading-relaxed"
          >
            Execute your SQL statement to view mapped results
          </p>
        </OverlayScrollbarsComponent>
      </div>
    </div>
  </TabView>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Play as PlayIcon, Database } from "lucide-vue-next";
import SqlEditor from "../SqlEditor.vue";
import TabView from "../TabView.vue";
import { OverlayScrollbarsComponent } from "overlayscrollbars-vue";
import { QueryTab } from "@/stores/tabsStore";

interface Props {
  tab: QueryTab;
}

defineProps<Props>();

const queryContent = ref("SELECT * FROM Users LIMIT 100;");
const resultHeight = ref(250);

const executeQuery = async () => {};
</script>
