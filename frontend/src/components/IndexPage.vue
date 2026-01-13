<template>
  <ScrollView class="h-full p-4">
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="animate-pulse bg-surface-hover h-32 rounded-lg border border-border/50"></div>
    </div>
    
    <div v-else-if="connections?.length === 0" class="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div class="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mb-6">
        <Database class="w-8 h-8 text-foreground-secondary/50" />
      </div>
      <h3 class="text-sm font-bold text-foreground uppercase tracking-widest mb-2">No Connections</h3>
      <p class="text-xs text-foreground-secondary mb-6 max-w-[200px] mx-auto opacity-70">
        Get started by adding your first database connection.
      </p>
      <button
        class="group btn-accent !px-6 !py-2 !text-xs !font-bold uppercase tracking-widest shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95"
        @click="$emit('newConnection')"
      >
        <Plus class="w-4 h-4 mr-1 group-hover:rotate-90 transition-transform duration-300" />
        Add Connection
      </button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <DatabaseConnectionCard
        v-for="conn in connections"
        :key="conn.id"
        :connection="conn"
        @delete="loadConnections"
        @edit="$emit('editConnection', $event)"
      />
      
      <!-- Quick Add Card -->
      <button 
        @click="$emit('newConnection')"
        class="h-[120px] rounded border-2 border-dashed border-border/40 hover:border-accent/40 hover:bg-accent/[0.02] flex flex-col items-center justify-center gap-2 group transition-all"
      >
        <div class="w-8 h-8 rounded-full border border-border group-hover:border-accent/40 flex items-center justify-center transition-colors">
          <Plus class="w-4 h-4 text-foreground-secondary group-hover:text-accent" />
        </div>
        <span class="text-sm font-bold uppercase tracking-widest text-foreground-secondary group-hover:text-accent">New Connection</span>
      </button>
    </div>
  </ScrollView>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Database, Plus } from 'lucide-vue-next'
import { GetConnections } from 'wailsjs/go/main/App'
import type { Connection } from '~/types/wails'
import DatabaseConnectionCard from './DatabaseConnectionCard.vue'
import ScrollView from './ScrollView.vue'

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