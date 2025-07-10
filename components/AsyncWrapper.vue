<template>
  <div>
    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-600" />
    </div>

    <div v-else-if="error" class="text-red-500 p-4 bg-red-50 rounded-lg">
      {{ error.message || 'An error occurred' }}
    </div>

    <slot v-else />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  loading: boolean | undefined
  error: any
}>()
</script> 