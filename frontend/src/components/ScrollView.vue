<template>
  <OverlayScrollbarsComponent :options="options" :class="containerClass">
    <slot />
  </OverlayScrollbarsComponent>
</template>

<script setup lang="ts">
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'

interface Props {
  containerClass?: string;
}

const props = defineProps<Props>()

const options = {
  // Default options, can be customized as needed
}
</script>

<style scoped>
/* OverlayScrollbars handles the scrollbar styling */
</style>