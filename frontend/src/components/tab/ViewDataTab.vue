<template>
  <div class="h-full relative flex flex-col min-h-0">
    <StateWrapper :loading="loading" :error="error">
      <DataTable
        v-if="data"
        :data="data.results"
        :columns="columns.map((c) => c.name)"
      />
    </StateWrapper>
  </div>
</template>

<script setup lang="ts">
import DataTable from '../DataTable.vue'
import StateWrapper from '../StateWrapper.vue'

interface Props {
  data: any;
  columns: any[];
  loading: boolean;
  error: any;
}

defineProps<Props>();
</script>