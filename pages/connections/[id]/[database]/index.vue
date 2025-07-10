<template>
  <div class="container mx-auto p-4 space-y-4">
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-2">
        <UButton color="neutral" @click="changeDatabaseModal = true">
          <template #leading>
            <UIcon name="i-heroicons-circle-stack-20-solid" />
          </template>
          {{ database }}
        </UButton>
        <USeparator vertical />
        <UButton
          color="error"
          variant="soft"
          label="Disconnect"
          @click="navigateTo('/')"
        />
        <USeparator vertical />
        <UButton
          :loading="isLoading"
          :disabled="isLoading"
          color="primary"
          icon="i-heroicons-arrow-path"
          @click="forceRefresh()"
        >
          Refresh
        </UButton>
        <UButton
          v-if="!isBackgroundLoading"
          :loading="isStartingLoader"
          :disabled="isStartingLoader"
          color="success"
          variant="soft"
          class="whitespace-nowrap"
          icon="i-heroicons-play"
          @click="startBackgroundLoader()"
        >
          Start Loading
        </UButton>
        <UButton
          v-if="isBackgroundLoading"
          :loading="isStoppingLoader"
          :disabled="isStoppingLoader"
          color="error"
          variant="soft"
          class="whitespace-nowrap"
          icon="i-heroicons-stop"
          @click="stopBackgroundLoader()"
        >
          Stop Loading
        </UButton>
      </div>
    </div>

    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <div class="flex-1">
          <input
            v-model="search"
            type="text"
            placeholder="Search tables, stored procedures, and their definitions..."
            class="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <UButton
          v-if="filteredProcedures.length > 0"
          variant="soft"
          icon="i-heroicons-clipboard-document"
          @click="copyFilteredProceduresAsJson"
        >
          Copy JSON
        </UButton>
        <UButton
          :variant="groupBySchema ? 'solid' : 'outline'"
          @click="groupBySchema = !groupBySchema"
          icon="i-heroicons-folder"
        >
          Group by Schema
        </UButton>
      </div>

      <div v-if="isLoading" class="flex justify-center py-8">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-8 h-8 animate-spin text-gray-600"
        />
      </div>

      <div v-else-if="!schema" class="flex justify-center py-8">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-8 h-8 animate-spin text-gray-600"
        />
      </div>

      <div v-else class="space-y-4">
        <!-- Combined Accordion -->
        <UAccordion :items="accordionItems">
          <template #tables-content>
            <div class="grid gap-2 md:grid-cols-2 lg:grid-cols-3 p-2">
              <NuxtLink
                v-for="table in filteredTables"
                :key="`${table.schema}.${table.name}`"
                :to="`/connections/${currentConnectionId}/${database}/tables/${table.schema}.${table.name}`"
                class="block"
              >
                <UCard class="cursor-pointer hover-contrast">
                  <template #header>
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-table-cells" />
                      <span>{{
                        groupBySchema
                          ? table.name
                          : `${table.schema}.${table.name}`
                      }}</span>
                    </div>
                  </template>
                  <p class="text-sm text-gray-500">
                    {{ table.columns?.length || 0 }} columns
                  </p>
                </UCard>
              </NuxtLink>
            </div>
          </template>

          <template #procedures-content>
            <div class="grid gap-2 md:grid-cols-2 lg:grid-cols-3 p-2">
              <NuxtLink
                v-for="proc in filteredProcedures"
                :key="`${proc.schema}.${proc.name}`"
                :to="`/connections/${currentConnectionId}/${database}/procedures/${proc.schema}.${proc.name}`"
                class="block"
              >
                <UCard class="cursor-pointer hover-contrast">
                  <template #header>
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-command-line" />
                      <span>{{
                        groupBySchema
                          ? proc.name
                          : `${proc.schema}.${proc.name}`
                      }}</span>
                    </div>
                  </template>
                  <p class="text-sm text-gray-500">
                    {{ proc.parameters.length }} parameters
                  </p>
                  <div class="mt-2">
                    <div
                      v-if="
                        getProcedureState(proc.schema, proc.name) === 'loading'
                      "
                      class="flex items-center gap-2 text-xs text-gray-500"
                    >
                      <UIcon
                        name="i-heroicons-arrow-path"
                        class="w-4 h-4 animate-spin"
                      />
                      <span>Loading</span>
                    </div>
                    <div
                      v-else-if="
                        getProcedureState(proc.schema, proc.name) === 'waiting'
                      "
                      class="flex items-center gap-2 text-xs text-gray-500"
                    >
                      <UIcon
                        name="i-heroicons-clock"
                        class="w-4 h-4 text-gray-400"
                      />
                      <span>Queued</span>
                    </div>
                    <div
                      v-else-if="
                        getProcedureState(proc.schema, proc.name) === 'loaded'
                      "
                      class="flex items-center gap-2 text-xs text-gray-500"
                    >
                      <UIcon
                        name="i-heroicons-check-circle"
                        class="w-4 h-4 text-green-500"
                      />
                      <span>Loaded</span>
                    </div>
                    <div
                      v-else-if="
                        getProcedureState(proc.schema, proc.name) === 'failed'
                      "
                      class="flex items-center gap-2 text-xs text-red-500"
                    >
                      <UIcon
                        name="i-heroicons-exclamation-circle"
                        class="w-4 h-4"
                      />
                      <span>{{
                        getProcedureError(proc.schema, proc.name) || "Failed"
                      }}</span>
                    </div>
                    <div
                      v-else
                      class="flex items-center gap-2 text-xs text-gray-500"
                    >
                      <UIcon
                        name="i-heroicons-clock"
                        class="w-4 h-4 text-gray-400"
                      />
                      <span>Waiting</span>
                    </div>
                  </div>
                </UCard>
              </NuxtLink>
            </div>
          </template>
        </UAccordion>
      </div>
    </div>

    <!-- Database Change Modal -->
    <DatabaseSelector
      v-model="changeDatabaseModal"
      :connection-id="currentConnectionId"
      :current-database="database"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import type {
  StoredProcedureInfo,
  TableInfo,
  SchemaInfo,
} from "~/types/schema";
import { useProcedures } from "~/composables/useProcedures";
import { useAsyncFetch } from "~/composables/useAsyncFetch";
import DatabaseSelector from "~/components/DatabaseSelector.vue";

