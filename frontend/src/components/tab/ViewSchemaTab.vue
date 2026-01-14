<template>
  <OverlayScrollbarsComponent class="h-full p-4">
    <StateWrapper :loading="loading" :error="error">
      <div class="schema-section">
        <h4 class="schema-header">
          <Database class="w-5 h-5 text-blue-600" />
          Columns ({{ columns.length }})
        </h4>
        <div class="schema-table-container">
          <table class="schema-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Nullable</th>
                <th>Default</th>
              </tr>
            </thead>
            <tbody class="bg-surface divide-y divide-border/50">
              <tr v-for="column in columns" :key="column.name">
                <td class="font-medium text-foreground">
                  {{ column.name }}
                </td>
                <td class="text-foreground-secondary font-mono">
                  {{ column.type }}
                </td>
                <td>
                  <span
                    :class="column.nullable ? 'badge-success' : 'badge-error'"
                  >
                    {{ column.nullable ? "Yes" : "No" }}
                  </span>
                </td>
                <td class="text-foreground-secondary font-mono">
                  {{ column.defaultValue || "-" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </StateWrapper>
  </OverlayScrollbarsComponent>
</template>

<script setup lang="ts">
import { Database } from "lucide-vue-next";
import StateWrapper from "../StateWrapper.vue";
import { OverlayScrollbarsComponent } from "overlayscrollbars-vue";

interface Props {
  columns: any[];
  loading: boolean;
  error: any;
}

defineProps<Props>();
</script>
