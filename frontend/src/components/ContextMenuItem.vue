<template>
  <button
    class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-hover text-foreground transition-colors text-left"
    @click="$emit('click')"
  >
    <component :is="icon" v-if="icon" class="w-4 h-4" />
    <span class="flex-1 text-xs">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  icon?: any;
}>();

defineEmits(["click"]);
</script>