const route = useRoute();
const currentConnectionId = computed(() => route.params.id as string);
const database = computed(() => route.params.database as string);
const changeDatabaseModal = ref(false);
const search = ref("");
const groupBySchema = ref(true);
const isBackgroundLoading = ref(false);
const isStartingLoader = ref(false);
const isStoppingLoader = ref(false);

const { getProcedureState, getProcedureError, setInitialStates } = useProcedures(
  currentConnectionId.value,
  database.value
);

// Fetch databases with refresh capability
const {
  data: databases,
  isLoading: databasesPending,
  fetch: fetchDatabases,
} = useAsyncFetch<string[]>();

// Fetch schema with refresh capability
const {
  data: schema,
  isLoading: schemaPending,
  fetch: fetchSchema,
} = useAsyncFetch<SchemaInfo>();

const isLoading = computed(() => databasesPending.value || schemaPending.value);

// Initial data loading
onMounted(async () => {
  // Fetch databases without invalidate
  await fetchDatabases(
    `/api/connections/${currentConnectionId.value}/databases`
  );

  // Fetch schema without invalidate
  const schemaResponse = await fetchSchema(
    `/api/connections/${currentConnectionId.value}/${database.value}/schema`
  );
  
  // Set initial loading states from schema response
  if (schemaResponse?.loadingStates) {
    setInitialStates(schemaResponse.loadingStates);
  }

  // Check background loader status
  await checkBackgroundLoaderStatus();
});

const forceRefresh = async () => {
  // Fetch databases with invalidate
  await fetchDatabases(
    `/api/connections/${currentConnectionId.value}/databases`,
    {
      query: { invalidate: "true" },
    }
  );

  // Fetch schema with invalidate
  const schemaResponse = await fetchSchema(
    `/api/connections/${currentConnectionId.value}/${database.value}/schema`,
    {
      query: { invalidate: "true" },
    }
  );
  
  // Set initial loading states from schema response
  if (schemaResponse?.loadingStates) {
    setInitialStates(schemaResponse.loadingStates);
  }
};

// Watch for database changes
watch(database, async (newDatabase) => {
  if (newDatabase) {
    const schemaResponse = await fetchSchema(
      `/api/connections/${currentConnectionId.value}/${newDatabase}/schema`
    );
    
    // Set initial loading states from schema response
    if (schemaResponse?.loadingStates) {
      setInitialStates(schemaResponse.loadingStates);
    }

    // Check background loader status for new database
    await checkBackgroundLoaderStatus();
  }
});

