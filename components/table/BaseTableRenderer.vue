<template>
  <div class="space-y-4">
    <!-- Refresh Button -->
    <div class="flex justify-end">
      <UButton
        color="neutral"
        variant="soft"
        :loading="isLoading"
        @click="$emit('refresh')"
      >
        <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
        {{ refreshButtonText }}
      </UButton>
    </div>

    <!-- Table -->
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
          <tr v-for="(row, index) in data" :key="index">
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

    <!-- Pagination Controls Slot -->
    <slot name="pagination" />
  </div>
</template>

<script setup lang="ts">
import type { ColumnInfo } from '~/types/schema'

interface Props {
  columns: ColumnInfo[]
  data: any[]
  isLoading: boolean
  refreshButtonText?: string
}

defineProps<Props>()

defineEmits<{
  'refresh': []
}>()
</script> 