<template>
  <BaseTableRenderer
    :columns="columns"
    :data="tableData?.results || []"
    :is-loading="isLoading"
    refresh-button-text="Refresh Data"
    @refresh="refreshData"
  >
    <template #pagination>
      <div class="flex justify-between items-center">
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500">Rows per page:</span>
        <USelect
          v-model="pageSize"
          :options="pageSizeOptions"
          size="sm"
          class="w-20"
        />
      </div>
      
      <div class="flex items-center gap-2">
        <UButton
          variant="ghost"
          size="sm"
          :disabled="currentPage === 1"
          @click="goToPage(1)"
        >
          <UIcon name="i-heroicons-chevron-double-left" class="w-4 h-4" />
        </UButton>
        
        <UButton
          variant="ghost"
          size="sm"
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
        >
          <UIcon name="i-heroicons-chevron-left" class="w-4 h-4" />
        </UButton>
        
        <span class="text-sm px-3">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        
        <UButton
          variant="ghost"
          size="sm"
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
        >
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
        </UButton>
        
        <UButton
          variant="ghost"
          size="sm"
          :disabled="currentPage >= totalPages"
          @click="goToPage(totalPages)"
        >
          <UIcon name="i-heroicons-chevron-double-right" class="w-4 h-4" />
        </UButton>
      </div>
      
      <div class="text-sm text-gray-500">
        Showing {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, tableData?.total || 0) }} of {{ tableData?.total || 0 }} rows
      </div>
      </div>
    </template>
  </BaseTableRenderer>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import type { ColumnInfo, SchemaInfo, TableInfo } from '~/types/schema'

interface Props {
  connectionId: string
  database: string
  schema: string
  name: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:loading': [value: boolean]
  'update:error': [value: any]
}>()

import { PAGINATION } from '~/utils/constants'

const currentPage = ref(1)
const pageSize = ref(PAGINATION.DEFAULT_PAGE_SIZE)
const pageSizeOptions = PAGINATION.PAGE_SIZE_OPTIONS

// Data fetching
type TableData = { results: any[], total: number }
const { data: tableData, error, isLoading, fetch: fetchTableData } = useAsyncFetch<TableData>()

// Fetch data function
async function fetchData() {
  emit('update:loading', true)
  try {
    await fetchTableData(`/api/connections/${props.connectionId}/${props.database}/tables/${props.schema}.${props.name}/data`, {
      query: {
        page: currentPage.value,
        limit: pageSize.value
      }
    })
    emit('update:error', null)
  } catch (e) {
    emit('update:error', e)
  } finally {
    emit('update:loading', false)
  }
}

// Watch for changes in page and limit
watch([currentPage, pageSize], () => {
  fetchData()
})

// Initial fetch
fetchData()

// Refresh function
function refreshData() {
  fetchData()
}

// Get columns from schema
const { data: schemaData, fetch: fetchSchema } = useAsyncFetch<SchemaInfo>()

// Initial schema fetch
onMounted(async () => {
  await fetchSchema(`/api/connections/${props.connectionId}/${props.database}/schema`)
})

// Get columns from schema data
const columns = computed(() => {
  if (!schemaData.value) return []
  const table = schemaData.value.tables.find((t: TableInfo) => t.schema === props.schema && t.name === props.name)
  return table?.columns || []
})

// Computed total pages
const totalPages = computed(() => {
  if (!tableData.value?.total) return 1
  return Math.ceil(tableData.value.total / pageSize.value)
})

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// Reset to page 1 when page size changes
watch(pageSize, () => {
  currentPage.value = 1
})
</script> 