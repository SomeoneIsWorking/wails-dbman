<template>
  <ScrollView class="h-full p-4">
    <StateWrapper :loading="loading" :error="error">
      <div class="max-w-4xl mx-auto">
        <ScrollView class="border border-border rounded shadow-sm">
          <table class="min-w-full divide-y divide-border">
            <thead class="bg-surface-hover">
              <tr>
                <th class="px-3 py-1.5 uppercase border-b">Name</th>
                <th class="px-3 py-1.5 uppercase border-b">Type</th>
                <th class="px-3 py-1.5 uppercase border-b">Nullable</th>
                <th class="px-3 py-1.5 uppercase border-b">Default</th>
              </tr>
            </thead>
            <tbody class="bg-surface divide-y divide-border">
              <tr v-for="column in columns" :key="column.name" class="hover:bg-surface-hover transition-colors">
                <td class="px-3 py-1.5 font-medium text-foreground">{{ column.name }}</td>
                <td class="px-3 py-1.5 text-foreground-secondary font-mono">{{ column.type }}</td>
                <td class="px-3 py-1.5">
                  <span :class="column.nullable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'" class="font-medium">
                    {{ column.nullable ? 'Yes' : 'No' }}
                  </span>
                </td>
                <td class="px-3 py-1.5 text-foreground-secondary font-mono">{{ column.defaultValue || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </ScrollView>
      </div>
    </StateWrapper>
  </ScrollView>
</template>

<script setup lang="ts">
import StateWrapper from '../StateWrapper.vue'
import ScrollView from '../ScrollView.vue'

interface Props {
  columns: any[];
  loading: boolean;
  error: any;
}

defineProps<Props>();
</script>