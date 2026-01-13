<template>
  <TabView
    :title="tab.objectName"
    :icon="TableIcon"
    icon-class="text-green-500"
    :tabs="[
      { id: 'data', label: 'Data' },
      { id: 'schema', label: 'Schema' }
    ]"
    v-model:activeTab="tableState!.activeTab"
  >
    <template #actions v-if="tableState!.activeTab === 'data'">
      <div class="flex items-center gap-2">
        <label class="text-xs text-foreground-secondary whitespace-nowrap">Rows:</label>
        <select
          v-model="tableState!.pageSize"
          @change="changePageSize"
          class="text-xs h-7"
        >
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="500">500</option>
          <option :value="1000">1000</option>
        </select>
        
        <div class="toolbar-divider"></div>

        <div class="flex items-center gap-1">
          <button
            :disabled="tableState!.page < 1"
            @click="goToPage(tableState!.page - 1)"
            class="btn-ghost"
            title="Previous Page"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <span class="text-sm font-medium text-foreground-secondary text-center">
            {{ tableState!.page + 1 }} / {{ totalPages || 1 }}
          </span>
          <button
            :disabled="tableState!.page + 1 >= totalPages"
            @click="goToPage(tableState!.page + 1)"
            class="btn-ghost"
            title="Next Page"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <button class="btn-ghost" @click="refreshData">
          <RefreshCw class="w-3.5 h-3.5" />
          Refresh
        </button>
        <button class="btn-ghost">
          <Download class="w-3.5 h-3.5" />
          Export
        </button>
      </div>
    </template>

    <TableDataView
      v-if="tableState!.activeTab === 'data'"
      :tab="tab"
    />
    <TableSchemaView
      v-else-if="tableState!.activeTab === 'schema'"
      :tab="tab"
    />
  </TabView>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Table as TableIcon, RefreshCw, Download, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import TableDataView from './TableDataView.vue'
import TableSchemaView from './TableSchemaView.vue'
import TabView from '../TabView.vue'
import type { TableTab } from '../../stores/tabsStore'
import { loadTableData } from '@/utils/tableDataLoader'

interface Props {
  tab: TableTab;
}

const props = defineProps<Props>()

const tableState = computed(() => props.tab.state)

const totalPages = computed(() =>
  Math.ceil(tableState.value.totalRows / tableState.value.pageSize)
);

const refreshData = () => {
  loadTableData(props.tab)
}

const changePageSize = () => {
  tableState.value.page = 0;
  loadTableData(props.tab);
};

const goToPage = (page: number) => {
  if (page >= 0 && page < totalPages.value) {
    tableState.value.page = page;
    loadTableData(props.tab);
  }
};
</script>