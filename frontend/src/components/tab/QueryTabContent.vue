<template>
  <TabView title="Query Editor" :subtitle="tab.database" type="query">
    <template #actions>
      <div class="flex items-center gap-2">
        <div
          class="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-hover/50 border border-border/50"
        >
          <Database class="w-3 h-3 text-foreground-secondary" />
          <select
            :value="
              JSON.stringify({ connId: tab.connectionId, db: tab.database })
            "
            @change="
              (e) => {
                const val = JSON.parse((e.target as HTMLSelectElement).value);
                tab.connectionId = val.connId;
                tab.database = val.db;
              }
            "
            class="text-[10px] bg-transparent border-none outline-none focus:ring-0 cursor-pointer font-medium text-foreground-secondary hover:text-foreground transition-colors max-w-[120px]"
          >
            <optgroup
              v-for="conn in connectionsStore.connections"
              :key="conn.id"
              :label="conn.name"
            >
              <option
                v-for="db in conn.databases"
                :key="db.name"
                :value="JSON.stringify({ connId: conn.id, db: db.name })"
              >
                {{ db.name }}
              </option>
            </optgroup>
          </select>
        </div>

        <div class="h-4 w-px bg-border mx-1"></div>

        <button
          class="btn-primary"
          title="Execute Query (⌘Enter)"
          @click="executeQuery"
          :disabled="tab.state.loading"
        >
          <Loader2 v-if="tab.state.loading" class="w-3.5 h-3.5 animate-spin" />
          <PlayIcon v-else class="w-3.5 h-3.5" />
          {{ tab.state.loading ? "Running..." : "Run" }}
        </button>
      </div>
    </template>

    <div class="h-full flex flex-col overflow-hidden">
      <div class="flex-1 min-h-[200px] relative">
        <SqlEditor
          v-model="tab.state.content"
          height="100%"
          :connection-id="tab.connectionId"
          :database="tab.database"
          @execute="executeQuery"
        />
      </div>

      <!-- Result Area -->
      <Resizable
        v-model:width="tab.state.resultHeight"
        :min="100"
        :max="800"
        position="top"
      >
        <div
          class="border-t border-border bg-surface flex flex-col h-full overflow-hidden"
          style="height: 100%"
        >
          <div
            class="h-8 border-b border-border bg-surface-hover/50 flex-none flex items-center justify-between shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)]"
          >
            <div class="flex items-center h-full">
              <div
                class="flex items-center px-3 gap-2 h-full border-r border-border"
              >
                <span
                  class="text-[10px] font-black uppercase tracking-widest text-foreground-secondary"
                  >Results</span
                >
              </div>

              <div
                v-if="
                  tab.state.results?.resultSets &&
                  tab.state.results.resultSets.length > 1
                "
                class="flex items-center h-full px-1"
              >
                <button
                  v-for="(rs, idx) in tab.state.results.resultSets"
                  :key="idx"
                  class="px-3 text-[9px] font-bold border-b-2 transition-colors uppercase tracking-tight h-full flex items-center"
                  :class="
                    tab.state.activeResultSetIndex === idx
                      ? 'border-primary text-foreground bg-primary/5'
                      : 'border-transparent text-foreground-secondary hover:text-foreground'
                  "
                  @click="tab.state.activeResultSetIndex = idx"
                >
                  Result Set {{ idx + 1 }}

                  <div class="flex items-center px-3 gap-2">
                    <span
                      v-if="activeResultSet"
                      class="text-[10px] font-bold text-foreground-secondary opacity-60 uppercase tracking-tighter"
                    >
                      <template
                        v-if="
                          rs.rowsAffected >
                          rs.data.length
                        "
                      >
                        {{ rs.rowsAffected }} RECORDS (SHOWING {{ rs.data.length }})
                      </template>
                      <template v-else>
                        {{ rs.data.length }} RECORDS
                      </template>
                    </span>
                    <span
                      v-else
                      class="text-[10px] font-bold text-foreground-secondary opacity-60 uppercase tracking-tighter"
                      >0 RECORDS</span
                    >
                  </div>
                </button>
              </div>
            </div>

            <div class="flex items-center gap-2 px-3">
              <span
                v-if="tab.state.results?.elapsedMs"
                class="text-[10px] font-bold text-foreground-secondary uppercase tracking-tight mr-2"
                >{{ tab.state.results.elapsedMs }}ms</span
              >
              <span
                class="text-[10px] font-bold text-foreground-secondary uppercase tracking-tight"
                >{{ (tab.state.content || "").length }} bytes</span
              >
            </div>
          </div>

          <div
            class="flex-1 min-h-0 bg-surface-hover/20 overflow-hidden flex flex-col"
          >
            <template v-if="tab.state.loading">
              <div
                class="flex-1 flex flex-col items-center justify-center gap-3 opacity-50 grayscale"
              >
                <Loader2 class="w-8 h-8 animate-spin" />
                <p class="text-[10px] font-bold uppercase tracking-[0.2em]">
                  Executing Query...
                </p>
              </div>
            </template>
            <template v-else-if="tab.state.error">
              <div
                class="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-red-500/70 overflow-auto"
              >
                <AlertCircle class="w-10 h-10" />
                <p
                  class="text-[10px] font-mono whitespace-pre-wrap break-all text-center max-lg leading-relaxed"
                >
                  {{ tab.state.error }}
                </p>
              </div>
            </template>
            <template v-else-if="tab.state.results?.resultSets?.length">
              <div class="h-full flex flex-col overflow-hidden">
                <div class="flex-1 min-h-0 relative">
                  <DataTable
                    v-if="activeResultSet"
                    :data="activeResultSet.data"
                    :columns="activeResultSetColumns"
                    class="h-full"
                  />
                  <div
                    v-else
                    class="h-full flex items-center justify-center opacity-30"
                  >
                    <p class="text-[10px] font-bold uppercase tracking-[0.2em]">
                      No data in this result set
                    </p>
                  </div>
                </div>
              </div>
            </template>
            <template v-else-if="tab.state.results">
              <div
                class="h-full flex flex-col items-center justify-center gap-4 opacity-30 grayscale"
              >
                <div class="relative">
                  <Database class="w-12 h-12 stroke-1" />
                  <div
                    class="absolute -bottom-1 -right-1 bg-surface rounded-full p-1"
                  >
                    <Search class="w-5 h-5 stroke-[3]" />
                  </div>
                </div>
                <div class="flex flex-col items-center gap-1">
                  <p class="text-[10px] font-bold uppercase tracking-[0.2em]">
                    Query executed successfully
                  </p>
                  <p
                    class="text-[10px] font-medium opacity-60 uppercase tracking-tighter"
                  >
                    But returned no results
                  </p>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="h-full overflow-hidden">
                <div
                  class="h-full flex flex-col items-center justify-center gap-3 opacity-30 grayscale p-12"
                >
                  <Database class="w-12 h-12 stroke-1" />
                  <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] max-w-[200px] text-center leading-relaxed"
                  >
                    Execute your SQL statement to view mapped results
                  </p>
                </div>
              </div>
            </template>
          </div>
        </div>
      </Resizable>
    </div>
  </TabView>
