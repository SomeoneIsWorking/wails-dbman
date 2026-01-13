<template>
  <StateWrapper :loading="loading" :error="error">
    <SqlEditor
      :modelValue="definition || ''"
      height="100%"
      readonly
      :connection-id="connectionId"
      :database="database"
    >
      <template #actions>
        <button
          class="btn-ghost"
          title="Refresh View Definition"
          @click="onRefresh"
        >
          <RefreshCw class="w-3.5 h-3.5" />
        </button>
      </template>
    </SqlEditor>
  </StateWrapper>
</template>

<script setup lang="ts">
import SqlEditor from '../SqlEditor.vue'
import StateWrapper from '../StateWrapper.vue'
import { RefreshCw } from 'lucide-vue-next'

interface Props {
  definition: string;
  loading: boolean;
  error: any;
  connectionId: string;
  database: string;
  onRefresh: () => void;
}

defineProps<Props>();
</script>