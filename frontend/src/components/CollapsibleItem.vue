<template>
  <div class="select-none flex flex-col">
    <div
      class="flex items-center group/item cursor-pointer hover:bg-surface-hover/50 px-1 py-0.5 rounded transition-colors"
      :class="expanded ? 'bg-surface-hover rounded-bl-none' : ''"
      @click="$emit('toggle')"
    >
      <div class="w-4 flex items-center shrink-0">
        <component
          :is="expanded ? ChevronDown : ChevronRight"
          class="w-3 h-3 text-foreground-secondary group-hover/item:text-foreground"
        />
      </div>
      <div class="flex-1 flex items-center min-w-0 text-sm text-foreground font-medium truncate">
        <slot name="header" />
      </div>
    </div>
    <div v-if="expanded" class="border-l -mt-2 pt-2 border-surface-hover pl-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronRight, ChevronDown } from "lucide-vue-next";

defineProps<{
  expanded: boolean | undefined;
}>();

defineEmits<{
  toggle: [];
}>();
</script>