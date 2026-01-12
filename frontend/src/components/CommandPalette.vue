<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="close">
    <div class="bg-white rounded-lg shadow-lg w-full max-w-md mx-4" @click.stop>
      <div class="p-4 border-b">
        <div class="flex items-center">
          <Search class="w-5 h-5 mr-2 text-gray-400" />
          <input
            v-model="search"
            type="text"
            placeholder="Search tables and stored procedures..."
            class="flex-1 outline-none"
            @keydown.down.prevent="navigateResults(1)"
            @keydown.up.prevent="navigateResults(-1)"
            @keydown.enter.prevent="selectResult"
            @keydown.esc="close"
            ref="searchInput"
          />
        </div>
      </div>
      <div class="p-4 max-h-96 overflow-y-auto">
        <div v-if="isLoading" class="text-center py-4">
          <Loader class="w-6 h-6 animate-spin mx-auto text-blue-500" />
        </div>
        <div v-else-if="results.length === 0" class="py-2 text-center text-gray-500">
          No results found
        </div>
        <div v-else class="space-y-1">
          <button
            v-for="(result, index) in results"
            :key="result.id"
            class="w-full text-left p-2 rounded hover:bg-gray-100 flex items-center"
            :class="{ 'bg-gray-200': index === selectedIndex }"
            @click="selectResult"
            @mouseenter="selectedIndex = index"
          >
            <component :is="getIcon(result.type)" class="w-4 h-4 mr-2" />
            <div class="flex-1">
              <div class="font-semibold">{{ result.name }}</div>
              <div class="text-xs text-gray-500">{{ result.path }}</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Search, Table, Settings, File, Loader } from 'lucide-vue-next'
import { Search as SearchAPI } from 'wailsjs/go/main/App'
import { SearchResult } from '@/types/wails'
import { useTabsStore } from '@/stores/tabsStore'


const tabsStore = useTabsStore()
const isOpen = ref(false)
const search = ref('')
const selectedIndex = ref(0)
const results = ref<SearchResult[]>([])
const isLoading = ref(false)
const searchInput = ref<HTMLInputElement>()

const performSearch = async (query: string) => {
  if (!query) {
    results.value = []
    return
  }
  // For now, search without specific connection/database context
  // TODO: Get current active connection/database from global state
  const connectionId = 'default'
  const database = 'master'

  isLoading.value = true
  try {
    results.value = await SearchAPI(query, connectionId, database)
  } catch (e) {
    results.value = []
  } finally {
    isLoading.value = false
  }
}

// Watch search input
watch(search, (newValue) => {
  performSearch(newValue)
})

// Keyboard shortcut to open command palette
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    open()
  }
}

// Add keyboard shortcut listener
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const open = () => {
  isOpen.value = true
  search.value = ''
  selectedIndex.value = 0
  nextTick(() => {
    searchInput.value?.focus()
  })
}

const close = () => {
  isOpen.value = false
  search.value = ''
  results.value = []
}

const navigateResults = (direction: number) => {
  selectedIndex.value = (selectedIndex.value + direction + results.value.length) % results.value.length
}

const selectResult = () => {
  if (results.value.length === 0) return

  const result = results.value[selectedIndex.value]

  switch (result.type) {
    case 'table':
      tabsStore.addTableTab(result.connectionId, result.database!, result.schema!, result.objectName!)
      break
    case 'view':
      tabsStore.addViewTab(result.connectionId, result.database!, result.schema!, result.objectName!)
      break
    case 'procedure':
      tabsStore.addProcedureTab(result.connectionId, result.database!, result.schema!, result.objectName!)
      break
  }

  close()
}

const getIcon = (type: string) => {
  switch (type) {
    case 'table':
      return Table
    case 'procedure':
      return Settings
    default:
      return File
  }
}

// Expose methods to parent
defineExpose({
  open,
  close,
})
</script> 