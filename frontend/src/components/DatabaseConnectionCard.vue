<template>
  <div class="bg-white border border-gray-200 rounded p-4 shadow-sm">
    <div class="flex items-center justify-between mb-2">
      <div>
        <h3 class="font-semibold text-gray-800">{{ connection.name }}</h3>
        <p class="text-sm text-gray-600">{{ connection.type }} • {{ connection.host }}:{{ connection.port }}</p>
      </div>
      <div class="flex gap-2">
        <button class="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-1" @click="editConnection">
          <Edit class="w-3 h-3" />
          Edit
        </button>
        <button class="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-1" @click="deleteConnection" :disabled="isDeleting">
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
        <div class="flex items-center gap-1 text-xs text-gray-500">
          <span v-if="lastUpdate">
            Updated {{ formatRelativeDate(lastUpdate) }}
          </span>
          <button
            class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
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
          class="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 text-left flex items-center gap-1"
        >
          <Database class="w-3 h-3" />
          {{ db }}
        </button>
      </div>
    </template>
    <template v-else>
      <hr class="my-3">
      <button
        class="w-full py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center gap-2"
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