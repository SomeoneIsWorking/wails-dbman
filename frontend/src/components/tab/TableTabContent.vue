<template>
  <div class="h-full flex flex-col">
    <div class="p-4 border-b border-border bg-surface-hover">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Table class="w-5 h-5 text-success" />
          <h3 class="text-lg font-semibold text-foreground">{{ tab.objectName }}</h3>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn-primary" @click="refreshData">
            Refresh
          </button>
          <button class="btn-accent">
            Export
          </button>
        </div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="flex border-b border-border bg-surface">
      <button
        :class="tableState!.activeTab === 'data' ? 'border-b-2 border-primary text-primary' : 'text-foreground-secondary'"
        class="px-4 py-2 text-sm font-medium hover:text-primary"
        @click="tableState!.activeTab = 'data'"
      >
        Data
      </button>
      <button
        :class="tableState!.activeTab === 'schema' ? 'border-b-2 border-primary text-primary' : 'text-foreground-secondary'"
        class="px-4 py-2 text-sm font-medium hover:text-primary"
        @click="tableState!.activeTab = 'schema'"
      >
        Schema
      </button>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-hidden">
      <TableDataView
        v-if="tableState!.activeTab === 'data'"
        :tab="tab"
      />
      <TableSchemaView
        v-else-if="tableState!.activeTab === 'schema'"
        :tab="tab"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Table } from 'lucide-vue-next'
import TableDataView from './TableDataView.vue'
import TableSchemaView from './TableSchemaView.vue'
import type { TableTab } from '../../stores/tabsStore'
import { loadTableData } from '@/utils/tableDataLoader'

interface Props {
  tab: TableTab;
}

const props = defineProps<Props>()

const tableState = computed(() => props.tab.state)

const refreshData = () => {
  loadTableData(props.tab)
}
</script>