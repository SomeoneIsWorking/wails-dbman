<template>
  <div class="h-full flex flex-col">
    <div class="flex-1 p-4">
      <SqlEditor
        v-model="queryContent"
        height="100%"
        :connection-id="tab.connectionId"
        :database="tab.database"
      />
    </div>
    <div class="border-t border-border p-2 flex items-center justify-between bg-surface-hover">
      <div class="flex items-center gap-2">
        <button
          class="btn-primary"
          @click="executeQuery"
        >
          <Play class="w-4 h-4" />
          Execute
        </button>
      </div>
      <div class="text-xs text-foreground-secondary">
        {{ queryContent.length }} characters
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Play } from 'lucide-vue-next'
import SqlEditor from '../SqlEditor.vue'
import { QueryTab } from '@/stores/tabsStore'

interface Props {
  tab: QueryTab
}

defineProps<Props>()

const queryContent = ref('SELECT * FROM Users LIMIT 100;')

const executeQuery = async () => {

}

</script>