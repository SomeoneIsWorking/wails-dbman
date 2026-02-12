<template>
  <div class="h-full flex flex-col" :key="tabsStore.activeTab?.id">
    <!-- Query Tab Content -->
    <QueryTabContent v-if="tabsStore.activeTab?.type === 'query'" :tab="tabsStore.activeTab" />

    <!-- Table Tab Content -->
    <TableTabContent v-else-if="tabsStore.activeTab?.type === 'table'" :tab="tabsStore.activeTab" />

    <!-- Procedure Tab Content -->
    <ProcedureTabContent v-else-if="tabsStore.activeTab?.type === 'procedure'" :tab="tabsStore.activeTab" />

    <!-- View Tab Content -->
    <ViewTabContent v-else-if="tabsStore.activeTab?.type === 'view'" :tab="tabsStore.activeTab" />

    <!-- Default empty state -->
    <div v-else class="flex-1 flex items-center justify-center text-gray-500">
      <div class="text-center">
        <FileText class="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p>Select an object from the database explorer or create a new query</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FileText } from 'lucide-vue-next'
import QueryTabContent from './tab/QueryTabContent.vue'
import TableTabContent from './tab/TableTabContent.vue'
import ViewTabContent from './tab/ViewTabContent.vue'
import ProcedureTabContent from './tab/ProcedureTabContent.vue'
import { useTabsStore } from '@/stores/tabsStore'

const tabsStore = useTabsStore()
</script>