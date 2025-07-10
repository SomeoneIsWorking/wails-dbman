<template>
  <div class="space-y-6">
    <UFormField label="Connection String">
      <UInput 
        v-model="connectionString" 
        placeholder="e.g. postgresql://user:pass@localhost:5432/db or Server=localhost;Database=mydb;..." 
        class="w-full"
      />
    </UFormField>

    <div v-if="connectionString" class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div class="space-y-3 text-sm">
        <div>Host: <span class="font-medium">{{ form.host || '-' }}</span></div>
        <div>Port: <span class="font-medium">{{ form.port || getDefaultPort(form.type) }}</span></div>
        <div>Username: <span class="font-medium">{{ form.username || '-' }}</span></div>
        <div>Password: <span class="font-medium">***</span></div>
        <div>
          <span class="font-medium" :class="isValid ? 'text-green-600' : 'text-red-600'">
            {{ isValid ? '✓ Valid connection string' : '✗ Invalid connection string' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DatabaseType } from '~/types/connection'
import { getDefaultPort } from '~/utils/database'

const props = defineProps<{
  modelValue: ReturnType<typeof useConnectionForm>
}>()

const connectionString = ref('')
const isValid = ref(false)

const { form } = props.modelValue


watch(connectionString, (newStr) => {
  if (!newStr) {
    isValid.value = false
    return
  }
  
  isValid.value = props.modelValue.parseConnectionString(newStr)
})
</script>