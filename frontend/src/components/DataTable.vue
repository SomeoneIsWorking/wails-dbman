<template>
  <div class="overflow-auto">
    <table class="min-w-full divide-y divide-border">
      <thead class="bg-surface-hover">
        <tr>
          <th
            v-for="column in columns"
            :key="column"
            class="px-6 py-3 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider"
          >
            {{ column }}
          </th>
        </tr>
      </thead>
      <tbody class="bg-surface divide-y divide-border">
        <tr
          v-for="(row, rowIndex) in data"
          :key="rowIndex"
          class="hover:bg-surface-hover"
        >
          <td
            v-for="column in columns"
            :key="column"
            class="px-6 py-4 whitespace-nowrap text-sm text-foreground"
          >
            {{ row[column] }}
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="data.length === 0" class="text-center py-8 text-foreground-secondary">
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