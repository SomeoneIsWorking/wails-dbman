<template>
  <div class="h-full flex flex-col">
    <div class="p-4 border-b border-border bg-surface-hover">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Settings class="w-5 h-5 text-orange-600" />
          <h3 class="text-lg font-semibold text-foreground">{{ tab.objectName }}</h3>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="btn-primary"
            @click="executeProcedure"
          >
            Execute
          </button>
          <button
            class="btn-secondary"
            @click="toggleModify"
          >
            {{ isModifying ? 'Save' : 'Modify' }}
          </button>
        </div>
      </div>
    </div>
    <div class="flex-1 overflow-auto p-4">
      <StateWrapper :state="procedureState">
        <template #success="{ data }">
          <div class="space-y-6">
            <!-- Parameters Section -->
            <div v-if="data.info?.parameters && data.info.parameters.length > 0">
              <h4 class="text-lg font-semibold mb-3 text-foreground">Parameters</h4>
              <div class="bg-surface-hover rounded-lg p-4">
                <div class="overflow-x-auto">
                  <table class="min-w-full">
                    <thead>
                      <tr class="border-b border-border">
                        <th class="text-left py-2 px-3 text-sm font-medium text-foreground-secondary">Name</th>
                        <th class="text-left py-2 px-3 text-sm font-medium text-foreground-secondary">Type</th>
                        <th class="text-left py-2 px-3 text-sm font-medium text-foreground-secondary">Mode</th>
                        <th class="text-left py-2 px-3 text-sm font-medium text-foreground-secondary">Default</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="param in data.info.parameters" :key="param.name" class="border-b border-border">
                        <td class="py-2 px-3 text-sm text-foreground">{{ param.name }}</td>
                        <td class="py-2 px-3 text-sm text-foreground-secondary">{{ param.type }}</td>
                        <td class="py-2 px-3 text-sm">
                          <span :class="param.mode === 'IN' ? 'text-green-600' : param.mode === 'OUT' ? 'text-blue-600' : 'text-purple-600'" class="font-medium">
                            {{ param.mode }}
                          </span>
                        </td>
                        <td class="py-2 px-3 text-sm text-foreground-secondary">{{ param.defaultValue || '-' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Result Sets Section -->
            <div v-if="data.info?.resultSets && data.info.resultSets.length > 0">
              <h4 class="text-lg font-semibold mb-3 text-foreground">Result Sets</h4>
              <div class="space-y-4">
                <div v-for="(resultSet, index) in data.info.resultSets" :key="index" class="bg-surface-hover rounded-lg p-4">
                  <h5 class="text-md font-medium mb-2 text-foreground">Result Set {{ index + 1 }}</h5>
                  <div class="overflow-x-auto">
                    <table class="min-w-full">
                      <thead>
                        <tr class="border-b border-border">
                          <th class="text-left py-2 px-3 text-sm font-medium text-foreground-secondary">Column</th>
                          <th class="text-left py-2 px-3 text-sm font-medium text-foreground-secondary">Type</th>
                          <th class="text-left py-2 px-3 text-sm font-medium text-foreground-secondary">Nullable</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="col in resultSet.columns" :key="col.name" class="border-b border-border">
                          <td class="py-2 px-3 text-sm text-foreground">{{ col.name }}</td>
                          <td class="py-2 px-3 text-sm text-foreground-secondary">{{ col.type }}</td>
                          <td class="py-2 px-3 text-sm">
                            <span :class="col.nullable ? 'text-orange-600' : 'text-green-600'">
                              {{ col.nullable ? 'Yes' : 'No' }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- Definition Section -->
            <div>
              <h4 class="text-lg font-semibold mb-3 text-foreground">Definition</h4>
              <SqlEditor
                :modelValue="data.content"
                height="400px"
                :readonly="!isModifying"
                :connection-id="tab.connectionId"
                :database="tab.database"
              />
            </div>
          </div>
        </template>
      </StateWrapper>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Settings } from "lucide-vue-next";
import SqlEditor from "../SqlEditor.vue";
import StateWrapper from "../StateWrapper.vue";
import type { ProcedureTab } from "@/stores/tabsStore";

interface Props {
  tab: ProcedureTab;
}

const props = defineProps<Props>();

const procedureState = computed(() => props.tab.state);
const isModifying = ref(false);

const executeProcedure = () => {
  alert("Execute functionality not implemented yet. This would run the stored procedure with parameters.");
};

const toggleModify = () => {
  isModifying.value = !isModifying.value;
  if (!isModifying.value) {
    // Save logic here if needed
    alert("Save functionality not implemented yet. This would update the procedure definition.");
  }
};
</script>
