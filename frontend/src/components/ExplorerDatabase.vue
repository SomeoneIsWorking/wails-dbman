<template>
  <CollapsibleItem
    class="ml-1 mt-1"
    :expanded="isExpanded"
    @toggle="$emit('toggle')"
  >
    <template #header>
      <div
        class="flex items-center flex-1 min-w-0"
        :class="{ 'opacity-50 italic': database.isHidden }"
        @contextmenu.prevent.stop="$emit('contextmenu', $event)"
      >
        <Loader2 v-if="database.loading" class="w-3 h-3 mr-1 animate-spin" />
        <DatabaseIcon v-else class="w-3 h-3 mr-1" />
        <span class="font-medium flex-1 text-xs truncate">{{
          database.name
        }}</span>
      </div>
    </template>

    <div v-if="database.loaded">
      <!-- Tables -->
      <CollapsibleItem
        v-if="Object.keys(database.tablesBySchema).length"
        class="ml-1 mt-1"
        :expanded="expandedItems[`tables-${database.name}`]"
        @toggle="toggleItem(`tables-${database.name}`)"
      >
        <template #header>
          <Table class="w-3 h-3 mr-1" />
          <span class="font-medium">Tables</span>
        </template>
        <template v-if="groupBySchema">
          <CollapsibleItem
            v-for="schema in Object.keys(database.tablesBySchema)"
            :key="schema"
            class="ml-1 mt-1"
            :expanded="expandedItems[`table-${database.name}-${schema}`]"
            @toggle="toggleItem(`table-${database.name}-${schema}`)"
          >
            <template #header>
              <Folder class="w-3 h-3 mr-1" />
              <span class="font-medium">{{ schema }}</span>
            </template>
            <div
              v-for="table in database.tablesBySchema[schema]"
              :key="`${database.name}-${table.schema}.${table.name}`"
              class="flex ml-1 mt-1 items-center cursor-pointer hover:bg-surface-hover p-1 rounded"
              @click="$emit('openTable', table)"
            >
              <Table class="w-3 h-3 mr-2 text-success" />
              <span>{{ table.name }}</span>
            </div>
          </CollapsibleItem>
        </template>
        <template v-else>
          <div
            v-for="table in Object.values(
              database.tablesBySchema,
            ).flat() as any[]"
            :key="`${database.name}-${table.schema}.${table.name}`"
            class="flex ml- mt-1 items-center cursor-pointer hover:bg-surface-hover p-1 rounded"
            @click="$emit('openTable', table)"
          >
            <Table class="w-3 h-3 mr-2 text-success" />
            <span>{{ table.schema }}.{{ table.name }}</span>
          </div>
        </template>
      </CollapsibleItem>

      <!-- Views -->
      <CollapsibleItem
        v-if="Object.keys(database.viewsBySchema).length"
        class="ml-1 mt-1"
        :expanded="expandedItems[`views-${database.name}`]"
        @toggle="toggleItem(`views-${database.name}`)"
      >
        <template #header>
          <Eye class="w-3 h-3 mr-1" />
          <span class="font-medium">Views</span>
        </template>
        <template v-if="groupBySchema">
          <CollapsibleItem
            v-for="schema in Object.keys(database.viewsBySchema)"
            :key="schema"
            class="ml-1 mt-1"
            :expanded="expandedItems[`view-${database.name}-${schema}`]"
            @toggle="toggleItem(`view-${database.name}-${schema}`)"
          >
            <template #header>
              <Folder class="w-3 h-3 mr-1" />
              <span class="font-medium">{{ schema }}</span>
            </template>
            <div
              v-for="view in database.viewsBySchema[schema]"
              :key="`${database.name}-${view.schema}.${view.name}`"
              class="flex ml-1 mt-1 items-center cursor-pointer hover:bg-surface-hover p-1 rounded text-xs"
              @click="$emit('openView', view)"
            >
              <Eye class="w-3 h-3 mr-2 text-accent" />
              <span>{{ view.name }}</span>
            </div>
          </CollapsibleItem>
        </template>
        <template v-else>
          <div
            v-for="view in Object.values(
              database.viewsBySchema,
            ).flat() as any[]"
            :key="`${database.name}-${view.schema}.${view.name}`"
            class="flex ml-1 mt-1 items-center cursor-pointer hover:bg-surface-hover p-1 rounded text-xs"
            @click="$emit('openView', view)"
          >
            <Eye class="w-3 h-3 mr-2 text-accent" />
            <span>{{ view.schema }}.{{ view.name }}</span>
          </div>
        </template>
      </CollapsibleItem>

      <!-- Procedures -->
      <CollapsibleItem
        v-if="Object.keys(database.proceduresBySchema).length"
        class="ml-1 mt-1"
        :expanded="expandedItems[`procs-${database.name}`]"
        @toggle="toggleItem(`procs-${database.name}`)"
      >
        <template #header>
          <Settings class="w-3 h-3 mr-1" />
          <span class="font-medium">Procedures</span>
        </template>
        <template v-if="groupBySchema">
          <CollapsibleItem
            v-for="schema in Object.keys(database.proceduresBySchema)"
            :key="schema"
            class="ml-1 mt-1"
            :expanded="expandedItems[`procedure-${database.name}-${schema}`]"
            @toggle="toggleItem(`procedure-${database.name}-${schema}`)"
          >
            <template #header>
              <Folder class="w-3 h-3 mr-1" />
              <span class="font-medium">{{ schema }}</span>
            </template>
            <div class="space-y-1">
              <div
                v-for="proc in database.proceduresBySchema[schema]"
                :key="`${database.name}-${proc.schema}.${proc.name}`"
                class="flex items-center cursor-pointer hover:bg-surface-hover p-1 rounded text-xs"
                @click="$emit('openProcedure', proc)"
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
              v-for="proc in Object.values(
                database.proceduresBySchema,
              ).flat() as any[]"
              :key="`${database.name}-${proc.schema}.${proc.name}`"
              class="flex ml-2 items-center cursor-pointer hover:bg-surface-hover p-1 rounded text-xs"
              @click="$emit('openProcedure', proc)"
            >
              <Settings class="w-3 h-3 mr-2 text-warning" />
              <span>{{ proc.schema }}.{{ proc.name }}</span>
            </div>
          </div>
        </template>
      </CollapsibleItem>
    </div>
  </CollapsibleItem>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  Database as DatabaseIcon,
  Loader2,
  Table,
  Eye,
  Settings,
  Folder,
} from "lucide-vue-next";
import type { DatabaseInfo } from "@/stores/connectionsStore";
import CollapsibleItem from "./CollapsibleItem.vue";

const props = defineProps<{
  database: DatabaseInfo;
  isExpanded: boolean;
  groupBySchema: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
  refresh: [];
  contextmenu: [event: MouseEvent];
  openTable: [table: any];
  openView: [view: any];
  openProcedure: [proc: any];
}>();

const expandedItems = ref<Record<string, boolean>>({});

const toggleItem = (key: string) => {
  expandedItems.value[key] = !expandedItems.value[key];
};
</script>
