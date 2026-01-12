<template>
  <div class="h-full flex flex-col">
    <div class="p-4 border-b border-gray-200 bg-gray-50">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Eye class="w-5 h-5 text-purple-600" />
          <h3 class="text-lg font-semibold">{{ tab.objectName }}</h3>
          <span class="text-sm text-gray-500">({{ viewData?.length || 0 }} rows)</span>
        </div>
        <div class="flex items-center gap-2">
          <button class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm" @click="refreshData">
            Refresh
          </button>
          <button class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
            Export
          </button>
        </div>
      </div>
    </div>
    <div class="flex-1 overflow-auto">
      <div v-if="error" class="flex items-center justify-center h-full">
        <div class="text-center text-red-600">
          <AlertTriangle class="w-12 h-12 mx-auto mb-4" />
          <h4 class="text-lg font-semibold mb-2">Failed to load view data</h4>
          <p class="text-sm">{{ error }}</p>
        </div>
      </div>
      <DataTable v-else :data="viewData" :columns="viewColumns" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Eye, AlertTriangle } from 'lucide-vue-next'
import DataTable from '../DataTable.vue'
import { ViewTab } from '@/stores/tabsStore'

interface Props {
  tab: ViewTab
}

defineProps<Props>()

const viewData = ref<any[]>([])
const viewColumns = ref<string[]>([])
const error = ref<string | null>(null)

const loadViewData = async () => {
  try {
    error.value = null

    // TODO: Implement actual view data loading via Wails
    viewData.value = []
    viewColumns.value = []

  } catch (err: any) {
    error.value = err.message
    viewData.value = []
    viewColumns.value = []
  }
}

const refreshData = () => {
  loadViewData()
}

onMounted(() => {
  loadViewData()
})
</script>