<template>
  <UModal :open="modelValue" @update:open="$emit('update:modelValue', $event)">
    <template #header>
      <h3 class="text-base font-semibold">Change Database</h3>
    </template>
    <template #body>
      <div v-if="!databases" class="flex justify-center py-4">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-600" />
      </div>
      <div v-else-if="databases.length === 0" class="text-center py-4 text-gray-500">
        No databases found
      </div>
      <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-2">
        <NuxtLink
          v-for="db in databases"
          :key="db"
          :to="`/connections/${connectionId}/${db}`"
          class="block"
          @click="$emit('update:modelValue', false)"
        >
          <UButton
            :variant="db === currentDatabase ? 'solid' : 'soft'"
            color="neutral"
            class="justify-start w-full hover-contrast"
          >
            <template #leading>
              <UIcon name="i-heroicons-circle-stack-20-solid" />
            </template>
            {{ db }}
          </UButton>
        </NuxtLink>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <UButton color="neutral" @click="$emit('update:modelValue', false)">
          Cancel
        </UButton>
        <UButton color="primary" @click="$emit('update:modelValue', false)">
          Close
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAsyncFetch } from "~/composables/useAsyncFetch";

const props = defineProps<{
  modelValue: boolean;
  connectionId: string;
  currentDatabase: string;
}>();

defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const { data: databases, fetch: fetchDatabases } = useAsyncFetch<string[]>();

// Initial data loading
onMounted(async () => {
  await fetchDatabases(`/api/connections/${props.connectionId}/databases`);
});
</script> 