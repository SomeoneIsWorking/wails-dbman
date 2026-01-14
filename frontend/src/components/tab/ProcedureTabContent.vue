<template>
  <TabView
    :title="tab.objectName"
    :icon="SettingsIcon"
    icon-class="text-orange-500"
    :tabs="[
      { id: 'info', label: 'Info' },
      { id: 'definition', label: 'Definition' },
      { id: 'query', label: 'Query' },
    ]"
    v-model:activeTab="procedureState.activeTab"
  >
    <template #actions>
      <button
        v-if="procedureState.activeTab === 'definition'"
        class="btn-ghost"
        @click="toggleModify"
      >
        <component :is="isModifying ? Save : Edit3" class="w-3.5 h-3.5" />
        {{ isModifying ? "Save" : "Modify" }}
      </button>
      <button
        v-if="procedureState.activeTab === 'query'"
        class="btn-primary"
        @click="executeProcedure"
      >
        <Play class="w-3.5 h-3.5" />
        Execute
      </button>
    </template>

    <StateWrapper
      :loading="procedureState.loading"
      :error="procedureState.error"
    >
      <ProcedureInfoTab
        v-if="procedureState.activeTab === 'info'"
        :info="procedureState.info"
        :loading="procedureState.loading"
        :error="procedureState.error"
      />
      <ProcedureDefinitionTab
        v-else-if="procedureState.activeTab === 'definition'"
        :content="procedureState.content"
        :is-modifying="isModifying"
        :connection-id="tab.connectionId"
        :database="tab.database"
      />
      <ProcedureQueryTab
        v-else-if="procedureState.activeTab === 'query'"
        :object-name="tab.objectName"
        :parameters="procedureState.info?.parameters"
        :connection-id="tab.connectionId"
        :database="tab.database"
      />
    </StateWrapper>
  </TabView>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Settings as SettingsIcon, Save, Edit3, Play } from "lucide-vue-next";
import StateWrapper from "../StateWrapper.vue";
import TabView from "../TabView.vue";
import ProcedureInfoTab from "./ProcedureInfoTab.vue";
import ProcedureDefinitionTab from "./ProcedureDefinitionTab.vue";
import ProcedureQueryTab from "./ProcedureQueryTab.vue";
import type { ProcedureTab } from "@/stores/tabsStore";

interface Props {
  tab: ProcedureTab;
}

const props = defineProps<Props>();

const procedureState = computed(() => props.tab.state);
const isModifying = ref(false);

const executeProcedure = () => {
  alert(
    "Execute functionality not implemented yet. This would run the stored procedure with parameters."
  );
};

const toggleModify = () => {
  isModifying.value = !isModifying.value;
  if (!isModifying.value) {
    // Save logic here if needed
    alert(
      "Save functionality not implemented yet. This would update the procedure definition."
    );
  }
};
</script>
