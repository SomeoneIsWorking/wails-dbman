<template>
  <div v-if="loading" class="flex items-center justify-center h-full">
    <div class="text-center text-gray-500">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
      Loading...
    </div>
  </div>
  <div v-else-if="error" class="flex items-center justify-center h-full">
    <div class="text-center">
      <AlertTriangle class="w-12 h-12 mx-auto mb-4 text-error" />
      <h4 class="text-lg font-semibold mb-2 text-foreground">Error</h4>
      <p class="text-sm text-foreground-secondary">{{ error }}</p>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'

interface Props {
  loading: boolean;
  error?: string | null;
}

defineProps<Props>()
</script>