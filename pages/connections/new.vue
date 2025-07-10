<template>
  <ConnectionForm
    title="New Database Connection"
    :loading="isLoading"
    :error="error"
    :form-state="connectionForm"
    save-button-text="Save Connection"
    @save="saveConnection"
  />
</template>

<script setup lang="ts">
import type { ConnectionForm } from "~/types/connection";
import { getDefaultPort } from '~/utils/database'

const connectionForm = useConnectionForm();
const { error, isLoading, fetch } = useAsyncFetch();

async function saveConnection() {
  await fetch("/api/connections", {
    method: "POST",
    body: {
      ...connectionForm.form,
      port: parseInt(
        connectionForm.form.port || getDefaultPort(connectionForm.form.type)
      ),
    },
  });
  await navigateTo("/");
}
</script>
