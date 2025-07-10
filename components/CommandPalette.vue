<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex grow items-center gap-2">
        <UIcon name="i-heroicons-magnifying-glass" class="w-5 h-5 text-gray-500" />
        <input
          v-model="search"
          type="text"
          placeholder="Search tables and stored procedures..."
          class="w-full bg-transparent border-none focus:ring-0 p-0"
          @keydown.down.prevent="navigateResults(1)"
          @keydown.up.prevent="navigateResults(-1)"
          @keydown.enter.prevent="selectResult"
          @keydown.esc.prevent="close"
        />
      </div>
    </template>

    <template #body>
      <div class="max-h-[60vh] overflow-y-auto">
        <div v-if="isLoading" class="flex justify-center py-4">
          <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-500" />
        </div>
        <div v-else-if="results.length === 0" class="py-2 text-center text-gray-500">
          No results found
        </div>
        <div v-else class="space-y-1">
          <button
            v-for="(result, index) in results"
            :key="result.id"
            class="w-full px-2 py-1 text-left rounded-lg flex items-center gap-2 hover-contrast"
            :class="{ 'bg-gray-100 text-gray-900': index === selectedIndex }"
            @click="selectResult"
            @mouseenter="selectedIndex = index"
          >
            <UIcon :name="getIcon(result.type)" class="w-5 h-5 text-gray-500" />
            <div class="flex-1">
              <div class="font-medium">{{ result.name }}</div>
              <div class="text-sm text-gray-500">{{ result.path }}</div>
            </div>
          </button>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { debounce } from 'lodash-es'
import { useAsyncFetch } from '@/composables/useAsyncFetch'

interface SearchResult {
  id: string
  name: string
  path: string
  type: 'table' | 'procedure'
  connectionId: string
  database: string
  schema?: string
  objectName?: string
}

const router = useRouter()
const route = useRoute()
const isOpen = ref(false)
const search = ref('')
const selectedIndex = ref(0)
const results = ref<SearchResult[]>([])
const { fetch, isLoading } = useAsyncFetch()

const performSearch = debounce(async (query: string) => {
  if (!query) {
    results.value = []
    return
  }
  // Check if we're on a database-specific page
  const connectionId = route.params.id as string
  const database = route.params.database as string
  
  const searchResults = await fetch('/api/search', {
    method: 'POST',
    body: JSON.stringify({ 
      query,
      connectionId,
      database
    }),
  })
  if (searchResults) {
    results.value = searchResults
  }
}, 300)

// Watch search input and call debounced function
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
  let path = ''
  
  switch (result.type) {
    case 'table':
      path = `/connections/${result.connectionId}/${result.database}/tables/${result.schema}.${result.objectName}`
      break
    case 'procedure':
      path = `/connections/${result.connectionId}/${result.database}/procedures/${result.schema}.${result.objectName}`
      break

  }
  
  router.push(path)
  close()
}

const getIcon = (type: string) => {
  switch (type) {
    case 'table':
      return 'i-heroicons-table-cells'
    case 'procedure':
      return 'i-heroicons-command-line'

    default:
      return 'i-heroicons-document'
  }
}

// Expose methods to parent
defineExpose({
  open,
  close,
})
</script> 