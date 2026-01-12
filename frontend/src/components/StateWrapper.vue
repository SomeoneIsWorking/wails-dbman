<template>
  <div v-if="state.type === 'loading'" class="flex items-center justify-center h-full">
    <div class="text-center text-gray-500">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
      Loading...
    </div>
  </div>
  <div v-else-if="state.type === 'error'" class="flex items-center justify-center h-full">
    <div class="text-center text-red-600">
      <AlertTriangle class="w-12 h-12 mx-auto mb-4" />
      <h4 class="text-lg font-semibold mb-2">Error</h4>
      <p class="text-sm">{{ state.error }}</p>
    </div>
  </div>
  <slot v-else name="success" :data="state" />
</template>

<script setup lang="ts" generic="T">
import { AnyState } from '@/stores/tabsStore';
import { AlertTriangle } from 'lucide-vue-next'

interface Props<T> {
  state: AnyState<T>
}

defineProps<Props<T>>()
</script>