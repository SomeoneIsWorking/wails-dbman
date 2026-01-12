<template>
  <div>
    <h2 class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
      <Database class="w-4 h-4" />
      Connections
    </h2>
    <div v-for="conn in connections" :key="conn.id" class="mb-1">
      <div
        class="flex items-center cursor-pointer hover:bg-gray-100 p-1 rounded"
        @click="toggleExpanded(conn.id)"
      >
        <component :is="expanded[conn.id] ? ChevronDown : ChevronRight" class="w-3 h-3 mr-1" />
        <Database class="w-4 h-4 mr-2" />
        <span class="text-sm">{{ conn.name }} ({{ conn.type }})</span>
      </div>
      <div v-if="expanded[conn.id]" class="ml-6 text-xs text-gray-600">
        <p>Host: {{ conn.host || 'N/A' }}</p>
        <p>Database: {{ conn.database || 'N/A' }}</p>
        <button
          class="mt-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
          @click="selectConnection(conn)"
        >
          <ExternalLink class="w-3 h-3" />
          Open
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Database, ChevronRight, ChevronDown, ExternalLink } from 'lucide-vue-next'
import { GetConnections } from 'wailsjs/go/main/App'

const connections = ref([])
const expanded = ref({})

onMounted(async () => {
  connections.value = await GetConnections()
})

const toggleExpanded = (id) => {
  expanded.value[id] = !expanded.value[id]
}

const selectConnection = (conn) => {
  // Handle selection - maybe navigate to database page
  console.log('Selected', conn)
}
</script>