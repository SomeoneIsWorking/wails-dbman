<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <UButton
        color="neutral"
        variant="soft"
        :loading="isLoading"
        @click="refreshSchema"
      >
        <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
        Refresh Schema
      </UButton>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nullable</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Default</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="column in columns" :key="column.name">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ column.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ column.type }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ column.nullable ? 'Yes' : 'No' }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ column.default || '-' }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ column.comment || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ColumnInfo, SchemaInfo } from '~/types/schema'

const props = defineProps<{
  connectionId: string
  database: string
  schema: string
  name: string
}>()

const emit = defineEmits<{
  (e: 'update:loading', value: boolean): void
  (e: 'update:error', value: any): void
}>()

// Schema fetching
const { data: schemaData, error, isLoading, fetch: fetchSchema } = useAsyncFetch<SchemaInfo>()

// Fetch schema function
async function fetchSchemaData() {
  emit('update:loading', true)
  try {
    await fetchSchema(`/api/connections/${props.connectionId}/${props.database}/schema`)
    emit('update:error', null)
  } catch (e) {
    emit('update:error', e)
  } finally {
    emit('update:loading', false)
  }
}

// Initial fetch
fetchSchemaData()

// Refresh function
function refreshSchema() {
  fetchSchemaData()
}

// Get columns for current table
const columns = computed(() => {
  if (!schemaData.value) return []
  const table = schemaData.value.tables.find((t) => t.schema === props.schema && t.name === props.name)
  return table?.columns || []
})

function formatValue(value: any) {
  if (value === null) return 'NULL'
  if (value === undefined) return 'undefined'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
</script> 