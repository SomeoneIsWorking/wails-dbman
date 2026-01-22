<template>
  <div
    class="p-3 border-b border-border bg-surface-hover flex items-center gap-1 text-foreground"
  >
    <h2 class="text-sm font-semibold flex items-center gap-2">
      <FolderTree class="w-4 h-4" />
      Database Explorer
    </h2>
    <div class="flex-1"></div>
    <button
      class="p-1 hover:bg-surface rounded"
      @click="emit('new-connection')"
    >
      <Plus class="w-4 h-4" />
    </button>
    <button
      @click="loadConnections"
      class="p-1 hover:bg-surface rounded"
      title="Refresh"
    >
      <RefreshCw class="w-4 h-4" />
    </button>
    <button
      @click="groupBySchema = !groupBySchema"
      class="p-1 hover:bg-surface rounded"
      title="Toggle Group by Schema"
    >
      <component :is="groupBySchema ? Group : List" class="w-4 h-4" />
    </button>
  </div>
  <OverlayScrollbarsComponent
    class="p-2 text-foreground-secondary flex-grow min-h-0"
  >
    <CollapsibleItem
      v-for="conn in connections"
      :key="conn.id"
      class="ml-1 mt-1"
      :expanded="expanded[`conn-${conn.id}`]"
      @toggle="expanded[`conn-${conn.id}`] = !expanded[`conn-${conn.id}`]"
    >
      <template #header>
        <Server class="w-3 h-3 mr-1" />
        <span class="font-medium flex-1"
          >{{ conn.name }} ({{ conn.type }})</span
        >
        <button
          @click.stop="editConnection(conn)"
          class="p-1 hover:bg-surface-hover rounded"
          title="Edit Connection"
        >
          <Edit class="w-3 h-3" />
        </button>
      </template>
      <CollapsibleItem
        v-for="db in conn.databases"
        :key="`${conn.id}-${db.name}`"
        class="ml-1 mt-1"
        :expanded="expanded[`db-${conn.id}-${db.name}`]"
        @toggle="toggleDatabase(conn.id, db)"
      >
        <template #header>
          <Loader2 v-if="db.loading" class="w-3 h-3 mr-1 animate-spin" />
          <Database v-else class="w-3 h-3 mr-1" />
          <span class="font-medium flex-1 text-xs truncate">{{ db.name }}</span>
          <button
            @click.stop="
              connectionsStore.loadSchemaForDatabase(conn.id, db, true)
            "
            class="p-1 hover:bg-surface-hover rounded ml-auto flex-shrink-0"
            title="Refresh Schema"
          >
            <RefreshCw class="w-2 h-2" />
          </button>
        </template>
        <!-- Schema objects under database -->
        <!-- Tables -->
        <CollapsibleItem
          v-if="Object.keys(db.tablesBySchema).length"
          class="ml-1 mt-1"
          :expanded="expanded[`tables-${conn.id}-${db.name}`]"
          @toggle="
            expanded[`tables-${conn.id}-${db.name}`] =
              !expanded[`tables-${conn.id}-${db.name}`]
          "
        >
          <template #header>
            <Table class="w-3 h-3 mr-1" />
            <span class="font-medium">Tables</span>
          </template>
          <template v-if="groupBySchema">
            <CollapsibleItem
              v-for="schema in Object.keys(db.tablesBySchema)"
              :key="schema"
              class="ml-1 mt-1"
              :expanded="expanded[`table-${conn.id}-${db.name}-${schema}`]"
              @toggle="
                expanded[`table-${conn.id}-${db.name}-${schema}`] =
                  !expanded[`table-${conn.id}-${db.name}-${schema}`]
              "
            >
              <template #header>
                <Folder class="w-3 h-3 mr-1" />
                <span class="font-medium">{{ schema }}</span>
              </template>
              <div
                v-for="table in db.tablesBySchema[schema]"
                :key="`${conn.id}-${db.name}-${table.schema}.${table.name}`"
                class="flex ml-1 mt-1 items-center cursor-pointer hover:bg-surface-hover p-1 rounded"
                @click="openTable(conn.id, db.name, table)"
              >
                <Table class="w-3 h-3 mr-2 text-success" />
                <span>{{ table.name }}</span>
              </div>
            </CollapsibleItem>
          </template>
          <template v-else>
            <div
              v-for="table in Object.values(db.tablesBySchema).flat()"
              :key="`${conn.id}-${db.name}-${table.schema}.${table.name}`"
              class="flex ml- mt-1 items-center cursor-pointer hover:bg-surface-hover p-1 rounded"
              @click="openTable(conn.id, db.name, table)"
            >
              <Table class="w-3 h-3 mr-2 text-success" />
              <span>{{ table.schema }}.{{ table.name }}</span>
            </div>
          </template>
        </CollapsibleItem>

        <!-- Views -->
        <CollapsibleItem
          v-if="Object.keys(db.viewsBySchema).length"
          class="ml-1 mt-1"
          :expanded="expanded[`views-${conn.id}-${db.name}`]"
          @toggle="
            expanded[`views-${conn.id}-${db.name}`] =
              !expanded[`views-${conn.id}-${db.name}`]
          "
        >
          <template #header>
            <Eye class="w-3 h-3 mr-1" />
            <span class="font-medium">Views</span>
          </template>
          <template v-if="groupBySchema">
            <CollapsibleItem
              v-for="schema in Object.keys(db.viewsBySchema)"
              :key="schema"
              class="ml-1 mt-1"
              :expanded="expanded[`view-${conn.id}-${db.name}-${schema}`]"
              @toggle="
                expanded[`view-${conn.id}-${db.name}-${schema}`] =
                  !expanded[`view-${conn.id}-${db.name}-${schema}`]
              "
            >
              <template #header>
                <Folder class="w-3 h-3 mr-1" />
                <span class="font-medium">{{ schema }}</span>
              </template>
              <div
                v-for="view in db.viewsBySchema[schema]"
                :key="`${conn.id}-${db.name}-${view.schema}.${view.name}`"
                class="flex ml-1 mt-1 items-center cursor-pointer hover:bg-surface-hover p-1 rounded text-xs"
                @click="openView(conn.id, db.name, view)"
              >
                <Eye class="w-3 h-3 mr-2 text-accent" />
                <span>{{ view.name }}</span>
              </div>
            </CollapsibleItem>
          </template>
          <template v-else>
            <div
              v-for="view in Object.values(db.viewsBySchema).flat()"
              :key="`${conn.id}-${db.name}-${view.schema}.${view.name}`"
              class="flex ml-1 mt-1 items-center cursor-pointer hover:bg-surface-hover p-1 rounded text-xs"
              @click="openView(conn.id, db.name, view)"
            >
              <Eye class="w-3 h-3 mr-2 text-accent" />
              <span>{{ view.schema }}.{{ view.name }}</span>
            </div>
          </template>
        </CollapsibleItem>

        <!-- Procedures -->
        <CollapsibleItem
          v-if="Object.keys(db.proceduresBySchema).length"
          class="ml-1 mt-1"
          :expanded="expanded[`procs-${conn.id}-${db.name}`]"
          @toggle="
            expanded[`procs-${conn.id}-${db.name}`] =
              !expanded[`procs-${conn.id}-${db.name}`]
          "
        >
          <template #header>
            <Settings class="w-3 h-3 mr-1" />
            <span class="font-medium">Procedures</span>
          </template>
          <template v-if="groupBySchema">
            <CollapsibleItem
              v-for="schema in Object.keys(db.proceduresBySchema)"
              :key="schema"
              class="ml-1 mt-1"
              :expanded="expanded[`procedure-${conn.id}-${db.name}-${schema}`]"
              @toggle="
                expanded[`procedure-${conn.id}-${db.name}-${schema}`] =
                  !expanded[`procedure-${conn.id}-${db.name}-${schema}`]
              "
            >
              <template #header>
                <Folder class="w-3 h-3 mr-1" />
                <span class="font-medium">{{ schema }}</span>
              </template>
              <div class="space-y-1">
                <div
                  v-for="proc in db.proceduresBySchema[schema]"
                  :key="`${conn.id}-${db.name}-${proc.schema}.${proc.name}`"
                  class="flex items-center cursor-pointer hover:bg-surface-hover p-1 rounded text-xs"
                  @click="openProcedure(conn.id, db.name, proc)"
                >
                  <Settings class="w-3 h-3 mr-2 text-warning" />
                  <span>{{ proc.name }}</span>
                </div>
              </div>
            </CollapsibleItem>
          </template>
          <template v-else>
            <div class="space-y-1">
              <div
                v-for="proc in Object.values(db.proceduresBySchema).flat()"
                :key="`${conn.id}-${db.name}-${proc.schema}.${proc.name}`"
                class="flex ml-2 items-center cursor-pointer hover:bg-surface-hover p-1 rounded text-xs"
                @click="openProcedure(conn.id, db.name, proc)"
              >
                <Settings class="w-3 h-3 mr-2 text-warning" />
                <span>{{ proc.schema }}.{{ proc.name }}</span>
              </div>
            </div>
          </template>
        </CollapsibleItem>
      </CollapsibleItem>
    </CollapsibleItem>
  </OverlayScrollbarsComponent>

  <ConnectionDialog
    :is-open="showEditDialog"
    title="Edit Connection"
    :is-editing="true"
    :form-state="editFormState"
    :connection-id="editingConnection?.id"
    save-button-text="Update Connection"
    @save="handleSaveConnection"
    @cancel="handleCancelEdit"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  Database,
  Folder,
  Table,
  Eye,
  Settings,
  RefreshCw,
  FolderTree,
  Group,
  List,
  Edit,
  Server,
  Plus,
  Loader2,
} from "lucide-vue-next";
import { useTabsStore } from "@/stores/tabsStore";
import { useConnectionsStore } from "@/stores/connectionsStore";
import { useConnectionForm } from "@/composables/useConnectionForm";

