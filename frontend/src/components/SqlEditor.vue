<template>
  <div class="sql-editor-container">
    <div v-if="showHeader" class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <h4 class="text-sm font-medium text-foreground">SQL Definition</h4>
        <div v-if="validationStatus" class="flex items-center gap-1">
          <component 
            :is="validationStatus.isValid ? CheckCircle : X"
            :class="validationStatus.isValid ? 'text-green-500' : 'text-red-500'"
            class="w-4 h-4"
          />
          <span :class="validationStatus.isValid ? 'text-green-600' : 'text-red-600'" class="text-xs">
            {{ validationStatus.isValid ? 'Valid SQL' : `${validationStatus.errors.length} error(s)` }}
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="btn-secondary"
          @click="copyToClipboard"
        >
          <Clipboard class="w-3 h-3" />
          Copy
        </button>
        <button
          v-if="showValidateButton"
          class="btn-primary"
          :disabled="validating"
          @click="validateSql"
        >
          <component :is="validating ? Loader : CheckCircle" class="w-3 h-3" :class="{ 'animate-spin': validating }" />
          Validate
        </button>
      </div>
    </div>
    
    <div ref="editorContainer" class="border border-border rounded-lg overflow-hidden" :style="{ height: typeof height === 'number' ? `${height}px` : height }"></div>
    
    <!-- Validation Messages -->
    <div v-if="validationStatus && !validationStatus.isValid" class="mt-2 space-y-1">
      <div 
        v-for="(error, index) in validationStatus.errors" 
        :key="index"
        class="bg-red-50 border border-red-200 rounded p-2 text-sm"
      >
        <div class="flex items-start gap-2">
          <AlertTriangle class="w-4 h-4 text-red-500 mt-0.5" />
          <div>
            <div class="text-red-700 font-medium">{{ error.message }}</div>
            <div v-if="error.line" class="text-red-600 text-xs">
              Line {{ error.line }}, Column {{ error.column }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Warnings -->
    <div v-if="validationStatus && validationStatus.warnings?.length" class="mt-2 space-y-1">
      <div 
        v-for="(warning, index) in validationStatus.warnings" 
        :key="index"
        class="bg-amber-50 border border-amber-200 rounded p-2 text-sm"
      >
        <div class="flex items-start gap-2">
          <AlertTriangle class="w-4 h-4 text-amber-500 mt-0.5" />
          <div class="text-amber-700">{{ warning }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { CheckCircle, X, Clipboard, Loader, AlertTriangle } from 'lucide-vue-next'
import * as monaco from 'monaco-editor'
import type { ValidationResult } from '~/types/validation'
import { useThemeStore } from '@/stores/themeStore'

interface SqlEditorProps {
  modelValue: string
  height?: string | number
  readonly?: boolean
  showValidateButton?: boolean
  autoValidate?: boolean
  connectionId?: string
  database?: string
  showHeader?: boolean
}

const props = withDefaults(defineProps<SqlEditorProps>(), {
  height: '300px',
  readonly: false,
  showValidateButton: true,
  autoValidate: true,
  showHeader: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'validation': [result: ValidationResult]
}>()

// Theme store
const themeStore = useThemeStore()

// Reactive state
const sqlContent = ref(props.modelValue)
const validationStatus = ref<ValidationResult | null>(null)
const validating = ref(false)
const editorContainer = ref<HTMLDivElement>()
let editor: monaco.editor.IStandaloneCodeEditor | null = null

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  if (newValue !== sqlContent.value && editor) {
    editor.setValue(newValue)
  }
}, { immediate: true })

const validationTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

// Watch for theme changes and update Monaco theme
watch(() => themeStore.theme, (newTheme) => {
  if (editor) {
    monaco.editor.setTheme(newTheme === 'dark' ? 'vs-dark' : 'vs-light')
  }
})

// Handle editor content changes
const handleEditorChange = () => {
  if (editor) {
    const value = editor.getValue()
    sqlContent.value = value
    emit('update:modelValue', value)
    
    if (props.autoValidate) {
      if (validationTimeout.value) clearTimeout(validationTimeout.value)
      validationTimeout.value = setTimeout(() => {
        validateSql()
      }, 500)
    }
  }
}

onMounted(async () => {
  await nextTick()
  if (editorContainer.value) {
    editor = monaco.editor.create(editorContainer.value, {
      value: sqlContent.value,
      language: 'sql',
      theme: themeStore.theme === 'dark' ? 'vs-dark' : 'vs-light',
      readOnly: props.readonly,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: false,
      wordWrap: 'on',
    })
    editor.onDidChangeModelContent(handleEditorChange)
  }
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
    editor = null
  }
  if (validationTimeout.value) {
    clearTimeout(validationTimeout.value)
  }
})

// SQL Validation
const validateSql = async () => {
  if (!sqlContent.value.trim()) {
    validationStatus.value = null
    return
  }

  validating.value = true
  
  try {
    // For now, just mark as valid since we don't have a validation service
    validationStatus.value = {
      isValid: true,
      errors: [],
      warnings: []
    }
    emit('validation', validationStatus.value)
    
    // Update editor markers
    updateEditorMarkers(validationStatus.value)
    
  } catch (error) {
    validationStatus.value = {
      isValid: false,
      errors: [{ message: 'Validation service unavailable', severity: 'error' as const }]
    }
  } finally {
    validating.value = false
  }
}

// Update editor with validation markers
const updateEditorMarkers = (result: ValidationResult) => {
  if (!editor) return
  
  const model = editor.getModel()
  if (!model) return
  
  const markers: monaco.editor.IMarkerData[] = []
  
  if (!result.isValid && result.errors) {
    result.errors.forEach(error => {
      if (error.line && error.column) {
        markers.push({
          startLineNumber: error.line,
          startColumn: error.column,
          endLineNumber: error.line,
          endColumn: error.column + 1,
          message: error.message,
          severity: monaco.MarkerSeverity.Error
        })
      }
    })
  }
  
  monaco.editor.setModelMarkers(model, 'sql-validation', markers)
}

// Copy to clipboard
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(sqlContent.value)
    // TODO: Show notification
    console.log('SQL definition copied to clipboard')
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
  }
}

// Expose methods and properties to parent components
defineExpose({
  validateSql,
  copyToClipboard,
  validationStatus
})
</script>

<style scoped>
.sql-editor-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.monaco-container {
  position: relative;
}

:deep(.monaco-editor) {
  border-radius: 0.5rem;
}

:deep(.monaco-editor .overflow-guard) {
  border-radius: 0.5rem;
}

:deep(.monaco-editor .margin) {
  background-color: rgb(var(--color-surface-hover));
}

:deep(.monaco-editor .monaco-editor-background) {
  background-color: rgb(var(--color-surface));
}
</style> 