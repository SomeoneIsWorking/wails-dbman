<template>
  <div class="space-y-4">
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-8">
      <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto mb-2"></div>
      <span class="text-sm font-bold text-foreground-secondary uppercase tracking-widest">Loading Details</span>
    </div>
    <div v-else-if="error" class="bg-red-500/10 border border-red-500/20 rounded p-3 text-xs text-red-600 dark:text-red-400 font-medium">
      {{ error }}
    </div>
    <div v-else class="space-y-4">
      <div class="grid grid-cols-[120px_1fr] gap-3 items-center">
        <label class="text-right pr-2">Connection Name</label>
        <input
          v-model="form.name"
          type="text"
          placeholder="e.g. Production DB"
          class="w-full"
        />

        <label class="text-right pr-2">Database Type</label>
        <select
          v-model="form.type"
          class="w-full"
        >
          <option v-for="type in databaseTypes" :key="type.value" :value="type.value">
            {{ type.title }}
          </option>
        </select>
      </div>

      <div class="border-t border-border pt-4">
        <ConnectionTabs
          :form-state="formState"
          :is-editing="isEditing"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ConnectionTabs from './ConnectionTabs.vue'
import { useConnectionForm } from '../../composables/useConnectionForm';

const props = defineProps<{
  isEditing?: boolean
  isLoading?: boolean
  error?: any
  formState: ReturnType<typeof useConnectionForm>
}>()

const { form } = props.formState

const databaseTypes = [
  { title: 'PostgreSQL', value: 'postgresql' },
  { title: 'MySQL', value: 'mysql' },
  { title: 'Microsoft SQL Server', value: 'mssql' }
]
</script> 