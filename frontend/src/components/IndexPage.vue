<template>
  <div>
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="animate-pulse bg-gray-200 h-20 rounded"></div>
    </div>
    <div v-else-if="connections?.length === 0" class="text-center py-8">
      <Database class="w-16 h-16 mb-4 text-gray-400" />
      <h3 class="text-lg font-semibold mb-2">No Database Connections</h3>
      <p class="text-gray-600 mb-4">
        Get started by adding your first database connection
      </p>
      <button
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
        @click="$emit('newConnection')"
      >
        <Plus class="w-4 h-4" />
        Add Connection
      </button>
    </div>
    <div v-else class="space-y-4">
      <DatabaseConnectionCard
        v-for="conn in connections"
        :key="conn.id"
        :connection="conn"
        @delete="loadConnections"
        @edit="$emit('editConnection', $event)"
      />
    </div>

    <button
      class="fixed bottom-4 right-4 w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600"
      @click="$emit('newConnection')"
    >
      <Plus class="w-6 h-6" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Database, Plus } from 'lucide-vue-next'
import { GetConnections } from 'wailsjs/go/main/App'
import type { Connection } from '~/types/wails'
import DatabaseConnectionCard from './DatabaseConnectionCard.vue'

const connections = ref<Connection[]>([])
const isLoading = ref(true)

const loadConnections = async () => {
  isLoading.value = true
  try {
    connections.value = await GetConnections()
  } finally {
    isLoading.value = false
  }
}

onMounted(loadConnections)

defineEmits<{
  newConnection: []
  editConnection: [connection: Connection]
}>()
</script>