</template>

<script setup lang="ts">
import {
  Play as PlayIcon,
  Database,
  Loader2,
  AlertCircle,
  Search,
} from "lucide-vue-next";
import SqlEditor from "../SqlEditor.vue";
import TabView from "../TabView.vue";
import Resizable from "../Resizable.vue";
import DataTable from "../DataTable.vue";
import { QueryTab } from "@/stores/tabsStore";
import { useConnectionsStore } from "@/stores/connectionsStore";
import { ExecuteQuery } from "wailsjs/go/main/App";
import { computed } from "vue";

interface Props {
  tab: QueryTab;
}

const props = defineProps<Props>();
const connectionsStore = useConnectionsStore();

const activeResultSet = computed(() => {
  if (!props.tab.state.results?.resultSets?.length) return null;
  return (
    props.tab.state.results.resultSets[props.tab.state.activeResultSetIndex] ||
    props.tab.state.results.resultSets[0]
  );
});

const activeResultSetColumns = computed(() => {
  if (!activeResultSet.value?.data?.length) {
    return activeResultSet.value?.columns || [];
  }
  return Object.keys(activeResultSet.value.data[0]);
});

const executeQuery = async () => {
  if (!props.tab.state.content.trim()) return;

  props.tab.state.loading = true;
  props.tab.state.error = null;
  props.tab.state.activeResultSetIndex = 0;

  try {
    const result = await ExecuteQuery(
      props.tab.connectionId,
      props.tab.database,
      props.tab.state.content,
    );
    props.tab.state.results = result;
  } catch (e: any) {
    props.tab.state.error = e.toString();
    props.tab.state.results = undefined;
  } finally {
    props.tab.state.loading = false;
  }
};
</script>
