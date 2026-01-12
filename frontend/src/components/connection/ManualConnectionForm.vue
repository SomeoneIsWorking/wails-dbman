<template>
  <div class="space-y-6">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Host</label>
      <input
        v-model="form.host"
        type="text"
        placeholder="localhost"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Port</label>
      <input
        v-model="form.port"
        type="number"
        :placeholder="getDefaultPort(form.type)"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
      <input
        v-model="form.username"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
      <input
        v-model="form.password"
        type="password"
        :placeholder="isEditing ? 'Leave empty to keep current password' : undefined"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { getDefaultPort } from '../../utils/database'
import { useConnectionForm } from '../../composables/useConnectionForm'

const props = defineProps<{
  modelValue: ReturnType<typeof useConnectionForm>
  isEditing?: boolean
}>()

const { form } = props.modelValue
</script>