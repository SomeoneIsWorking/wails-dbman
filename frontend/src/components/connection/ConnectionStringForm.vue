<template>
  <div class="space-y-6">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Connection String</label>
      <input
        v-model="connectionString"
        type="text"
        placeholder="e.g. postgresql://user:pass@localhost:5432/db or Server=localhost;Database=mydb;..."
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div v-if="connectionString" class="p-4 bg-gray-100 rounded">
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
import { ref, watch, onMounted } from 'vue'
import { getDefaultPort } from '../../utils/database'
import { useConnectionForm } from '../../composables/useConnectionForm';

const props = defineProps<{
  modelValue: ReturnType<typeof useConnectionForm>
  isEditing?: boolean
}>()

const connectionString = ref('')
const isValid = ref(false)

const { form } = props.modelValue

// Generate connection string from form data
const generateConnectionString = () => {
  const { type, host, port, username, password, database } = form
  if (!type || !host) return ''

  switch (type) {
    case 'postgresql':
      return `postgresql://${username || ''}${password ? `:${password}` : ''}${username || password ? '@' : ''}${host}${port ? `:${port}` : ''}/${database || ''}`
    case 'mysql':
      return `mysql://${username || ''}${password ? `:${password}` : ''}${username || password ? '@' : ''}${host}${port ? `:${port}` : ''}/${database || ''}`
    case 'mssql':
      return `Server=${host}${port ? `,${port}` : ''};Database=${database || ''};User Id=${username || ''};Password=${password || ''};`
    default:
      return ''
  }
}

onMounted(() => {
  if (props.isEditing) {
    connectionString.value = generateConnectionString()
    isValid.value = true
  }
})

watch(connectionString, (newStr) => {
  if (!newStr) {
    isValid.value = false
    return
  }

  isValid.value = props.modelValue.parseConnectionString(newStr)
})
</script>