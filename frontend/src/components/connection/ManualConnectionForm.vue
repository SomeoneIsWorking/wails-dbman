<template>
  <div class="grid grid-cols-[120px_1fr] gap-3 items-center">
    <label class="text-right pr-2">Host</label>
    <div class="flex gap-2">
      <input
        v-model="form.host"
        type="text"
        placeholder="localhost"
        class="flex-1"
      />
      <div class="flex items-center gap-2">
        <label class="whitespace-nowrap">Port</label>
        <input
          v-model="form.port"
          type="number"
          :placeholder="getDefaultPort(form.type)"
          class="w-24"
        />
      </div>
    </div>

    <label class="text-right pr-2">Username</label>
    <input
      v-model="form.username"
      type="text"
      placeholder="e.g. root"
      class="w-full"
    />

    <label class="text-right pr-2">Password</label>
    <input
      v-model="form.password"
      type="password"
      :placeholder="isEditing ? '••••••••' : 'Password'"
      class="w-full"
    />

    <label class="text-right pr-2">Database</label>
    <input
      v-model="form.database"
      type="text"
      placeholder="e.g. postgres (optional)"
      class="w-full"
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