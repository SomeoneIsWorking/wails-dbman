<template>
  <ConnectionForm
    title="Edit Connection"
    :is-editing="true"
    :loading="isLoading"
    :error="error"
    :form-state="connectionForm"
    save-button-text="Save Changes"
    @save="updateConnection"
  />
</template>

<script setup lang="ts">
import type { ConnectionForm, Connection } from '~/types/connection'
import { getDefaultPort } from '~/utils/database'

const route = useRoute()
const { data, error, isLoading, fetch } = useAsyncFetch<Connection>()

const connectionForm = useConnectionForm()

// Set form values from existing connection
watchEffect(async () => {
  if (!data.value) {
    const response = await fetch(`/api/connections/${route.params.id}`)
    if (response) {
      Object.assign(connectionForm.form, {
        ...response,
        port: response.port.toString(),
        password: '' // Don't populate password field
      })
    }
  }
})

async function updateConnection() {
  await fetch(`/api/connections/${route.params.id}`, {
    method: 'PUT',
    body: {
      ...connectionForm.form,
      port: parseInt(connectionForm.form.port || getDefaultPort(connectionForm.form.type))
    }
  })
  await navigateTo('/')
}
</script>