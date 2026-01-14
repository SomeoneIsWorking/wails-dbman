<template>
  <OverlayScrollbarsComponent class="h-full p-4">
    <StateWrapper :loading="loading" :error="error">
      <div class="space-y-6">
        <!-- Parameters Section -->
        <div
          v-if="info?.parameters && info.parameters.length > 0"
          class="schema-section"
        >
          <h4 class="schema-header">
            <SettingsIcon class="w-5 h-5 text-blue-600" />
            Parameters ({{ info.parameters.length }})
          </h4>
          <div class="schema-table-container">
            <table class="schema-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Mode</th>
                  <th>Default</th>
                </tr>
              </thead>
              <tbody class="bg-surface divide-y divide-border/50">
                <tr v-for="param in info.parameters" :key="param.name">
                  <td class="font-medium text-foreground font-mono">
                    {{ param.name }}
                  </td>
                  <td class="text-foreground-secondary">{{ param.type }}</td>
                  <td>
                    <span
                      :class="
                        param.mode === 'IN'
                          ? 'badge-success'
                          : param.mode === 'OUT'
                          ? 'badge-info'
                          : 'badge-accent'
                      "
                    >
                      {{ param.mode }}
                    </span>
                  </td>
                  <td class="text-foreground-secondary font-mono">
                    {{ param.defaultValue || "-" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Result Sets Section -->
        <div
          v-if="info?.resultSets && info.resultSets.length > 0"
          class="space-y-6"
        >
          <div
            v-for="(resultSet, index) in info.resultSets"
            :key="index"
            class="schema-section"
          >
            <h4 class="schema-header">
              <Database class="w-5 h-5 text-purple-600" />
              Result Set {{ (index as number) + 1 }} ({{
                resultSet.columns.length
              }}
              columns)
            </h4>
            <div class="schema-table-container">
              <table class="schema-table">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Type</th>
                    <th>Nullable</th>
                  </tr>
                </thead>
                <tbody class="bg-surface divide-y divide-border/50">
                  <tr v-for="col in resultSet.columns" :key="col.name">
                    <td class="font-medium text-foreground">{{ col.name }}</td>
                    <td class="text-foreground-secondary">{{ col.type }}</td>
                    <td>
                      <span
                        :class="col.nullable ? 'badge-info' : 'badge-success'"
                      >
                        {{ col.nullable ? "Yes" : "No" }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div
          v-if="
            (!info?.parameters || info.parameters.length === 0) &&
            (!info?.resultSets || info.resultSets.length === 0)
          "
          class="text-center py-12 border-2 border-dashed border-border rounded-lg bg-surface-hover/30"
        >
          <p class="text-sm text-foreground-secondary">
            No parameter or result set information available.
          </p>
        </div>
      </div>
    </StateWrapper>
  </OverlayScrollbarsComponent>
</template>

<script setup lang="ts">
import { Settings as SettingsIcon, Database } from "lucide-vue-next";
import StateWrapper from "../StateWrapper.vue";
import { OverlayScrollbarsComponent } from "overlayscrollbars-vue";

interface Props {
  info: any;
  loading: boolean;
  error: any;
}

defineProps<Props>();
</script>
