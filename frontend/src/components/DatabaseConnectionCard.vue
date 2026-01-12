<template>
  <div class="bg-surface border border-border rounded p-4 shadow-sm">
    <div class="flex items-center justify-between mb-2">
      <div>
        <h3 class="font-semibold text-foreground">{{ connection.name }}</h3>
        <p class="text-sm text-foreground-secondary">{{ connection.type }} • {{ connection.host }}:{{ connection.port }}</p>
      </div>
      <div class="flex gap-2">
        <button class="btn-secondary" @click="editConnection">
          <Edit class="w-3 h-3" />
          Edit
        </button>
        <button class="btn-danger" @click="deleteConnection" :disabled="isDeleting">
          <Trash class="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>

    <!-- Databases Section -->
    <template v-if="databases?.length">
      <hr class="my-3">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-medium">Databases</span>
        <div class="flex items-center gap-1 text-xs text-foreground-secondary">
          <span v-if="lastUpdate">
            Updated {{ formatRelativeDate(lastUpdate) }}
          </span>
          <button
            class="btn-primary"
            @click="refreshDatabases"
            :disabled="isLoading"
          >
            <RefreshCw class="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        <button
          v-for="db in databases"
          :key="db"
          @click="selectDatabase(db)"
          class="px-2 py-1 text-sm border border-border rounded hover:bg-surface-hover text-left flex items-center gap-1"
        >
          <Database class="w-3 h-3" />
          {{ db }}
        </button>
      </div>
    </template>
    <template v-else>
      <hr class="my-3">
      <button
        class="w-full btn-primary justify-center"
        @click="loadDatabases"
        :disabled="isLoading"
      >
        <Database class="w-4 h-4" />
        Load Databases
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Database, Edit, Trash, RefreshCw } from 'lucide-vue-next'
import { formatRelativeDate } from '../utils/date'
import { GetDatabases, DeleteConnection } from 'wailsjs/go/main/App'
import type { Connection } from '~/types/wails'

const props = defineProps<{
  connection: Connection
}>()

const emit = defineEmits<{
  (e: 'delete'): void
  (e: 'edit', connection: Connection): void
  (e: 'selectDatabase', db: string): void
}>()

const databases = ref<string[]>([])
const error = ref<any>()
const isLoading = ref(false)
const lastUpdate = ref<Date>()
const isDeleting = ref(false)
const deleteError = ref<any>()

async function deleteConnection() {
  isDeleting.value = true
  deleteError.value = null

  try {
    await DeleteConnection(props.connection.id)
    emit('delete')
  } catch (err) {
    deleteError.value = err
  } finally {
    isDeleting.value = false
  }
}

async function loadDatabases() {
  isLoading.value = true
  error.value = null
  try {
    databases.value = await GetDatabases(props.connection.id, false)
    lastUpdate.value = new Date()
  } catch (err) {
    error.value = err
  } finally {
    isLoading.value = false
  }
}

async function refreshDatabases() {
  isLoading.value = true
  error.value = null
  try {
    databases.value = await GetDatabases(props.connection.id, true)
    lastUpdate.value = new Date()
  } catch (err) {
    error.value = err
  } finally {
    isLoading.value = false
  }
}

const editConnection = () => {
  emit('edit', props.connection)
}

const selectDatabase = (db: string) => {
  emit('selectDatabase', db)
}

// Auto-load databases on mount
onMounted(() => {
  loadDatabases()
})
</script> 