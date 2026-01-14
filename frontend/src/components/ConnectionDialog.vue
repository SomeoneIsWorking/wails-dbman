<template>
  <Dialog :is-open="isOpen" @cancel="handleCancel">
    <div
      class="flex items-center justify-between border-b border-border bg-surface px-4 py-3 flex-none"
    >
      <div class="flex items-center gap-2">
        <Server class="w-4 h-4 text-primary" />
        <h2 class="text-xs font-bold uppercase tracking-tight">{{ title }}</h2>
      </div>
      <button class="btn-ghost !p-1" @click="handleCancel">
        <X class="w-4 h-4" />
      </button>
    </div>

    <OverlayScrollbarsComponent class="p-4 min-h-0 flex-1">
      <ConnectionForm
        :is-editing="isEditing"
        :is-loading="isLoading"
        :error="error"
        :form-state="formState"
        @save="handleSave"
      />

      <div
        v-if="testResult"
        class="mt-4 p-2.5 rounded border text-sm font-medium animate-in slide-in-from-top-2"
        :class="
          testResult.success
            ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
        "
      >
        {{ testResult.message }}
      </div>
    </OverlayScrollbarsComponent>

    <div
      class="flex items-center justify-between border-t border-border bg-surface px-2 py-2 flex-none"
    >
      <button class="btn-ghost" :disabled="isTesting" @click="testConnection">
        <component
          :is="isTesting ? Loader : Zap"
          class="w-3.5 h-3.5"
          :class="{ 'animate-spin': isTesting }"
        />
        {{ isTesting ? "Testing..." : "Test" }}
      </button>

      <div class="flex gap-2">
        <button
          v-if="isEditing"
          class="btn-danger !bg-transparent !text-red-500 border-red-500 hover:!bg-red-500 hover:!text-white"
          @click="handleDelete"
        >
          Delete
        </button>
        <button
          class="btn-primary"
          :disabled="isLoading || isTesting"
          @click="handleSave"
        >
          {{ saveButtonText || "Save Connection" }}
        </button>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Zap, X, Server, Loader } from "lucide-vue-next";
import { useConnectionForm } from "../composables/useConnectionForm";
import {
  UpdateConnection,
  CreateConnection,
  TestConnection,
  DeleteConnection,
} from "wailsjs/go/main/App";
import ConnectionForm from "./connection/ConnectionForm.vue";
import Dialog from "./Dialog.vue";
import { OverlayScrollbarsComponent } from "overlayscrollbars-vue";

const props = defineProps<{
  isOpen: boolean;
  title: string;
  isEditing?: boolean;
  isLoading?: boolean;
  error?: any;
  formState: ReturnType<typeof useConnectionForm>;
  saveButtonText?: string;
  connectionId?: string;
}>();

const emit = defineEmits<{
  (e: "save"): void;
  (e: "cancel"): void;
}>();

const isTesting = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

const handleCancel = () => {
  emit("cancel");
};

const handleSave = async () => {
  try {
    const connectionData = {
      name: props.formState.form.name,
      type: props.formState.form.type,
      host: props.formState.form.host,
      port: props.formState.form.port
        ? parseInt(props.formState.form.port)
        : undefined,
      username: props.formState.form.username,
      password: props.formState.form.password,
      database: props.formState.form.database,
    };

    if (props.isEditing && props.connectionId) {
      await UpdateConnection(props.connectionId, connectionData);
    } else {
      await CreateConnection(connectionData as any);
    }

    emit("save");
  } catch (error) {
    console.error("Failed to save connection:", error);
    // TODO: Show error to user
  }
};

const handleDelete = async () => {
  if (!props.connectionId) return;
  try {
    await DeleteConnection(props.connectionId);
    emit("save");
  } catch (error) {
    console.error("Failed to delete connection:", error);
  }
};

const testConnection = async () => {
  isTesting.value = true;
  testResult.value = null;

  try {
    const connectionData = {
      name: props.formState.form.name,
      type: props.formState.form.type,
      host: props.formState.form.host,
      port: props.formState.form.port
        ? parseInt(props.formState.form.port)
        : undefined,
      username: props.formState.form.username,
      password: props.formState.form.password,
      database: props.formState.form.database,
    };

    await TestConnection(connectionData as any);
    testResult.value = { success: true, message: "Connection successful!" };
  } catch (error: any) {
    testResult.value = {
      success: false,
      message: `Connection failed: ${error.message || "Unknown error"}`,
    };
  } finally {
    isTesting.value = false;
  }
};
</script>
