<template>
  <OverlayScrollbarsComponent class="h-full text-foreground p-4 relative">
    <StateWrapper :loading="tableState.loading" :error="tableState.error">
      <div v-if="tableState.schema" class="space-y-6">
        <!-- Columns -->
        <div class="schema-section">
          <h4 class="schema-header">
            <Database class="w-5 h-5 text-blue-600" />
            Columns ({{ tableState.schema.columns.length }})
          </h4>
          <div class="schema-table-container">
            <table class="schema-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Nullable</th>
                  <th>Default</th>
                  <th>Primary</th>
                  <th>Foreign</th>
                </tr>
              </thead>
              <tbody class="bg-surface divide-y divide-border/50">
                <tr
                  v-for="column in tableState.schema.columns"
                  :key="column.name"
                >
                  <td class="font-medium text-foreground">
                    {{ column.name }}
                  </td>
                  <td class="text-foreground-secondary">
                    {{ column.type }}
                  </td>
                  <td>
                    <span
                      :class="column.nullable ? 'badge-success' : 'badge-error'"
                    >
                      {{ column.nullable ? "Yes" : "No" }}
                    </span>
                  </td>
                  <td class="text-foreground-secondary">
                    {{ column.defaultValue || "-" }}
                  </td>
                  <td>
                    <span v-if="column.primary" class="badge-accent"
                      >Primary</span
                    >
                    <span v-else>-</span>
                  </td>
                  <td>
                    <span v-if="column.foreign" class="badge-info"
                      >Foreign</span
                    >
                    <span v-else>-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Primary Key -->
        <div
          v-if="
            tableState.schema.primaryKey &&
            tableState.schema.primaryKey.length > 0
          "
        >
          <h4
            class="text-lg font-semibold mb-3 flex items-center gap-2 text-foreground"
          >
            <Key class="w-5 h-5 text-yellow-600" />
            Primary Key
          </h4>
          <div
            class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3"
          >
            <p class="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Columns:</strong>
              {{ tableState.schema.primaryKey.join(", ") }}
            </p>
          </div>
        </div>

        <!-- Foreign Keys -->
        <div
          v-if="
            tableState.schema.foreignKeys &&
            tableState.schema.foreignKeys.length > 0
          "
        >
          <h4
            class="text-lg font-semibold mb-3 flex items-center gap-2 text-foreground"
          >
            <Link class="w-5 h-5 text-purple-600" />
            Foreign Keys ({{ tableState.schema.foreignKeys.length }})
          </h4>
          <div class="space-y-3">
            <div
              v-for="(fk, index) in tableState.schema.foreignKeys"
              :key="index"
              class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-3"
            >
              <p class="text-sm text-purple-800 dark:text-purple-200">
                <strong>{{ fk.columns.join(", ") }}</strong>
                <ArrowRight class="w-4 h-4 inline mx-2" />
                <strong>{{ fk.referencedTable }}</strong
                >.{{ fk.referencedColumns.join(", ") }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </StateWrapper>
  </OverlayScrollbarsComponent>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Database, Key, Link, ArrowRight } from "lucide-vue-next";
import StateWrapper from "../StateWrapper.vue";
import { OverlayScrollbarsComponent } from "overlayscrollbars-vue";
import type { TableTab } from "../../stores/tabsStore";

interface Props {
  tab: TableTab;
}

const props = defineProps<Props>();

const tableState = computed(() => props.tab.state);
</script>
