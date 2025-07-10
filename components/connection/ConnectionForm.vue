<template>
  <div class="max-w-2xl mx-auto">
    <h2 class="text-lg font-semibold mb-4">{{ title }}</h2>

    <AsyncWrapper :loading="isLoading" :error="error">
      <div class="space-y-6">
        <UFormField label="Connection Name">
          <UInput v-model="form.name" placeholder="My Database" class="w-full" />
        </UFormField>

        <UFormField label="Database Type">
          <USelect
            v-model="form.type"
            :items="databaseTypes"
            class="w-full"
          />
        </UFormField>

        <ConnectionTabs 
          :form-state="formState"
          :is-editing="isEditing"
        />

        <div class="flex justify-end space-x-2">
          <UButton color="neutral" variant="ghost" label="Cancel" to="/" />
          <UButton
            color="primary"
            :loading="isLoading"
            :disabled="isLoading"
            @click="onSave"
          >
            {{ saveButtonText }}
          </UButton>
        </div>
      </div>
    </AsyncWrapper>
  </div>
</template>

<script setup lang="ts">
import type { ConnectionForm } from '~/types/connection'

const props = defineProps<{
  title: string
  isEditing?: boolean
  isLoading?: boolean
  error?: any
  formState: ReturnType<typeof useConnectionForm>
  saveButtonText?: string
}>()

const emit = defineEmits<{
  (e: 'save'): void
}>()

const { form } = props.formState

const databaseTypes = [
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'MySQL', value: 'mysql' },
  { label: 'Microsoft SQL Server', value: 'mssql' }
]

function onSave() {
  emit('save')
}
</script> 