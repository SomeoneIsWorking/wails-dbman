<template>
  <div
    class="p-3 border-b border-border bg-surface-hover flex items-center gap-1 text-foreground"
  >
    <h2 class="text-sm font-semibold flex items-center gap-2">
      <FolderTree class="w-4 h-4 flex-shrink-0" />
      Database Explorer
    </h2>
    <div class="flex-1"></div>
    <button
      @click="loadConnections"
      class="p-1 hover:bg-surface-hover rounded"
      title="Refresh"
    >
      <RefreshCw class="w-4 h-4 flex-shrink-0" />
    </button>
    <button
      @click="groupBySchema = !groupBySchema"
      class="p-1 hover:bg-surface-hover rounded"
      title="Toggle Group by Schema"
    >
      <component :is="groupBySchema ? Group : List" class="w-4 h-4 flex-shrink-0" />
    </button>
  </div>
  <div class="p-2 text-foreground-secondary">
    <div v-for="conn in connections" :key="conn.id" class="mb-1">
      <CollapsibleItem
        :level="0"
        :expanded="expanded[`conn-${conn.id}`]"
        @toggle="expanded[`conn-${conn.id}`] = !expanded[`conn-${conn.id}`]"
      >
        <template #header>
          <Server class="w-3 h-3 mr-1" />
          <span class="font-medium flex-1">{{ conn.name }} ({{ conn.type }})</span>
          <button
            @click.stop="editConnection(conn)"
            class="p-1 hover:bg-surface-hover rounded"
            title="Edit Connection"
          >
            <Edit class="w-3 h-3" />
          </button>
        </template>
        <div
          v-for="db in conn.databases"
          :key="`${conn.id}-${db.name}`"
          class="mb-1"
        >
          <CollapsibleItem
            :level="1"
            :expanded="expanded[`db-${conn.id}-${db.name}`]"
            @toggle="expanded[`db-${conn.id}-${db.name}`] = !expanded[`db-${conn.id}-${db.name}`]"
          >
            <template #header>
              <Database class="w-3 h-3 mr-1" />
              <span class="font-medium">{{ db.name }}</span>
            </template>
            <!-- Schema objects under database -->
            <!-- Tables -->
            <div v-if="Object.keys(db.tablesBySchema).length" class="mb-2">
              <CollapsibleItem
                :level="2"
                :expanded="expanded[`tables-${conn.id}-${db.name}`]"
                @toggle="expanded[`tables-${conn.id}-${db.name}`] = !expanded[`tables-${conn.id}-${db.name}`]"
              >
                <template #header>
                  <Table class="w-3 h-3 mr-1" />
                  <span class="font-medium">Tables</span>
                </template>
                <template v-if="groupBySchema">
                  <div
                    v-for="schema in Object.keys(db.tablesBySchema)"
                    :key="schema"
                    class="mb-2"
                  >
                    <CollapsibleItem
                      :level="3"
                      :expanded="expanded[`schema-${conn.id}-${db.name}-${schema}`]"
                      @toggle="expanded[`schema-${conn.id}-${db.name}-${schema}`] = !expanded[`schema-${conn.id}-${db.name}-${schema}`]"
                    >
                      <template #header>
                        <Folder class="w-3 h-3 mr-1" />
                        <span class="font-medium">{{ schema }}</span>
                      </template>
                      <div class="space-y-1">
                        <div
                          v-for="table in db.tablesBySchema[schema]"
                          :key="`${conn.id}-${db.name}-${table.schema}.${table.name}`"
                          class="flex items-center cursor-pointer hover:bg-surface-hover p-1 rounded text-xs"
                          @click="openTable(conn.id, db.name, table)"
                        >
                          <Table class="w-3 h-3 mr-2 text-success flex-shrink-0" />
                          <span>{{ table.name }}</span>
                        </div>
                      </div>
                    </CollapsibleItem>
                  </div>
                </template>
                <template v-else>
                  <div class="space-y-1">
                    <div
                      v-for="table in Object.values(db.tablesBySchema).flat()"
                      :key="`${conn.id}-${db.name}-${table.schema}.${table.name}`"
                      class="flex items-center cursor-pointer hover:bg-surface-hover p-1 rounded text-xs"
                      @click="openTable(conn.id, db.name, table)"
                    >
                      <Table class="w-3 h-3 mr-2 text-success flex-shrink-0" />
                      <span>{{ table.schema }}.{{ table.name }}</span>
                    </div>
                  </div>
                </template>
              </CollapsibleItem>
            </div>

            <!-- Views -->
            <div v-if="Object.keys(db.viewsBySchema).length" class="mb-2">
              <CollapsibleItem
                :level="2"
                :expanded="expanded[`views-${conn.id}-${db.name}`]"
                @toggle="expanded[`views-${conn.id}-${db.name}`] = !expanded[`views-${conn.id}-${db.name}`]"
              >
                <template #header>
                  <Eye class="w-3 h-3 mr-1" />
                  <span class="font-medium">Views</span>
                </template>
                <template v-if="groupBySchema">
                  <div
                    v-for="schema in Object.keys(db.viewsBySchema)"
                    :key="schema"
                    class="mb-2"
                  >
                    <CollapsibleItem
                      :level="3"
                      :expanded="expanded[`schema-${conn.id}-${db.name}-${schema}`]"
                      @toggle="expanded[`schema-${conn.id}-${db.name}-${schema}`] = !expanded[`schema-${conn.id}-${db.name}-${schema}`]"
                    >
                      <template #header>
                        <Folder class="w-3 h-3 mr-1" />
                        <span class="font-medium">{{ schema }}</span>
                      </template>
                      <div class="space-y-1">
                        <div
                          v-for="view in db.viewsBySchema[schema]"
                          :key="`${conn.id}-${db.name}-${view.schema}.${view.name}`"
                          class="flex items-center cursor-pointer hover:bg-surface-hover p-1 rounded text-xs"
                          @click="openView(conn.id, db.name, view)"
                        >
                          <Eye class="w-3 h-3 mr-2 text-accent flex-shrink-0" />
                          <span>{{ view.name }}</span>
                        </div>
                      </div>
                    </CollapsibleItem>
                  </div>
                </template>
                <template v-else>
                  <div class="space-y-1">
                    <div
                      v-for="view in Object.values(db.viewsBySchema).flat()"
                      :key="`${conn.id}-${db.name}-${view.schema}.${view.name}`"
                      class="flex items-center cursor-pointer hover:bg-surface-hover p-1 rounded text-xs"
                      @click="openView(conn.id, db.name, view)"
                    >
                      <Eye class="w-3 h-3 mr-2 text-accent flex-shrink-0" />
                      <span>{{ view.schema }}.{{ view.name }}</span>
                    </div>
                  </div>
                </template>
              </CollapsibleItem>
            </div>

            <!-- Procedures -->
            <div v-if="Object.keys(db.proceduresBySchema).length" class="mb-2">
              <CollapsibleItem
                :level="2"
                :expanded="expanded[`procs-${conn.id}-${db.name}`]"
                @toggle="expanded[`procs-${conn.id}-${db.name}`] = !expanded[`procs-${conn.id}-${db.name}`]"
              >
                <template #header>
                  <Settings class="w-3 h-3 mr-1" />
                  <span class="font-medium">Procedures</span>
                </template>
                <template v-if="groupBySchema">
                  <div
                    v-for="schema in Object.keys(db.proceduresBySchema)"
                    :key="schema"
                    class="mb-2"
                  >
                    <CollapsibleItem
                      :level="3"
                      :expanded="expanded[`schema-${conn.id}-${db.name}-${schema}`]"
                      @toggle="expanded[`schema-${conn.id}-${db.name}-${schema}`] = !expanded[`schema-${conn.id}-${db.name}-${schema}`]"
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
                          <Settings class="w-3 h-3 mr-2 text-warning flex-shrink-0" />
                          <span>{{ proc.name }}</span>
                        </div>
                      </div>
                    </CollapsibleItem>
                  </div>
                </template>
                <template v-else>
                  <div class="space-y-1">
                    <div
                      v-for="proc in Object.values(
                        db.proceduresBySchema
                      ).flat()"
                      :key="`${conn.id}-${db.name}-${proc.schema}.${proc.name}`"
                      class="flex items-center cursor-pointer hover:bg-surface-hover p-1 rounded text-xs"
                      @click="openProcedure(conn.id, db.name, proc)"
                    >
                      <Settings class="w-3 h-3 mr-2 text-warning flex-shrink-0" />
                      <span>{{ proc.schema }}.{{ proc.name }}</span>
                    </div>
                  </div>
                </template>
              </CollapsibleItem>
            </div>
          </CollapsibleItem>
        </div>
      </CollapsibleItem>
    </div>
  </div>

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
} from "lucide-vue-next";
import { useTabsStore } from "@/stores/tabsStore";
import { useConnectionsStore } from "@/stores/connectionsStore";
import { useConnectionForm } from "@/composables/useConnectionForm";

import CollapsibleItem from "./CollapsibleItem.vue";
import ConnectionDialog from "./ConnectionDialog.vue";

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

const loadConnections = () => {
  connectionsStore.loadConnections();
};

const tabsStore = useTabsStore();

const openTable = (
  connectionId: string,
  databaseName: string,
  table: { schema: string; name: string }
) => {
  tabsStore.addTableTab(connectionId, databaseName, table.schema, table.name);
};

const openView = (
  connectionId: string,
  databaseName: string,
  view: { schema: string; name: string }
) => {
  tabsStore.addViewTab(connectionId, databaseName, view.schema, view.name);
};

const openProcedure = (
  connectionId: string,
  databaseName: string,
  procedure: { schema: string; name: string }
) => {
  tabsStore.addProcedureTab(
    connectionId,
    databaseName,
    procedure.schema,
    procedure.name
  );
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
    port: conn.port?.toString() || '',
    username: conn.username || '',
    password: conn.password || '',
    database: conn.database || '',
  });
  
  editingConnection.value = conn;
  showEditDialog.value = true;
};
</script>
