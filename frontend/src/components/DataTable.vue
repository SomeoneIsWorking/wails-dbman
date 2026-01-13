<template>
  <ScrollView class="h-full relative bg-surface">
    <table class="min-w-full border-separate border-spacing-0">
      <thead class="sticky top-0 z-20 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
        <tr class="divide-x divide-border/50">
          <th
            v-for="column in columns"
            :key="column"
            class="px-3 py-1.5 bg-surface-hover/80 backdrop-blur-md border-b border-border select-none"
          >
            {{ column }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border/30">
        <tr
          v-for="(row, rowIndex) in data"
          :key="rowIndex"
          class="hover:bg-primary/5 group divide-x divide-border/30 transition-colors"
        >
          <td
            v-for="column in columns"
            :key="column"
            class="px-3 py-1 whitespace-nowrap text-sm text-foreground font-medium"
            :class="{ 'text-foreground-secondary/40 italic font-normal': row[column] === null }"
          >
            {{ row[column] === null ? 'NULL' : row[column] }}
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="data.length === 0" class="flex flex-col items-center justify-center p-12 text-foreground-secondary gap-3 opacity-40">
      <Database class="w-10 h-10 stroke-1" />
      <span class="text-sm font-bold uppercase tracking-[0.2em]">Void Dataset</span>
    </div>
  </ScrollView>
</template>

<script setup lang="ts">
import { Database } from 'lucide-vue-next'
import ScrollView from './ScrollView.vue'

interface Props {
  data: Record<string, any>[]
  columns: string[]
}

defineProps<Props>()
</script>