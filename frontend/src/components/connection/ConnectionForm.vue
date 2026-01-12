<template>
  <div>
    <h2 class="text-lg font-semibold mb-4">{{ title }}</h2>

    <div v-if="isLoading" class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
    </div>
    <div v-else-if="error" class="text-red-600">{{ error }}</div>
    <div v-else class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Connection Name</label>
        <input
          v-model="form.name"
          type="text"
          placeholder="My Database"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Database Type</label>
        <select
          v-model="form.type"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option v-for="type in databaseTypes" :key="type.value" :value="type.value">
            {{ type.title }}
          </option>
        </select>
      </div>

      <ConnectionTabs
        :form-state="formState"
        :is-editing="isEditing"
      />

    </div>
  </div>
</template>

<script setup lang="ts">
import ConnectionTabs from './ConnectionTabs.vue'
import { useConnectionForm } from '../../composables/useConnectionForm';

const props = defineProps<{
  title: string
  isEditing?: boolean
  isLoading?: boolean
  error?: any
  formState: ReturnType<typeof useConnectionForm>
  saveButtonText?: string
}>()

const { form } = props.formState

const databaseTypes = [
  { title: 'PostgreSQL', value: 'postgresql' },
  { title: 'MySQL', value: 'mysql' },
  { title: 'Microsoft SQL Server', value: 'mssql' }
]
</script> 