<template>
  <UTabs :items="items" variant="link" class="gap-4 w-full" :ui="{ trigger: 'flex-1' }">
    <template #connection-string>
      <ConnectionStringForm
        :model-value="formState"
        :is-editing="isEditing"
      />
    </template>

    <template #manual>
      <ManualConnectionForm
        :model-value="formState"
        :is-editing="isEditing"
      />
    </template>
  </UTabs>
</template>

<script setup lang="ts">
import ConnectionStringForm from "./ConnectionStringForm.vue";
import ManualConnectionForm from "./ManualConnectionForm.vue";
import type { TabsItem } from '@nuxt/ui'

defineProps<{
  formState: ReturnType<typeof useConnectionForm>;
  isEditing?: boolean;
}>();

const items = [
  {
    label: 'Connection String',
    icon: 'i-heroicons-link',
    slot: 'connection-string' as const
  },
  {
    label: 'Manual Input',
    icon: 'i-heroicons-pencil-square',
    slot: 'manual' as const
  }
] satisfies TabsItem[]
</script>