// Periodically check background loader status
let statusInterval: NodeJS.Timeout;
onMounted(() => {
  statusInterval = setInterval(checkBackgroundLoaderStatus, 2000);
});

onUnmounted(() => {
  if (statusInterval) {
    clearInterval(statusInterval);
  }
});

const filteredTables = computed(() => {
  if (!search.value) return schema.value?.tables || [];
  const searchLower = search.value.toLowerCase();
  return (schema.value?.tables || []).filter((table: TableInfo) => {
    const fullName = `${table.schema}.${table.name}`.toLowerCase();
    return fullName.includes(searchLower);
  });
});

const filteredProcedures = computed(() => {
  if (!search.value) return schema.value?.storedProcedures || [];
  const searchLower = search.value.toLowerCase();
  return (schema.value?.storedProcedures || []).filter(
    (proc: StoredProcedureInfo) => {
      const fullName = `${proc.schema}.${proc.name}`.toLowerCase();
      return fullName.includes(searchLower);
    }
  );
});

const tablesLabel = computed(() => `Tables (${filteredTables.value.length})`);

const proceduresLabel = computed(() => {
  const procedures = schema.value?.storedProcedures;
  if (!procedures) {
    return "Stored Procedures";
  }
  const total = procedures.length;
  const loaded = procedures.filter(
    (p) => getProcedureState(p.schema, p.name) === "loaded"
  ).length;
  const loading = procedures.filter(
    (p) => getProcedureState(p.schema, p.name) === "loading"
  ).length;
  const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
  return `Stored Procedures: ${loaded}/${total} loaded (${percentage}%), ${loading} loading`;
});

const checkBackgroundLoaderStatus = async () => {
  try {
    const response = await $fetch(`/api/connections/${currentConnectionId.value}/${database.value}/background-loader`);
    isBackgroundLoading.value = response.active;
  } catch (error) {
    console.error('Failed to check background loader status:', error);
  }
};

const startBackgroundLoader = async () => {
  isStartingLoader.value = true;
  try {
    await $fetch(`/api/connections/${currentConnectionId.value}/${database.value}/background-loader`, {
      method: 'POST'
    });
    isBackgroundLoading.value = true;
  } catch (error) {
    console.error('Failed to start background loader:', error);
  } finally {
    isStartingLoader.value = false;
  }
};

const stopBackgroundLoader = async () => {
  isStoppingLoader.value = true;
  try {
    await $fetch(`/api/connections/${currentConnectionId.value}/${database.value}/background-loader`, {
      method: 'DELETE'
    });
    isBackgroundLoading.value = false;
  } catch (error) {
    console.error('Failed to stop background loader:', error);
  } finally {
    isStoppingLoader.value = false;
  }
};

const copyFilteredProceduresAsJson = async () => {
  if (filteredProcedures.value.length === 0) {
    return;
  }
  
  try {
    const proceduresData = filteredProcedures.value.map(proc => ({
      fullName: `${proc.schema}.${proc.name}`,
      parameters: proc.parameters || [],
      resultSets: proc.resultSets || [],
    }));
    
    const json = JSON.stringify(proceduresData, null, 2);
    await navigator.clipboard.writeText(json);
    
    // Show toast notification
    const toast = useToast();
    toast.add({
      title: 'Copied!',
      description: `${filteredProcedures.value.length} stored procedures copied to clipboard as JSON`,
      icon: 'i-heroicons-clipboard-document-check'
    });
  } catch (error) {
    console.error('Failed to copy procedures data:', error);
    const toast = useToast();
    toast.add({
      title: 'Error',
      description: 'Failed to copy procedures data to clipboard',
      color: 'error'
    });
  }
};

const accordionItems = computed(() => [
  {
    label: tablesLabel.value,
    icon: "i-heroicons-table-cells",
    defaultOpen: true,
    slot: "tables-content",
    class: "hover-contrast cursor-pointer",
  },
  {
    label: proceduresLabel.value,
    icon: "i-heroicons-command-line",
    defaultOpen: true,
    slot: "procedures-content",
    class: "hover-contrast cursor-pointer",
  },
]);
</script>
