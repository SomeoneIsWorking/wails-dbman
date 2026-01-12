<template>
  <div class="h-full flex flex-col">
    <div class="p-4 border-b border-border bg-surface-hover">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Eye class="w-5 h-5 text-accent" />
          <h3 class="text-lg font-semibold text-foreground">{{ tab.objectName }}</h3>
          <span class="text-sm text-foreground-secondary">({{ rowCount }} rows)</span>
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

    <!-- Pagination Controls -->
    <div
      class="p-3 border-b border-border bg-surface-hover flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <span class="text-sm text-foreground-secondary">Rows per page:</span>
        <select
          v-model="viewState.pageSize"
          @change="changePageSize"
          class="text-sm border border-border rounded px-2 py-1 bg-surface text-foreground"
        >
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="500">500</option>
          <option :value="1000">1000</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <button
          :disabled="viewState.page < 1"
          @click="goToPage(viewState.page - 1)"
          class="px-3 py-1 text-sm border border-border rounded hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed text-foreground"
        >
          Previous
        </button>
        <span class="text-sm text-foreground-secondary">
          Page {{ viewState.page + 1 }} of {{ totalPages }}
        </span>
        <button
          :disabled="viewState.page + 1 >= totalPages"
          @click="goToPage(viewState.page + 1)"
          class="px-3 py-1 text-sm border border-border rounded hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed text-foreground"
        >
          Next
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <StateWrapper :state="viewState">
        <template #success="{ data }">
          <DataTable :data="data.data.results" :columns="data.columns" />
        </template>
      </StateWrapper>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Eye } from 'lucide-vue-next'
import DataTable from '../DataTable.vue'
import StateWrapper from '../StateWrapper.vue'
import { loadViewData } from '@/utils/viewDataLoader'
import { ViewTab } from '@/stores/tabsStore'

interface Props {
  tab: ViewTab
}

const props = defineProps<Props>()

const viewState = computed(() => props.tab.state)

const rowCount = computed(() => {
  if (viewState.value.type === 'success') {
    return viewState.value.data.total
  }
  return 0
})

const totalPages = computed(() =>
  viewState.value.type !== "success"
    ? 0
    : Math.ceil(viewState.value.data.total / viewState.value.pageSize)
);

const changePageSize = () => {
  viewState.value.page = 0;
  loadViewData(props.tab);
};

const goToPage = (page: number) => {
  if (page >= 0 && page < totalPages.value) {
    viewState.value.page = page;
    loadViewData(props.tab);
  }
};

const refreshData = () => {
  loadViewData(props.tab)
}
</script>