<template>
  <div>
    <div
      class="flex items-center cursor-pointer hover:bg-surface-hover p-1 rounded text-xs"
      @click="$emit('toggle')"
    >
      <component
        :is="expanded ? ChevronDown : ChevronRight"
        class="w-3 h-3 mr-1"
      />
      <slot name="header" />
    </div>
    <div v-if="expanded" class="ml-2">
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