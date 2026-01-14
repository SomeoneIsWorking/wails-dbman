<template>
  <TabView
    :title="tab.objectName"
    :icon="EyeIcon"
    icon-class="text-accent"
    :tabs="[
      { id: 'data', label: 'Data' },
      { id: 'definition', label: 'Definition' },
      { id: 'schema', label: 'Schema' },
    ]"
    v-model:activeTab="viewState.activeTab"
  >
    <template #actions v-if="viewState.activeTab === 'data'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-foreground-secondary whitespace-nowrap">
          Rows:
        </label>
        <select
          v-model="viewState.pageSize"
          @change="changePageSize"
          class="text-xs h-7"
        >
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="500">500</option>
          <option :value="1000">1000</option>
        </select>

        <div class="h-4 w-px bg-border mx-1"></div>

        <div class="flex items-center gap-1">
          <button
            :disabled="viewState.page < 1"
            @click="goToPage(viewState.page - 1)"
            class="btn-ghost"
            title="Previous Page"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <span
            class="text-sm font-medium text-foreground-secondary text-center"
          >
            {{ viewState.page + 1 }} / {{ totalPages || 1 }}
          </span>
          <button
            :disabled="viewState.page + 1 >= totalPages"
            @click="goToPage(viewState.page + 1)"
            class="btn-ghost"
            title="Next Page"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <div class="h-4 w-px bg-border mx-1"></div>

        <button class="btn-ghost" @click="refreshData">
          <RefreshCw class="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
    </template>

    <ViewDataTab
      v-if="viewState.activeTab === 'data'"
      :data="viewState.data"
      :columns="viewState.columns"
      :loading="viewState.loading"
      :error="viewState.error"
    />

    <ViewDefinitionTab
      v-else-if="viewState.activeTab === 'definition'"
      :definition="viewState.definition"
      :loading="viewState.loading"
      :error="viewState.error"
      :connection-id="tab.connectionId"
      :database="tab.database"
      :on-refresh="refreshData"
      :reveal-line="viewState.targetLine"
    />

    <ViewSchemaTab
      v-else-if="viewState.activeTab === 'schema'"
      :columns="viewState.columns"
      :loading="viewState.loading"
      :error="viewState.error"
    />
  </TabView>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  Eye as EyeIcon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-vue-next";
import TabView from "../TabView.vue";
import ViewDataTab from "./ViewDataTab.vue";
import ViewDefinitionTab from "./ViewDefinitionTab.vue";
import ViewSchemaTab from "./ViewSchemaTab.vue";
import { loadViewData } from "@/utils/viewDataLoader";
import { ViewTab } from "@/stores/tabsStore";

interface Props {
  tab: ViewTab;
}

const props = defineProps<Props>();

const viewState = computed(() => props.tab.state);

const totalPages = computed(() =>
  Math.ceil(viewState.value.totalRows / viewState.value.pageSize)
);

const changePageSize = () => {
  viewState.value.page = 0;
  loadViewData(props.tab);
};

const goToPage = (page: number) => {
  viewState.value.page = page;
  loadViewData(props.tab);
};

const refreshData = () => {
  loadViewData(props.tab);
};
</script>
