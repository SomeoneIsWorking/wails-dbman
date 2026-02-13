<template>
  <div class="h-full relative bg-surface overflow-hidden">
    <OverlayScrollbarsComponent class="h-full w-full">
      <div class="data-table min-w-full w-fit">
        <!-- Header Row -->
        <div
          ref="headerRowRef"
          class="header-row sticky top-0 z-20 shadow-[0_1px_0_0_rgba(0,0,0,0.1)] divide-x divide-border/50"
          :style="{ display: 'grid', gridTemplateColumns: gridTemplateColumns }"
        >
          <div
            v-for="(column, index) in columns"
            :key="column"
            class="header-cell px-3 py-1.5 bg-surface-hover/80 backdrop-blur-md border-b border-border select-none transition-colors relative"
          >
            <div class="flex items-center gap-1">
              <span class="truncate">{{ column }}</span>
              <div class="flex-grow"></div>
              <div
                class="flex flex-col cursor-pointer hover:bg-surface-hover px-1 rounded"
                @click="handleSort(column)"
              >
                <ChevronUp
                  class="w-3 h-3 -mb-0.5"
                  :class="{
                    'text-primary':
                      sortColumn === column && sortDirection === 'asc',
                    'text-foreground-secondary/30':
                      sortColumn !== column || sortDirection !== 'asc',
                  }"
                />
                <ChevronDown
                  class="w-3 h-3 -mt-0.5"
                  :class="{
                    'text-primary':
                      sortColumn === column && sortDirection === 'desc',
                    'text-foreground-secondary/30':
                      sortColumn !== column || sortDirection !== 'desc',
                  }"
                />
              </div>
            </div>
            <div
              v-if="index < columns.length - 1"
              class="resize-handle absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors"
              @mousedown.stop="handleResizeMouseDown($event, index)"
              @click.stop
            ></div>
          </div>
        </div>

        <!-- Data Rows -->
        <div class="data-rows divide-y divide-border/30">
          <div
            v-for="(row, rowIndex) in data"
            :key="rowIndex"
            class="data-row hover:bg-primary/5 group divide-x divide-border/30 transition-colors"
            :style="{
              display: 'grid',
              gridTemplateColumns: gridTemplateColumns,
            }"
          >
            <div
              v-for="(column, _) in columns"
              :key="column"
              class="data-cell px-3 py-1 whitespace-nowrap text-sm text-foreground font-medium truncate"
              :class="{
                'text-foreground-secondary/40 italic font-normal':
                  row[column] === null,
              }"
            >
              {{ row[column] === null ? "NULL" : row[column] }}
            </div>
          </div>
        </div>
      </div>
    </OverlayScrollbarsComponent>

    <!-- Empty State Overlay -->
    <div
      v-if="data.length === 0"
      class="absolute inset-0 pointer-events-none flex items-center justify-center"
    >
      <div
        class="flex flex-col items-center justify-center p-12 text-foreground-secondary gap-4 opacity-40 translate-y-4"
      >
        <div class="relative">
          <Database class="w-10 h-10 stroke-1" />
          <div class="absolute -bottom-1 -right-1 bg-surface rounded-full p-0.5">
            <Search class="w-4 h-4 stroke-[3]" />
          </div>
        </div>
        <div class="flex flex-col items-center gap-1">
          <span class="text-sm font-bold uppercase tracking-[0.2em]"
            >No Records Found</span
          >
          <span class="text-[10px] font-medium opacity-60"
            >This dataset appears to be empty</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Database, ChevronUp, ChevronDown, Search } from "lucide-vue-next";
import { OverlayScrollbarsComponent } from "overlayscrollbars-vue";
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from "vue";

interface Props {
  data: Record<string, any>[];
  columns: string[];
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
}

const props = defineProps<Props>();

const emit = defineEmits<{
  sort: [column: string, direction: "asc" | "desc"];
}>();

const columnWidths = ref<number[]>(new Array(props.columns.length).fill(150));
const isResizing = ref(false);
const resizeIndex = ref(-1);
const startX = ref(0);
const startWidth = ref(0);
const headerRowRef = ref<HTMLDivElement>();
const clickTimeout = ref<number | null>(null);
const preventSort = ref(false);

const gridTemplateColumns = computed(() => {
  if (columnWidths.value.length === 0) return "";
  const lastIndex = columnWidths.value.length - 1;
  const widths = columnWidths.value.map((w, i) => {
    if (i === lastIndex) {
      return `minmax(${w}px, 1fr)`;
    }
    return `${w}px`;
  });
  return widths.join(" ");
});

