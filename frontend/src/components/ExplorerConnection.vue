<template>
  <CollapsibleItem
    class="ml-1 mt-1"
    :expanded="isExpanded"
    @toggle="$emit('toggle')"
  >
    <template #header>
      <div
        class="flex items-center flex-1 min-w-0"
        @contextmenu.prevent.stop="$emit('contextmenu', $event)"
      >
        <Server class="w-3 h-3 mr-1" />
        <span class="font-medium flex-1 text-sm truncate"
          >{{ connection.name }} ({{ connection.type }})</span
        >
        <AlertTriangle
          v-if="connection.hasError"
          class="w-3 h-3 ml-1 text-red-500"
          :title="connection.lastError || 'Connection error'"
        />
      </div>
    </template>

    <slot />
  </CollapsibleItem>
</template>

<script setup lang="ts">
import { Server, AlertTriangle } from "lucide-vue-next";
import type { ExtendedConnection } from "@/stores/connectionsStore";
import CollapsibleItem from "./CollapsibleItem.vue";

defineProps<{
  connection: ExtendedConnection;
  isExpanded: boolean;
}>();

defineEmits<{
  toggle: [];
  edit: [];
  contextmenu: [event: MouseEvent];
}>();
</script>
