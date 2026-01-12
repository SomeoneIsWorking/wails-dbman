<template>
  <div>
    <div
      class="flex items-center cursor-pointer hover:bg-gray-100 p-1 rounded text-xs"
      @click="$emit('toggle')"
    >
      <component
        :is="expanded ? ChevronDown : ChevronRight"
        class="w-3 h-3 mr-1 text-gray-500"
      />
      <component :is="icon" class="w-3 h-3 mr-1" />
      <slot name="header">
        <span class="font-medium">{{ title }}</span>
      </slot>
    </div>
    <div v-if="expanded" class="ml-4">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronRight, ChevronDown } from "lucide-vue-next";

defineProps<{
  title?: string;
  icon: any;
  expanded: boolean | undefined;
}>();

defineEmits<{
  toggle: [];
}>();
</script>