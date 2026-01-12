<template>
  <div class="h-full overflow-auto text-primary p-4">
    <StateWrapper :state="tableState">
      <template #success="{ data }">
        <div class="space-y-6">
          <!-- Columns -->
          <div>
            <h4 class="text-lg font-semibold mb-3 flex items-center gap-2">
              <Database class="w-5 h-5 text-blue-600" />
              Columns ({{ data.schema.columns.length }})
            </h4>
            <div class="overflow-x-auto">
              <table class="min-w-full border border-border">
                <thead class="bg-surface-hover">
                  <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider border-b">Name</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider border-b">Type</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider border-b">Nullable</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider border-b">Default</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider border-b">Primary</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider border-b">Foreign</th>
                  </tr>
                </thead>
                <tbody class="bg-surface divide-y divide-border">
                  <tr v-for="column in data.schema.columns" :key="column.name" class="hover:bg-surface-hover">
                    <td class="px-4 py-2 text-sm font-medium text-foreground">{{ column.name }}</td>
                    <td class="px-4 py-2 text-sm text-foreground-secondary">{{ column.type }}</td>
                    <td class="px-4 py-2 text-sm text-foreground-secondary">
                      <span :class="column.nullable ? 'text-success' : 'text-error'">
                        {{ column.nullable ? 'Yes' : 'No' }}
                      </span>
                    </td>
                    <td class="px-4 py-2 text-sm text-foreground-secondary">{{ column.defaultValue || '-' }}</td>
                    <td class="px-4 py-2 text-sm text-foreground-secondary">
                      <span v-if="column.primary" class="text-primary font-medium">✓</span>
                      <span v-else>-</span>
                    </td>
                    <td class="px-4 py-2 text-sm text-foreground-secondary">
                      <span v-if="column.foreign" class="text-accent font-medium">✓</span>
                      <span v-else>-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Primary Key -->
          <div v-if="data.schema.primaryKey && data.schema.primaryKey.length > 0">
            <h4 class="text-lg font-semibold mb-3 flex items-center gap-2">
              <Key class="w-5 h-5 text-yellow-600" />
              Primary Key
            </h4>
            <div class="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p class="text-sm text-yellow-800">
                <strong>Columns:</strong> {{ data.schema.primaryKey.join(', ') }}
              </p>
            </div>
          </div>

          <!-- Foreign Keys -->
          <div v-if="data.schema.foreignKeys && data.schema.foreignKeys.length > 0">
            <h4 class="text-lg font-semibold mb-3 flex items-center gap-2">
              <Link class="w-5 h-5 text-purple-600" />
              Foreign Keys ({{ data.schema.foreignKeys.length }})
            </h4>
            <div class="space-y-3">
              <div
                v-for="(fk, index) in data.schema.foreignKeys"
                :key="index"
                class="bg-purple-50 border border-purple-200 rounded p-3"
              >
                <p class="text-sm text-purple-800">
                  <strong>{{ fk.columns.join(', ') }}</strong>
                  <ArrowRight class="w-4 h-4 inline mx-2" />
                  <strong>{{ fk.referencedTable }}</strong>.{{ fk.referencedColumns.join(', ') }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </StateWrapper>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Database, Key, Link, ArrowRight } from 'lucide-vue-next'
import StateWrapper from '../StateWrapper.vue'
import type { TableTab } from '../../stores/tabsStore'

interface Props {
  tab: TableTab
}

const props = defineProps<Props>()

const tableState = computed(() => props.tab.state)
</script>