import CollapsibleItem from "./CollapsibleItem.vue";
import ConnectionDialog from "./ConnectionDialog.vue";
import { OverlayScrollbarsComponent } from "overlayscrollbars-vue";

const connectionsStore = useConnectionsStore();
const connections = computed(() => connectionsStore.connections);

const expanded = ref<Record<string, boolean>>({});
const groupBySchema = ref(true);

// Dialog state
const showEditDialog = ref(false);
const editingConnection = ref<any>(null);
const editFormState = useConnectionForm();

onMounted(async () => {
  await connectionsStore.loadConnections();
});

const emit = defineEmits(["new-connection"]);

const loadConnections = () => {
  connectionsStore.loadConnections();
};

const tabsStore = useTabsStore();

const openTable = (
  connectionId: string,
  databaseName: string,
  table: { schema: string; name: string },
) => {
  tabsStore.addTableTab(connectionId, databaseName, table.schema, table.name);
};

const openView = (
  connectionId: string,
  databaseName: string,
  view: { schema: string; name: string },
) => {
  tabsStore.addViewTab(connectionId, databaseName, view.schema, view.name);
};

const openProcedure = (
  connectionId: string,
  databaseName: string,
  procedure: { schema: string; name: string },
) => {
  tabsStore.addProcedureTab(
    connectionId,
    databaseName,
    procedure.schema,
    procedure.name,
  );
};

const toggleDatabase = async (connectionId: string, db: any) => {
  const key = `db-${connectionId}-${db.name}`;
  expanded.value[key] = !expanded.value[key];
  if (expanded.value[key] && !db.loaded) {
    await connectionsStore.loadSchemaForDatabase(connectionId, db);
  }
};

const handleSaveConnection = async () => {
  // Refresh connections to show updated data
  await connectionsStore.loadConnections();

  showEditDialog.value = false;
  editingConnection.value = null;
};

const handleCancelEdit = () => {
  showEditDialog.value = false;
  editingConnection.value = null;
};

const editConnection = (conn: any) => {
  // Populate form with connection data
  Object.assign(editFormState.form, {
    name: conn.name,
    type: conn.type,
    host: conn.host,
    port: conn.port?.toString() || "",
    username: conn.username || "",
    password: conn.password || "",
    database: conn.database || "",
  });

  editingConnection.value = conn;
  showEditDialog.value = true;
};
</script>
