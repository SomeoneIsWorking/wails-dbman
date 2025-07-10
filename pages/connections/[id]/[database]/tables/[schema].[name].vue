<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-lg font-semibold">{{ schema }}.{{ name }}</h2>
      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :loading="isDataLoading || isSchemaLoading"
          @click="refreshAll"
        >
          <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
          Refresh
        </UButton>
      </div>
    </div>

    <div class="space-y-4">
      <UTabs :items="items" variant="link" class="gap-4 w-full" :ui="{ trigger: 'flex-1' }">
        <template #schema>
          <SchemaView
            :connection-id="connectionId"
            :database="database"
            :schema="schema"
            :name="name"
            @update:loading="isSchemaLoading = $event"
            @update:error="schemaError = $event"
          />
        </template>

        <template #data>
          <PaginatedDataView
            :connection-id="connectionId"
            :database="database"
            :schema="schema"
            :name="name"
            @update:loading="isDataLoading = $event"
            @update:error="dataError = $event"
          />
        </template>
      </UTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import type { TabsItem } from '@nuxt/ui'
import SchemaView from '~/components/table/SchemaView.vue'
import PaginatedDataView from '~/components/table/PaginatedDataView.vue'

const route = useRoute()

// Parse route parameters
const connectionId = route.params.id as string
const database = route.params.database as string
const name = route.params.name as string
const schema = route.params.schema as string

// Define tabs
const items = [
  {
    label: 'Schema',
    icon: 'i-heroicons-table-cells',
    slot: 'schema'
  },
  {
    label: 'Data',
    icon: 'i-heroicons-document-text',
    slot: 'data'
  }
] satisfies TabsItem[]

// Loading and error states
const isDataLoading = ref(false)
const isSchemaLoading = ref(false)
const dataError = ref(null)
const schemaError = ref(null)

// Refresh function that triggers both components to refresh
function refreshAll() {
  isDataLoading.value = true
  isSchemaLoading.value = true
}
</script>