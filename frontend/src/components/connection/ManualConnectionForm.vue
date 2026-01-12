<template>
  <div class="grid grid-cols-[auto_1fr] gap-2 items-center">
    <label class="text-sm font-medium text-foreground text-right">Host</label>
    <input
      v-model="form.host"
      type="text"
      placeholder="localhost"
      class="w-full px-2 py-1"
    />

    <label class="text-sm font-medium text-foreground text-right">Port</label>
    <input
      v-model="form.port"
      type="number"
      :placeholder="getDefaultPort(form.type)"
      class="w-full px-2 py-1"
    />

    <label class="text-sm font-medium text-foreground text-right">Username</label>
    <input
      v-model="form.username"
      type="text"
      class="w-full px-2 py-1"
    />

    <label class="text-sm font-medium text-foreground text-right">Password</label>
    <input
      v-model="form.password"
      type="password"
      :placeholder="isEditing ? 'Leave empty to keep current password' : undefined"
      class="w-full px-2 py-1"
    />
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