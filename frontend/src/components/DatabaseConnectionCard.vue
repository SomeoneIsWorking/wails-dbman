<template>
  <div
    class="bg-surface border border-border rounded shadow-sm hover:shadow-md hover:border-border-hover transition-all group/card flex flex-col min-h-[120px]"
  >
    <div
      class="px-3 py-2.5 border-b border-border/50 bg-surface-hover/20 flex items-center justify-between"
    >
      <div class="flex items-center gap-2 min-w-0">
        <div
          class="w-8 h-8 rounded bg-primary/10 flex items-center justify-center"
        >
          <Server class="w-4 h-4 text-primary" />
        </div>
        <div class="min-w-0">
          <h3
            class="text-xs font-bold text-foreground truncate uppercase tracking-tight"
          >
            {{ connection.name }}
          </h3>
          <p class="text-sm text-foreground-secondary truncate opacity-70">
            {{ connection.type }} • {{ connection.host }}:{{ connection.port }}
          </p>
        </div>
      </div>
      <div
        class="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity"
      >
        <button class="btn-ghost !p-1" @click="editConnection" title="Edit">
          <Edit class="w-3.5 h-3.5" />
        </button>
        <button
          class="btn-ghost !p-1 text-red-500 hover:!bg-red-500 hover:!text-white"
          @click="deleteConnection"
          :disabled="isDeleting"
          title="Delete"
        >
          <Trash class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Databases Section -->
    <div class="p-2 flex-1 flex flex-col min-h-0">
      <template v-if="databases?.length">
        <div class="flex justify-between items-center mb-1.5 px-1">
          <span
            class="text-sm font-bold uppercase tracking-widest text-foreground-secondary"
            >Databases</span
          >
          <button
            class="p-0.5 hover:bg-surface-hover rounded text-foreground-secondary"
            @click="refreshDatabases"
            :disabled="isLoading"
            title="Refresh Databases"
          >
            <RefreshCw
              class="w-2.5 h-2.5"
              :class="{ 'animate-spin': isLoading }"
            />
          </button>
        </div>
        <OverlayScrollbarsComponent class="grid grid-cols-2 gap-1 max-h-24">
          <button
            v-for="db in databases"
            :key="db"
            @click="selectDatabase(db)"
            class="px-2 py-1 text-sm font-medium border border-border/40 rounded hover:bg-primary/5 hover:border-primary/30 text-left flex items-center gap-1.5 truncate group/db transition-all"
          >
            <Database
              class="w-3 h-3 text-foreground-secondary group-hover/db:text-primary"
            />
            <span class="truncate">{{ db }}</span>
          </button>
        </OverlayScrollbarsComponent>
      </template>
      <div v-else class="flex-1 flex items-center justify-center">
        <button
          class="btn-primary !py-1 !px-3 !text-sm !font-bold uppercase tracking-widest"
          @click="loadDatabases"
          :disabled="isLoading"
        >
          <Database v-if="!isLoading" class="w-3 h-3 mr-1" />
          <Loader v-else class="w-3 h-3 mr-1 animate-spin" />
          {{ isLoading ? "Connecting..." : "Connect & Load" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  Database,
  Edit,
  Trash,
  RefreshCw,
  Server,
  Loader,
} from "lucide-vue-next";
import { GetDatabases, DeleteConnection } from "wailsjs/go/main/App";
import type { Connection } from "~/types/wails";
import { OverlayScrollbarsComponent } from "overlayscrollbars-vue";

const props = defineProps<{
  connection: Connection;
}>();

const emit = defineEmits<{
  (e: "delete"): void;
  (e: "edit", connection: Connection): void;
  (e: "selectDatabase", db: string): void;
}>();

const databases = ref<string[]>([]);
const error = ref<any>();
const isLoading = ref(false);
const lastUpdate = ref<Date>();
const isDeleting = ref(false);
const deleteError = ref<any>();

async function deleteConnection() {
  if (!confirm(`Are you sure you want to delete "${props.connection.name}"?`))
    return;

  isDeleting.value = true;
  deleteError.value = null;

  try {
    await DeleteConnection(props.connection.id);
    emit("delete");
  } catch (err) {
    deleteError.value = err;
  } finally {
    isDeleting.value = false;
  }
}

async function loadDatabases() {
  isLoading.value = true;
  error.value = null;
  try {
    databases.value = await GetDatabases(props.connection.id, false);
    lastUpdate.value = new Date();
  } catch (err) {
    error.value = err;
  } finally {
    isLoading.value = false;
  }
}

async function refreshDatabases() {
  isLoading.value = true;
  error.value = null;
  try {
    databases.value = await GetDatabases(props.connection.id, true);
    lastUpdate.value = new Date();
  } catch (err) {
    error.value = err;
  } finally {
    isLoading.value = false;
  }
}

const editConnection = () => {
  emit("edit", props.connection);
};

const selectDatabase = (db: string) => {
  emit("selectDatabase", db);
};

// Auto-load databases on mount
onMounted(() => {
  loadDatabases();
});
</script>
