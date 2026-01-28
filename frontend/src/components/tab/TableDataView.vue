<template>
  <div class="h-full flex flex-col">
    <div class="flex-1 overflow-hidden relative">
      <StateWrapper :loading="tableState.loading" :error="tableState.error">
        <DataTable
         v-if="tableState.data && tableState.schema"
          :data="tableState.data.results"
          :columns="tableState.schema.columns.map((col) => col.name)"
          :sort-column="tableState.sortColumn"
          :sort-direction="tableState.sortDirection"
          @sort="handleSort"
        />
      </StateWrapper>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import DataTable from "../DataTable.vue";
import StateWrapper from "../StateWrapper.vue";
import { TableTab } from "../../stores/tabsStore";
import { loadTableData } from "../../utils/tableDataLoader";

interface Props {
  tab: TableTab;
}

const props = defineProps<Props>();

const tableState = computed(() => props.tab.state);

const handleSort = async (column: string, direction: 'asc' | 'desc') => {
  props.tab.state.sortColumn = column;
  props.tab.state.sortDirection = direction;
  // Reset to first page when sorting
  props.tab.state.page = 0;
  await loadTableData(props.tab);
};
</script>
