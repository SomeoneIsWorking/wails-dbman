<template>
  <div
    class="relative"
    @mouseenter="showSubMenu = true"
    @mouseleave="showSubMenu = false"
  >
    <button
      class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-hover text-foreground transition-all text-left group"
    >
      <component :is="icon" v-if="icon" class="w-4 h-4" />
      <span class="flex-1 text-xs">{{ label }}</span>
      <ChevronRight class="w-3 h-3 text-foreground-secondary group-hover:text-foreground" />
    </button>

    <div
      v-if="showSubMenu"
      class="absolute left-full top-0 ml-px bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[160px] z-[10000] animate-in fade-in slide-in-from-left-2 duration-75"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ChevronRight } from "lucide-vue-next";

defineProps<{
  label: string;
  icon?: any;
}>();

const showSubMenu = ref(false);
</script>
