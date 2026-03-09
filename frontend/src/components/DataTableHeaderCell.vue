<template>
  <div class="header-cell px-3 py-1.5 bg-surface-hover/80 backdrop-blur-md border-b border-border select-none transition-colors relative group/header">
    <div class="flex items-center gap-1 group">
      <span class="truncate" :title="column">{{ column }}</span>
      <div class="flex-grow"></div>
      
      <!-- Sort Toggle -->
      <div
        class="flex flex-col cursor-pointer hover:bg-surface-hover px-1 rounded transition-colors"
        @click="$emit('sort', column)"
      >
        <ChevronUp
          class="w-3 h-3 -mb-0.5 transition-colors"
          :class="{
            'text-primary': sortColumn === column && sortDirection === 'asc',
            'text-foreground-secondary/30': sortColumn !== column || sortDirection !== 'asc',
          }"
        />
        <ChevronDown
          class="w-3 h-3 -mt-0.5 transition-colors"
          :class="{
            'text-primary': sortColumn === column && sortDirection === 'desc',
            'text-foreground-secondary/30': sortColumn !== column || sortDirection !== 'desc',
          }"
        />
      </div>

      <!-- Filter Toggle -->
      <button
        class="p-1 rounded hover:bg-surface-hover transition-colors"
        :class="{ 'text-primary': hasFilter, 'text-foreground-secondary/30 opacity-0 group-hover:opacity-100': !hasFilter }"
        @click.stop="toggleFilter"
      >
        <Filter class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Filter Popover -->
    <div
      v-if="showFilter"
      v-click-outside="closeFilter"
      class="absolute top-full left-0 mt-1 w-48 bg-surface border border-border shadow-xl rounded-md z-50 p-2"
      @click.stop
    >
      <div class="flex flex-col gap-2">
        <select
          v-model="localOperator"
          class="w-full bg-surface-hover border border-border rounded px-2 py-1 text-xs outline-none focus:border-primary"
        >
          <option value="=">Equals</option>
          <option value="LIKE">Contains</option>
          <option value=">">Greater than</option>
          <option value="<">Less than</option>
          <option value="!=">Not equals</option>
          <option value="IS NULL">Is NULL</option>
          <option value="IS NOT NULL">Is NOT NULL</option>
        </select>
        
        <input
          v-if="!localOperator.includes('NULL')"
          v-model="localValue"
          type="text"
          placeholder="Value..."
          class="w-full bg-surface-hover border border-border rounded px-2 py-1 text-xs outline-none focus:border-primary"
          @keyup.enter="applyFilter"
        />

        <div class="flex gap-2 mt-1">
          <button
            class="flex-1 bg-primary text-primary-foreground text-[10px] font-bold py-1 rounded hover:opacity-90 transition-opacity"
            @click="applyFilter"
          >
            APPLY
          </button>
          <button
            class="flex-1 bg-surface-hover text-foreground-secondary text-[10px] font-bold py-1 rounded hover:bg-border transition-colors"
            @click="clearFilter"
          >
            CLEAR
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="!isLast"
      class="resize-handle absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors"
      @mousedown.stop="$emit('resizeMouseDown', $event)"
      @click.stop
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ChevronUp, ChevronDown, Filter } from 'lucide-vue-next';

const props = defineProps<{
  column: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  isLast: boolean;
  activeFilter?: { operator: string; value: any };
}>();

const emit = defineEmits<{
  sort: [column: string];
  filter: [column: string, filter: { operator: string; value: any } | null];
  resizeMouseDown: [event: MouseEvent];
}>();

const showFilter = ref(false);
const localOperator = ref(props.activeFilter?.operator || 'LIKE');
const localValue = ref(props.activeFilter?.value || '');

const hasFilter = computed(() => !!props.activeFilter);

watch(() => props.activeFilter, (newFilter) => {
  if (newFilter) {
    localOperator.value = newFilter.operator;
    localValue.value = newFilter.value;
  } else {
    localOperator.value = 'LIKE';
    localValue.value = '';
  }
});

const toggleFilter = () => {
  showFilter.value = !showFilter.value;
};

const closeFilter = () => {
  showFilter.value = false;
};

const applyFilter = () => {
  emit('filter', props.column, {
    operator: localOperator.value,
    value: localValue.value
  });
  showFilter.value = false;
};

const clearFilter = () => {
  localValue.value = '';
  emit('filter', props.column, null);
  showFilter.value = false;
};

// Directive for clicking outside
const vClickOutside = {
  mounted(el: any, binding: any) {
    el.clickOutsideEvent = (event: MouseEvent) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value();
      }
    };
    document.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el: any) {
    document.removeEventListener('click', el.clickOutsideEvent);
  },
};
</script>
