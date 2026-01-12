<template>
  <div class="space-y-2">
    <div class="grid grid-cols-[auto_1fr] gap-2 items-center">
      <label class="text-sm font-medium text-foreground text-right"
        >Connection String</label
      >
      <input
        v-model="connectionString"
        type="text"
        placeholder="e.g. postgresql://user:pass@localhost:5432/db or Server=localhost;Database=mydb;..."
        class="w-full px-2 py-1"
      />
    </div>

    <div v-if="connectionString" class="p-2 px-4 bg-surface-hover rounded">
      <div
        class="grid grid-cols-[auto_1fr] [&>label]:text-right gap-2 text-sm text-foreground"
      >
        <label>Host:</label>
        <span class="font-medium">{{ form.host || "-" }}</span>
        <label>Port:</label>
        <span class="font-medium">{{
          form.port || getDefaultPort(form.type)
        }}</span>
        <label>Username:</label>
        <span class="font-medium">{{ form.username || "-" }}</span>
        <label>Password:</label> <span class="font-medium">***</span>
        <div></div>
        <div class="text-sm">
          <span
            class="font-medium text-foreground"
            :class="isValid ? 'text-success' : 'text-error'"
          >
            {{
              isValid
                ? "✓ Valid connection string"
                : "✗ Invalid connection string"
            }}
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
