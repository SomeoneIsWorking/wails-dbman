<template>
  <div class="h-full flex flex-col">
    <div class="p-4 border-b border-gray-200 bg-gray-50">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Settings class="w-5 h-5 text-orange-600" />
          <h3 class="text-lg font-semibold">{{ tab.objectName }}</h3>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Execute
          </button>
          <button
            class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
          >
            Modify
          </button>
        </div>
      </div>
    </div>
    <div class="flex-1 overflow-auto p-4">
      <div v-if="error" class="flex items-center justify-center h-full">
        <div class="text-center text-red-600">
          <AlertTriangle class="w-12 h-12 mx-auto mb-4" />
          <h4 class="text-lg font-semibold mb-2">
            Failed to load procedure definition
          </h4>
          <p class="text-sm">{{ error }}</p>
        </div>
      </div>
      <SqlEditor
        v-else
        v-model="procedureContent"
        height="100%"
        readonly
        :connection-id="tab.connectionId"
        :database="tab.database"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Settings, AlertTriangle } from "lucide-vue-next";
import SqlEditor from "../SqlEditor.vue";
import { AnalyzeProcedure } from "wailsjs/go/main/App";

interface Props {
  tab: {
    id: string;
    type: "procedure";
    title: string;
    connectionId: string;
    database: string;
    objectName: string;
  };
}

const props = defineProps<Props>();

const procedureContent = ref("");
const error = ref<string | null>(null);

const loadProcedureContent = async () => {
  try {
    error.value = null;

    const procedureInfo = await AnalyzeProcedure(
      props.tab.connectionId,
      props.tab.database,
      props.tab.objectName.split(".")[0],
      props.tab.objectName.split(".")[1]
    );

    if (procedureInfo && procedureInfo.definition) {
      procedureContent.value = procedureInfo.definition;
    } else {
      procedureContent.value = `-- Procedure definition not available\n-- ${props.tab.objectName}`;
    }
  } catch (err: any) {
    error.value = err.message;
    procedureContent.value = `-- Failed to load procedure definition\n-- Error: ${err.message}`;
  }
};

onMounted(() => {
  loadProcedureContent();
});
</script>