const handleSort = (column: string) => {
  if (preventSort.value) {
    preventSort.value = false;
    return;
  }
  let direction: "asc" | "desc" = "asc";
  if (props.sortColumn === column && props.sortDirection === "asc") {
    direction = "desc";
  }
  emit("sort", column, direction);
};

const handleResizeMouseDown = (event: MouseEvent, index: number) => {
  event.preventDefault();

  if (clickTimeout.value) {
    // Double click detected
    clearTimeout(clickTimeout.value);
    clickTimeout.value = null;
    preventSort.value = true; // Prevent the sort from the second click
    resetColumnWidth(index);
  } else {
    // Single click - start resize after a delay
    clickTimeout.value = setTimeout(() => {
      clickTimeout.value = null;
      preventSort.value = false; // Reset in case it was set
      startResize(event, index);
    }, 200); // 200ms delay for double-click detection
  }
};

const startResize = (event: MouseEvent, index: number) => {
  isResizing.value = true;
  resizeIndex.value = index;
  startX.value = event.clientX;
  startWidth.value = columnWidths.value[index];

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
};

const handleMouseMove = (event: MouseEvent) => {
  event.preventDefault();
  if (!isResizing.value) return;
  const diff = event.clientX - startX.value;
  const newWidth = Math.max(50, startWidth.value + diff); // Minimum width of 50px
  columnWidths.value = [
    ...columnWidths.value.slice(0, resizeIndex.value),
    newWidth,
    ...columnWidths.value.slice(resizeIndex.value + 1),
  ];
};

const handleMouseUp = () => {
  isResizing.value = false;
  resizeIndex.value = -1;
  preventSort.value = false; // Reset preventSort
  if (clickTimeout.value) {
    clearTimeout(clickTimeout.value);
    clickTimeout.value = null;
  }
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("mouseup", handleMouseUp);
};

const resetColumnWidth = (index: number) => {
  if (!headerRowRef.value) return;

  // Temporarily set to auto to measure natural width
  const originalTemplate = headerRowRef.value.style.gridTemplateColumns;
  const autoTemplate = props.columns
    .map((_, i) => (i === index ? "auto" : `${columnWidths.value[i]}px`))
    .join(" ");
  headerRowRef.value.style.gridTemplateColumns = autoTemplate;

  // Force reflow
  headerRowRef.value.offsetHeight;

  const headerCells = headerRowRef.value.querySelectorAll(".header-cell");
  const cell = headerCells[index] as HTMLElement;
  if (cell) {
    const rect = cell.getBoundingClientRect();
    const naturalWidth = Math.max(rect.width, 50);
    columnWidths.value[index] = naturalWidth;
  }

  // Restore grid
  headerRowRef.value.style.gridTemplateColumns = originalTemplate;
};

const measureColumns = () => {
  nextTick(() => {
    if (headerRowRef.value) {
      // Temporarily set to auto to measure natural widths
      const originalTemplate = headerRowRef.value.style.gridTemplateColumns;
      headerRowRef.value.style.gridTemplateColumns = props.columns
        .map(() => "auto")
        .join(" ");

      // Force reflow
      headerRowRef.value.offsetHeight;

      const headerCells = headerRowRef.value.querySelectorAll(".header-cell");
      const measuredWidths: number[] = [];
      headerCells.forEach((cell) => {
        const rect = cell.getBoundingClientRect();
        measuredWidths.push(Math.max(rect.width, 50));
      });

      // Restore grid and set measured widths
      headerRowRef.value.style.gridTemplateColumns = originalTemplate;
      columnWidths.value = measuredWidths.map((w) => Math.max(w, 50));
    }
  });
};

onMounted(measureColumns);

watch(
  () => props.columns,
  (newCols, oldCols) => {
    // Check if column names actually changed
    const columnsChanged =
      !oldCols ||
      newCols.length !== oldCols.length ||
      newCols.some((col, i) => col !== oldCols[i]);

    if (columnsChanged) {
      if (newCols.length !== columnWidths.value.length) {
        columnWidths.value = new Array(newCols.length).fill(150);
      }
      measureColumns();
    }
  },
  { deep: true }
);

onUnmounted(() => {
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("mouseup", handleMouseUp);
  if (clickTimeout.value) {
    clearTimeout(clickTimeout.value);
  }
});
</script>
