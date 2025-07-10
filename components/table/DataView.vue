<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <UButton
        color="neutral"
        variant="soft"
        :loading="isLoading"
        @click="refreshData"
      >
        <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
        Refresh Data
      </UButton>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th
              v-for="column in columns"
              :key="column.name"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {{ column.name }}
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="(row, index) in tableData?.results" :key="index">
            <td
              v-for="column in columns"
              :key="column.name"
              class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
            >
              {{ row[column.name] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex justify-between items-center">
      <UPagination
        v-model="page"
        :total="tableData?.total || 0"
        :page-count="Math.ceil((tableData?.total || 0) / limit)"
        :per-page="limit"
      />
      <USelect
        v-model="limit"
        :options="[10, 25, 50, 100]"
        class="w-24"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import type { ColumnInfo, SchemaInfo, TableInfo } from '~/types/schema'

const props = defineProps<{
  connectionId: string
  database: string
  schema: string
  name: string
  page: number
  limit: number
}>()

const emit = defineEmits<{
  'update:loading': [value: boolean]
  'update:error': [value: any]
}>()

// Pagination
const page = ref(1)
const limit = ref(10)

// Data fetching
type TableData = { results: any[], total: number }
const { data: tableData, error, isLoading, fetch: fetchTableData } = useAsyncFetch<TableData>()

// Fetch data function
async function fetchData() {
  emit('update:loading', true)
  try {
    await fetchTableData(`/api/connections/${props.connectionId}/${props.database}/tables/${props.schema}.${props.name}/data`, {
      query: {
        page: props.page,
        limit: props.limit
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
watch([() => props.page, () => props.limit], () => {
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
</script> 