<template>
  <SqlEditor
    :modelValue="`EXEC ${objectName} ${parameters?.map(p => p.name + ' = null').join(', ') || ''}`"
    height="100%"
    :connection-id="connectionId"
    :database="database"
  />
</template>

<script setup lang="ts">
import SqlEditor from "../SqlEditor.vue";

interface Props {
  objectName: string;
  parameters?: any[];
  connectionId: string;
  database: string;
}

defineProps<Props>();
</script>