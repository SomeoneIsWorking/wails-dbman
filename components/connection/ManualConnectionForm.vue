<template>
  <div class="space-y-6">
    <UFormField label="Host">
      <UInput v-model="form.host" placeholder="localhost" class="w-full" />
    </UFormField>

    <UFormField label="Port">
      <UInput
        v-model="form.port"
        type="number"
        :placeholder="getDefaultPort(form.type)"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Username">
      <UInput v-model="form.username" class="w-full" />
    </UFormField>

    <UFormField label="Password">
      <UInput 
        v-model="form.password" 
        type="password"
        :placeholder="isEditing ? 'Leave empty to keep current password' : undefined"
        class="w-full"
      />
    </UFormField>
  </div>
</template>

<script setup lang="ts">
import { getDefaultPort } from '~/utils/database'

const props = defineProps<{
  modelValue: ReturnType<typeof useConnectionForm>
  isEditing?: boolean
}>()

const { form } = props.modelValue
</script>