<template>
  <OverlayScrollbarsComponent class="h-full relative bg-surface">
    <table class="min-w-full border-separate border-spacing-0">
      <thead class="sticky top-0 z-20 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
        <tr class="divide-x divide-border/50">
          <th
            v-for="column in columns"
            :key="column"
            class="px-3 py-1.5 bg-surface-hover/80 backdrop-blur-md border-b border-border select-none cursor-pointer hover:bg-surface-hover transition-colors"
            @click="handleSort(column)"
          >
            <div class="flex items-center gap-1">
              <span>{{ column }}</span>
              <div class="flex flex-col">
                <ChevronUp
                  class="w-3 h-3 -mb-0.5"
                  :class="{
                    'text-primary': sortColumn === column && sortDirection === 'asc',
                    'text-foreground-secondary/30': sortColumn !== column || sortDirection !== 'asc'
                  }"
                />
                <ChevronDown
                  class="w-3 h-3 -mt-0.5"
                  :class="{
                    'text-primary': sortColumn === column && sortDirection === 'desc',
                    'text-foreground-secondary/30': sortColumn !== column || sortDirection !== 'desc'
                  }"
                />
              </div>
            </div>
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
            :class="{
              'text-foreground-secondary/40 italic font-normal':
                row[column] === null,
            }"
          >
            {{ row[column] === null ? "NULL" : row[column] }}
          </td>
        </tr>
      </tbody>
    </table>
    <div
      v-if="data.length === 0"
      class="flex flex-col items-center justify-center p-12 text-foreground-secondary gap-3 opacity-40"
    >
      <Database class="w-10 h-10 stroke-1" />
      <span class="text-sm font-bold uppercase tracking-[0.2em]"
        >Void Dataset</span
      >
    </div>
  </OverlayScrollbarsComponent>
</template>

<script setup lang="ts">
import { Database, ChevronUp, ChevronDown } from "lucide-vue-next";
import { OverlayScrollbarsComponent } from "overlayscrollbars-vue";

interface Props {
  data: Record<string, any>[];
  columns: string[];
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

const props = defineProps<Props>();

const emit = defineEmits<{
  sort: [column: string, direction: 'asc' | 'desc'];
}>();

const handleSort = (column: string) => {
  let direction: 'asc' | 'desc' = 'asc';
  if (props.sortColumn === column && props.sortDirection === 'asc') {
    direction = 'desc';
  }
  emit('sort', column, direction);
};
</script>
