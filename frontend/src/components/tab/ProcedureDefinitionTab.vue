<template>
  <SqlEditor
    :modelValue="content"
    height="100%"
    :readonly="!isModifying"
    :connection-id="connectionId"
    :database="database"
    :reveal-line="revealLine"
  />
</template>

<script setup lang="ts">
import SqlEditor from "../SqlEditor.vue";

interface Props {
  content: string;
  isModifying: boolean;
  connectionId: string;
  database: string;
  revealLine?: number;
}

defineProps<Props>();
</script>
