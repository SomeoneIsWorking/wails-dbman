<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-1.5">
      <label class="text-sm font-bold uppercase tracking-wider text-foreground-secondary ml-1">Universal Connector</label>
      <textarea
        v-model="connectionString"
        rows="3"
        placeholder="postgresql://user:password@localhost:5432/dbname"
        class="w-full resize-none font-mono text-sm leading-relaxed"
      ></textarea>
    </div>

    <div v-if="connectionString" class="p-3 bg-surface-hover/30 rounded border border-border/50 animate-in fade-in duration-200">
      <div class="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1 text-sm">
        <span class="text-foreground-secondary uppercase font-bold text-sm tracking-tight">Host</span>
        <span class="font-medium truncate">{{ form.host || "-" }}</span>
        
        <span class="text-foreground-secondary uppercase font-bold text-sm tracking-tight">Port</span>
        <span class="font-medium">{{ form.port || getDefaultPort(form.type) }}</span>
        
        <span class="text-foreground-secondary uppercase font-bold text-sm tracking-tight">Auth</span>
        <span class="font-medium truncate">{{ form.username || "-" }} : <span class="opacity-50">********</span></span>
        
        <div class="col-span-2 pt-2 border-t border-border/30 mt-1 flex items-center gap-1.5">
          <div :class="isValid ? 'bg-green-500' : 'bg-red-500'" class="w-1.5 h-1.5 rounded-full"></div>
          <span class="font-bold uppercase tracking-widest text-[9px]" :class="isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
            {{ isValid ? "Parser Success" : "Parser Failed" }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { getDefaultPort } from "../../utils/database";
import { useConnectionForm } from "../../composables/useConnectionForm";

const props = defineProps<{
  modelValue: ReturnType<typeof useConnectionForm>;
  isEditing?: boolean;
}>();

const connectionString = ref("");
const isValid = ref(false);

const { form } = props.modelValue;

// Generate connection string from form data
const generateConnectionString = () => {
  const { type, host, port, username, password, database } = form;
  if (!type || !host) return "";

  switch (type) {
    case "postgresql":
      return `postgresql://${username || ""}${password ? `:${password}` : ""}${
        username || password ? "@" : ""
      }${host}${port ? `:${port}` : ""}/${database || ""}`;
    case "mysql":
      return `mysql://${username || ""}${password ? `:${password}` : ""}${
        username || password ? "@" : ""
      }${host}${port ? `:${port}` : ""}/${database || ""}`;
    case "mssql":
      return `Server=${host}${port ? `,${port}` : ""};Database=${
        database || ""
      };User Id=${username || ""};Password=${password || ""};`;
    default:
      return "";
  }
};

onMounted(() => {
  if (props.isEditing) {
    connectionString.value = generateConnectionString();
    isValid.value = true;
  }
});

watch(connectionString, (newStr) => {
  if (!newStr) {
    isValid.value = false;
    return;
  }

  isValid.value = props.modelValue.parseConnectionString(newStr);
});
</script>
