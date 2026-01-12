<template>
  <div class="h-full flex flex-col">
    <!-- Pagination Controls -->
    <div
      class="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600">Rows per page:</span>
        <select
          v-model="tableState.pageSize"
          @change="changePageSize"
          class="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="500">500</option>
          <option :value="1000">1000</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <button
          :disabled="tableState.page < 1"
          @click="goToPage(tableState.page - 1)"
          class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span class="text-sm text-gray-600">
          Page {{ tableState.page + 1 }} of {{ totalPages }}
        </span>
        <button
          :disabled="tableState.page + 1 >= totalPages"
          @click="goToPage(tableState.page + 1)"
          class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Data Table with Horizontal Scroll -->
    <div class="flex-1 overflow-auto">
      <StateWrapper :state="tableState">
        <template #success="{ data }">
          <div class="min-w-max">
            <DataTable
              :data="data.data.results"
              :columns="data.schema.columns.map((col) => col.name)"
            />
          </div>
        </template>
      </StateWrapper>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import DataTable from "../DataTable.vue";
import StateWrapper from "../StateWrapper.vue";
import { TableTab } from "../../stores/tabsStore";
import { loadTableData } from "@/utils/tableDataLoader";

interface Props {
  tab: TableTab;
}

const props = defineProps<Props>();

const tableState = computed(() => props.tab.state);
const totalPages = computed(() =>
  tableState.value.type !== "success"
    ? 0
    : Math.ceil(tableState.value.data.total / tableState.value.pageSize)
);

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
