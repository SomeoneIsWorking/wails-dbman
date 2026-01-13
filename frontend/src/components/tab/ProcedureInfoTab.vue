<template>
  <div class="h-full p-4">
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- Parameters Section -->
      <div v-if="info?.parameters && info.parameters.length > 0">
        <h4 class="text-xs font-bold mb-2 uppercase text-foreground-secondary flex items-center gap-1.5">
          <SettingsIcon class="w-3.5 h-3.5" />
          Parameters
        </h4>
        <div class="border border-border rounded shadow-sm">
          <table class="min-w-full divide-y divide-border">
            <thead class="bg-surface-hover">
              <tr>
                <th class="text-left py-1.5 px-3 text-sm font-semibold text-foreground-secondary uppercase tracking-wider">Name</th>
                <th class="text-left py-1.5 px-3 text-sm font-semibold text-foreground-secondary uppercase tracking-wider">Type</th>
                <th class="text-left py-1.5 px-3 text-sm font-semibold text-foreground-secondary uppercase tracking-wider">Mode</th>
                <th class="text-left py-1.5 px-3 text-sm font-semibold text-foreground-secondary uppercase tracking-wider">Default</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border bg-surface">
              <tr v-for="param in info.parameters" :key="param.name" class="hover:bg-surface-hover transition-colors">
                <td class="py-1.5 px-3 text-xs font-medium text-foreground font-mono">{{ param.name }}</td>
                <td class="py-1.5 px-3 text-xs text-foreground-secondary">{{ param.type }}</td>
                <td class="py-1.5 px-3 text-xs">
                  <span :class="param.mode === 'IN' ? 'text-green-600' : param.mode === 'OUT' ? 'text-blue-600' : 'text-purple-600'" class="font-medium">
                    {{ param.mode }}
                  </span>
                </td>
                <td class="py-1.5 px-3 text-xs text-foreground-secondary font-mono">{{ param.defaultValue || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Result Sets Section -->
      <div v-if="info?.resultSets && info.resultSets.length > 0">
        <h4 class="text-xs font-bold mb-2 uppercase text-foreground-secondary flex items-center gap-1.5">
          <Database class="w-3.5 h-3.5" />
          Result Sets
        </h4>
        <div class="space-y-4">
          <div v-for="(resultSet, index) in info.resultSets" :key="index">
            <h5 class="text-sm font-bold mb-1.5 text-foreground-secondary">Set {{ (index as number) + 1 }}</h5>
            <div class="border border-border rounded shadow-sm">
              <table class="min-w-full divide-y divide-border">
                <thead class="bg-surface-hover">
                  <tr>
                    <th class="text-left py-1.5 px-3 text-sm font-semibold text-foreground-secondary uppercase tracking-wider">Column</th>
                    <th class="text-left py-1.5 px-3 text-sm font-semibold text-foreground-secondary uppercase tracking-wider">Type</th>
                    <th class="text-left py-1.5 px-3 text-sm font-semibold text-foreground-secondary uppercase tracking-wider">Nullable</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border bg-surface">
                  <tr v-for="col in resultSet.columns" :key="col.name" class="hover:bg-surface-hover transition-colors">
                    <td class="py-1.5 px-3 text-xs font-medium text-foreground">{{ col.name }}</td>
                    <td class="py-1.5 px-3 text-xs text-foreground-secondary">{{ col.type }}</td>
                    <td class="py-1.5 px-3 text-xs text-center">
                      <span :class="col.nullable ? 'text-amber-600' : 'text-green-600'" class="font-bold">
                        {{ col.nullable ? 'Yes' : 'No' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="(!info?.parameters || info.parameters.length === 0) && (!info?.resultSets || info.resultSets.length === 0)" class="text-center py-12 border-2 border-dashed border-border rounded-lg bg-surface-hover/30">
        <p class="text-xs text-foreground-secondary">No parameter or result set information available.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Settings as SettingsIcon, Database } from "lucide-vue-next";

interface Props {
  info: any;
}

defineProps<Props>();
</script>