<template>
  <div class="w-full">
    <div class="flex border-b border-gray-200">
      <button
        @click="tab = 'connection-string'"
        :class="tab === 'connection-string' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'"
        class="px-4 py-2 font-medium flex items-center gap-2"
      >
        <Link class="w-4 h-4" />
        Connection String
      </button>
      <button
        @click="tab = 'manual'"
        :class="tab === 'manual' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'"
        class="px-4 py-2 font-medium flex items-center gap-2"
      >
        <Edit class="w-4 h-4" />
        Manual Input
      </button>
    </div>

    <div class="mt-4">
      <ConnectionStringForm
        v-if="tab === 'connection-string'"
        :model-value="formState"
        :is-editing="isEditing"
      />
      <ManualConnectionForm
        v-if="tab === 'manual'"
        :model-value="formState"
        :is-editing="isEditing"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Link, Edit } from 'lucide-vue-next'
import { useConnectionForm } from '~/composables/useConnectionForm'
import ConnectionStringForm from "./ConnectionStringForm.vue";
import ManualConnectionForm from "./ManualConnectionForm.vue";

defineProps<{
  formState: ReturnType<typeof useConnectionForm>;
  isEditing?: boolean;
}>();

const tab = ref('manual')
</script>
