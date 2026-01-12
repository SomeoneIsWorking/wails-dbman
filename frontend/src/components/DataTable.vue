<template>
  <div class="overflow-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th
            v-for="column in columns"
            :key="column"
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            {{ column }}
          </th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <tr
          v-for="(row, rowIndex) in data"
          :key="rowIndex"
          class="hover:bg-gray-50"
        >
          <td
            v-for="column in columns"
            :key="column"
            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
          >
            {{ row[column] }}
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="data.length === 0" class="text-center py-8 text-gray-500">
      No data available
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  data: Record<string, any>[]
  columns: string[]
}

defineProps<Props>()
</script>