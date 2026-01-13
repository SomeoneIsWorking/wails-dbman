<template>
  <div class="h-full flex flex-col">
    <div class="flex-1 overflow-hidden relative">
      <StateWrapper :loading="tableState.loading" :error="tableState.error">
        <DataTable
         v-if="tableState.data && tableState.schema"
          :data="tableState.data.results"
          :columns="tableState.schema.columns.map((col) => col.name)"
        />
      </StateWrapper>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import DataTable from "../DataTable.vue";
import StateWrapper from "../StateWrapper.vue";
import { TableTab } from "../../stores/tabsStore";

interface Props {
  tab: TableTab;
}

const props = defineProps<Props>();

const tableState = computed(() => props.tab.state);
</script>
