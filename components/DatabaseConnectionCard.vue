<template>
  <UCard>
    <div class="flex items-center justify-between">
      <div>
        <h3 class="font-semibold">{{ connection.name }}</h3>
        <p class="text-sm text-gray-500">{{ connection.type }} • {{ connection.host }}:{{ connection.port }}</p>
      </div>
      <div class="flex gap-2">
        <UButton color="neutral" variant="ghost" icon="i-heroicons-pencil-square" :to="`/connections/edit/${connection.id}`" />
        <AsyncWrapper :loading="isDeleting" :error="deleteError">
          <UButton 
            color="neutral" 
            variant="ghost" 
            icon="i-heroicons-trash" 
            @click="deleteConnection"
          />
        </AsyncWrapper>
      </div>
    </div>

    <!-- Databases Section -->
    <template v-if="databases?.length">
      <USeparator class="my-3" />
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-medium">Databases</span>
        <div class="flex items-center gap-1 text-xs text-gray-500">
          <span v-if="lastUpdate">
            Updated {{ formatRelativeDate(lastUpdate) }}
          </span>
          <AsyncWrapper :loading="isLoading" :error="error">
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-heroicons-arrow-path"
              @click="refreshDatabases"
              title="Refresh databases"
            />
          </AsyncWrapper>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        <UButton
          v-for="db in databases"
          :key="db"
          :to="`/connections/${connection.id}/${db}`"
          color="neutral"
          variant="soft"
          class="justify-start hover-contrast"
        >
          <template #leading>
            <UIcon name="i-heroicons-circle-stack-20-solid" />
          </template>
          {{ db }}
        </UButton>
      </div>
    </template>
    <template v-else>
      <USeparator class="my-3" />
      <AsyncWrapper :loading="isLoading" :error="error">
        <UButton
          v-if="!databases"
          block
          color="neutral"
          variant="ghost"
          @click="loadDatabases"
        >
          Load Databases
        </UButton>
      </AsyncWrapper>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { formatRelativeDate } from '~/utils/date'

interface Connection {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}

const props = defineProps<{
  connection: Connection
}>()

const emit = defineEmits<{
  (e: 'delete'): void
}>()

const { data: databases, error, isLoading, fetch: fetchDatabases } = useAsyncFetch<string[]>()
const lastUpdate = ref<Date>()
const isDeleting = ref(false)
const deleteError = ref<any>()

async function deleteConnection() {
  isDeleting.value = true
  deleteError.value = null
  
  try {
    await $fetch(`/api/connections/${props.connection.id}`, { method: 'DELETE' })
    emit('delete')
  } catch (err) {
    deleteError.value = err
  } finally {
    isDeleting.value = false
  }
}

async function loadDatabases() {
  try {
    const response = await fetchDatabases(`/api/connections/${props.connection.id}/databases`)
    if (response) {
      lastUpdate.value = new Date()
    }
  } catch (err) {
    // Error is handled by useAsyncFetch
  }
}

async function refreshDatabases() {
  try {
    const response = await fetchDatabases(`/api/connections/${props.connection.id}/databases`, {
      query: { invalidate: 'true' }
    })
    if (response) {
      lastUpdate.value = new Date()
    }
  } catch (err) {
    // Error is handled by useAsyncFetch
  }
}

// Auto-load databases on mount
onMounted(() => {
  loadDatabases()
})
</script> 