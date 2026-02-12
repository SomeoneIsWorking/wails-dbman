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
    <ExplorerConnection
      v-for="conn in connections"
      :key="conn.id"
      :connection="conn"
      :is-expanded="expanded[`conn-${conn.id}`]"
      @toggle="expanded[`conn-${conn.id}`] = !expanded[`conn-${conn.id}`]"
      @edit="editConnection(conn)"
      @contextmenu="onContextMenu($event, 'connection', conn)"
    >
      <ExplorerDatabase
        v-for="db in filteredDatabases(conn)"
        :key="`${conn.id}-${db.name}`"
        :database="db"
        :is-expanded="expanded[`db-${conn.id}-${db.name}`]"
        :group-by-schema="groupBySchema"
        @toggle="toggleDatabase(conn.id, db)"
        @refresh="connectionsStore.loadSchemaForDatabase(conn.id, db, true)"
        @contextmenu="
          onContextMenu($event, 'database', { connId: conn.id, db })
        "
        @openTable="(table) => openTable(conn.id, db.name, table)"
        @openView="(view) => openView(conn.id, db.name, view)"
        @openProcedure="(proc) => openProcedure(conn.id, db.name, proc)"
      />
    </ExplorerConnection>
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

  <ContextMenu :show="menuShow" :x="menuX" :y="menuY" @close="menuShow = false">
    <template v-if="menuType === 'connection'">
      <ContextMenuItem
        label="Refresh Connection"
        :icon="RefreshCw"
        @click="
          loadConnections();
          menuShow = false;
        "
      />
      <ContextMenuItem
        label="Edit Connection"
        :icon="Edit"
        @click="
          editConnection(menuData);
          menuShow = false;
        "
      />
      <ContextMenuItem
        :label="
          menuData?.showHidden
            ? 'Hide Hidden Databases'
            : 'Show Hidden Databases'
        "
        :icon="menuData?.showHidden ? EyeOff : Eye"
        @click="handleToggleShowHidden"
      />
    </template>
    <template v-else-if="menuType === 'database'">
      <ContextMenuItem
        label="New Query"
        :icon="FilePlus"
        @click="
          tabsStore.addQueryTab(menuData.connId, menuData.db.name);
          menuShow = false;
        "
      />
      <ContextSubMenu
        v-if="existingQueryTabs.length > 0"
        label="Existing Queries"
        :icon="ExternalLink"
      >
        <ContextMenuItem
          v-for="tab in existingQueryTabs"
          :key="tab.id"
          :label="tab.title"
          :icon="FileText"
          @click="
            tabsStore.setActiveTab(tab);
            menuShow = false;
          "
        />
      </ContextSubMenu>

      <div class="h-px bg-border my-1"></div>

      <ContextMenuItem
        label="Refresh Schema"
        :icon="RefreshCw"
        @click="
          connectionsStore.loadSchemaForDatabase(
            menuData.connId,
            menuData.db,
            true,
          );
          menuShow = false;
        "
      />
      <ContextMenuItem
        v-if="!menuData.db.isHidden"
        label="Hide Database"
        :icon="EyeOff"
        @click="handleHideDatabase"
      />
      <ContextMenuItem
        v-else
        label="Show Database"
        :icon="Eye"
        @click="
          connectionsStore.showDatabase(menuData.connId, menuData.db.name);
          menuShow = false;
        "
      />
    </template>
  </ContextMenu>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  RefreshCw,
  FolderTree,
  Group,
  List,
  Plus,
  EyeOff,
  Eye,
  Edit,
  FilePlus,
  ExternalLink,
  FileText,
} from "lucide-vue-next";
import { useTabsStore } from "@/stores/tabsStore";
import {
  useConnectionsStore,
  type ExtendedConnection,
  type DatabaseInfo,
} from "@/stores/connectionsStore";
import { useConnectionForm } from "@/composables/useConnectionForm";

import ContextSubMenu from "./ContextSubMenu.vue";
import ConnectionDialog from "./ConnectionDialog.vue";
import ContextMenu from "./ContextMenu.vue";
import ContextMenuItem from "./ContextMenuItem.vue";
import ExplorerConnection from "./ExplorerConnection.vue";
import ExplorerDatabase from "./ExplorerDatabase.vue";
import { OverlayScrollbarsComponent } from "overlayscrollbars-vue";

const connectionsStore = useConnectionsStore();
const connections = computed(() => connectionsStore.connections);

const expanded = ref<Record<string, boolean>>({});
const groupBySchema = ref(true);

// Context Menu State
const menuShow = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const menuType = ref<"connection" | "database">("connection");
const menuData = ref<any>(null);

const onContextMenu = (
  e: MouseEvent,
  type: "connection" | "database",
  data: any,
) => {
  e.preventDefault();
  menuType.value = type;
  menuData.value = data;
  menuX.value = e.clientX;
  menuY.value = e.clientY;
  menuShow.value = true;
};

const handleHideDatabase = () => {
  const { connId, db } = menuData.value;
  connectionsStore.hideDatabase(connId, db.name);
  menuShow.value = false;
};

const handleToggleShowHidden = () => {
  const conn = menuData.value;
  connectionsStore.toggleShowHidden(conn.id);
  menuShow.value = false;
};

const filteredDatabases = (conn: ExtendedConnection): DatabaseInfo[] => {
  if (conn.showHidden) return conn.databases;
  return conn.databases.filter((db) => !db.isHidden);
};

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

const existingQueryTabs = computed(() => {
  if (menuType.value !== "database" || !menuData.value) return [];
  return tabsStore.tabs.filter(
    (t) =>
      t.type === "query" &&
      t.connectionId === menuData.value.connId &&
      t.database === menuData.value.db.name,
  );
});

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
