<template>
  <div class="w-full">
    <div class="tab-nav mb-4 border-b border-border pb-px">
      <button
        @click="tab = 'manual'"
        :class="['tab-item !rounded-b-none', tab === 'manual' ? 'tab-item-active !shadow-none border-b-2 border-primary' : '']"
      >
        <div class="flex items-center gap-1.5 px-2">
          <Edit class="w-3.5 h-3.5" />
          <span>Manual Input</span>
        </div>
      </button>
      <button
        @click="tab = 'connection-string'"
        :class="['tab-item !rounded-b-none', tab === 'connection-string' ? 'tab-item-active !shadow-none border-b-2 border-primary' : '']"
      >
        <div class="flex items-center gap-1.5 px-2">
          <Link class="w-3.5 h-3.5" />
          <span>Connection String</span>
        </div>
      </button>
    </div>

    <div class="animate-in fade-in duration-300">
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
