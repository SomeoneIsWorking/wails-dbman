<template>
  <div class="h-full flex flex-col overflow-hidden bg-surface">
    <div class="flex-1 relative group overflow-hidden">
      <div ref="editorContainer" class="h-full"></div>
      <!-- Overlay Actions -->
      <div
        class="absolute top-2 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-surface border border-border rounded shadow-sm z-10 px-1 py-0.5"
      >
        <slot name="actions" />
        <button class="btn-ghost !p-1" title="Copy" @click="copyToClipboard">
          <Clipboard class="w-3.5 h-3.5" />
        </button>
        <button
          v-if="showValidateButton"
          class="btn-ghost !p-1"
          :class="{ 'text-primary': validating }"
          title="Validate"
          :disabled="validating"
          @click="validateSql"
        >
          <component
            :is="validating ? Loader : CheckCircle"
            class="w-3.5 h-3.5"
            :class="{ 'animate-spin': validating }"
          />
        </button>
      </div>

      <!-- Quick Status -->
      <div
        v-if="validationStatus && !validating"
        class="absolute top-2 right-4 group-hover:hidden z-0"
      >
        <component
          :is="validationStatus.isValid ? CheckCircle : AlertTriangle"
          :class="
            validationStatus.isValid ? 'text-green-500/30' : 'text-error/30'
          "
          class="w-3.5 h-3.5"
        />
      </div>
    </div>

    <!-- Compact Validation Messages -->
    <div
      v-if="validationStatus && !validationStatus.isValid"
      class="bg-red-500/5 border-t border-red-500/20 px-3 py-1.5 animate-in slide-in-from-bottom-1"
    >
      <div
        v-for="(error, index) in validationStatus.errors"
        :key="index"
        class="flex items-start gap-2 text-sm"
      >
        <AlertTriangle class="w-3.5 h-3.5 text-red-500 mt-0.5" />
        <div class="flex-1 min-w-0">
          <span class="text-red-600 dark:text-red-400 font-bold uppercase mr-2"
            >Error:</span
          >
          <span class="text-foreground font-medium">{{ error.message }}</span>
          <span
            v-if="error.line"
            class="text-foreground-secondary ml-2 opacity-70"
          >
            [L{{ error.line }}:C{{ error.column }}]
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import { CheckCircle, Clipboard, Loader, AlertTriangle } from "lucide-vue-next";
import * as monaco from "monaco-editor";
import type { ValidationResult } from "~/types/validation";
import { useThemeStore } from "@/stores/themeStore";

interface SqlEditorProps {
  modelValue: string;
  height?: string | number;
  readonly?: boolean;
  showValidateButton?: boolean;
  autoValidate?: boolean;
  connectionId?: string;
  database?: string;
  showHeader?: boolean;
  revealLine?: number;
}

const props = withDefaults(defineProps<SqlEditorProps>(), {
  height: "300px",
  readonly: false,
  showValidateButton: true,
  autoValidate: true,
  showHeader: true,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  validation: [result: ValidationResult];
}>();

// Theme store
const themeStore = useThemeStore();

// Reactive state
const sqlContent = ref(props.modelValue);
const validationStatus = ref<ValidationResult | null>(null);
const validating = ref(false);
const editorContainer = ref<HTMLDivElement>();
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

// Watch for prop changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== sqlContent.value && editor) {
      editor.setValue(newValue);
    }
  },
  { immediate: true }
);

const validationTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

// Watch for theme changes and update Monaco theme
watch(
  () => themeStore.theme,
  (newTheme) => {
    if (editor) {
      monaco.editor.setTheme(newTheme === "dark" ? "vs-dark" : "vs-light");
    }
  }
);

watch(
  () => props.revealLine,
  (newLine) => {
    if (newLine && editor) {
      scrollToLine(newLine);
    }
  }
);

// Handle editor content changes
const handleEditorChange = () => {
  if (editor) {
    const value = editor.getValue();
    sqlContent.value = value;
    emit("update:modelValue", value);

    if (props.autoValidate) {
      if (validationTimeout.value) clearTimeout(validationTimeout.value);
      validationTimeout.value = setTimeout(() => {
        validateSql();
      }, 500);
    }
  }
};

onMounted(async () => {
  await nextTick();
  if (editorContainer.value) {
    editor = monaco.editor.create(editorContainer.value, {
      value: sqlContent.value,
      language: "sql",
      theme: themeStore.theme === "dark" ? "vs-dark" : "vs-light",
      readOnly: props.readonly,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      fontSize: 14,
      lineNumbers: "on",
      roundedSelection: false,
      wordWrap: "on",
    });
    editor.onDidChangeModelContent(handleEditorChange);

    if (props.revealLine) {
      scrollToLine(props.revealLine);
    }
  }
});

onUnmounted(() => {
  if (editor) {
    editor.dispose();
    editor = null;
  }
  if (validationTimeout.value) {
    clearTimeout(validationTimeout.value);
  }
});

// Scroll to specific line
const scrollToLine = (line: number) => {
  if (!editor) return;
  editor.revealLineInCenterIfOutsideViewport(line);
  editor.setPosition({ lineNumber: line, column: 1 });
  editor.focus();
};

// SQL Validation
const validateSql = async () => {
  if (!sqlContent.value.trim()) {
    validationStatus.value = null;
    return;
  }

  validating.value = true;

  try {
    // For now, just mark as valid since we don't have a validation service
    validationStatus.value = {
      isValid: true,
      errors: [],
      warnings: [],
    };
    emit("validation", validationStatus.value);

    // Update editor markers
    updateEditorMarkers(validationStatus.value);
  } catch (error) {
    validationStatus.value = {
      isValid: false,
      errors: [
        {
          message: "Validation service unavailable",
          severity: "error" as const,
        },
      ],
    };
  } finally {
    validating.value = false;
  }
};

// Update editor with validation markers
const updateEditorMarkers = (result: ValidationResult) => {
  if (!editor) return;

  const model = editor.getModel();
  if (!model) return;

  const markers: monaco.editor.IMarkerData[] = [];

  if (!result.isValid && result.errors) {
    result.errors.forEach((error) => {
      if (error.line && error.column) {
        markers.push({
          startLineNumber: error.line,
          startColumn: error.column,
          endLineNumber: error.line,
          endColumn: error.column + 1,
          message: error.message,
          severity: monaco.MarkerSeverity.Error,
        });
      }
    });
  }

  monaco.editor.setModelMarkers(model, "sql-validation", markers);
};

// Copy to clipboard
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(sqlContent.value);
    // TODO: Show notification
    console.log("SQL definition copied to clipboard");
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
  }
};

// Expose methods and properties to parent components
defineExpose({
  validateSql,
  copyToClipboard,
  scrollToLine,
  validationStatus,
});
</script>

<style scoped>
.sql-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.monaco-container {
  position: relative;
}

:deep(.monaco-editor) {
  padding-top: 8px;
}

:deep(.monaco-editor .margin) {
  background-color: transparent !important;
}

:deep(.monaco-editor .monaco-editor-background) {
  background-color: transparent !important;
}
</style>
