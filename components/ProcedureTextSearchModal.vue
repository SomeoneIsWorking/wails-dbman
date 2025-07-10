<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex grow items-center gap-2">
        <UIcon name="i-heroicons-magnifying-glass" class="w-5 h-5 text-gray-500" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search within stored procedure definitions..."
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
        <div v-else-if="searchResults.length === 0" class="py-2 text-center text-gray-500">
          No results found
        </div>
        <div v-else class="space-y-1">
          <button
            v-for="(result, index) in searchResults"
            :key="`${result.connectionId}-${result.database}-${result.name}`"
            class="w-full px-2 py-1 text-left rounded-lg flex items-center gap-2 hover-contrast"
            :class="{ 'bg-gray-100 text-gray-900': index === selectedIndex }"
            @click="selectResult"
            @mouseenter="selectedIndex = index"
          >
            <UIcon :name="getIconForType(result.type)" class="w-5 h-5 text-gray-500" />
            <div class="flex-1">
              <div class="font-medium">{{ result.name }}</div>
              <div class="text-sm text-gray-500">{{ result.connectionName }} • {{ result.database }}</div>
              <div v-if="result.matchedText" class="text-xs text-gray-400 mt-1 font-mono bg-gray-50 p-1 rounded">
                ...{{ result.matchedText }}...
              </div>
            </div>
          </button>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { debounce } from 'lodash-es'
import { useAsyncFetch } from '~/composables/useAsyncFetch'

interface SearchResult {
  connectionId: string;
  connectionName: string;
  database: string;
  type: 'procedure';
  name: string;
  definition: string;
  matchedText?: string;
}

const router = useRouter()
const isOpen = ref(false)
const searchQuery = ref('')
const selectedIndex = ref(0)
const searchResults = ref<SearchResult[]>([])
const { fetch, isLoading } = useAsyncFetch()

const performSearch = debounce(async (query: string) => {
  if (!query) {
    searchResults.value = []
    return
  }
  const results = await fetch('/api/search', {
    query: { q: query }
  })
  if (results) {
    searchResults.value = results
  }
}, 300)

// Watch search input and call debounced function
watch(searchQuery, (newValue) => {
  performSearch(newValue)
})

// Keyboard shortcut to open search modal
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
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
  searchQuery.value = ''
  selectedIndex.value = 0
}

const close = () => {
  isOpen.value = false
  searchQuery.value = ''
  searchResults.value = []
}

const navigateResults = (direction: number) => {
  selectedIndex.value = (selectedIndex.value + direction + searchResults.value.length) % searchResults.value.length
}

const selectResult = () => {
  if (searchResults.value.length === 0) return
  
  const result = searchResults.value[selectedIndex.value]
  let path = ''
  
  // Only procedure type now
  path = `/connections/${result.connectionId}/${result.database}/procedures/${result.name}`
  
  router.push(path)
  close()
}

function getIconForType(type: 'procedure'): string {
  return 'i-heroicons-code-bracket'
}

const handleSelect = (result: any) => {
  if (result.url) {
    navigateTo(result.url)
    isOpen.value = false
  }
}

// Expose methods to parent
defineExpose({
  open,
  close,
})
</script> 