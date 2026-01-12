<template>
  <div class="sql-editor-container">
    <div v-if="showHeader" class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <h4 class="text-sm font-medium text-gray-700">SQL Definition</h4>
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
          class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-1"
          @click="copyToClipboard"
        >
          <Clipboard class="w-3 h-3" />
          Copy
        </button>
        <button
          v-if="showValidateButton"
          class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
          :disabled="validating"
          @click="validateSql"
        >
          <component :is="validating ? Loader : CheckCircle" class="w-3 h-3" :class="{ 'animate-spin': validating }" />
          Validate
        </button>
      </div>
    </div>
    
    <div class="border rounded-lg overflow-hidden monaco-container" :style="{ height: typeof height === 'number' ? `${height}px` : height }">
      <textarea
        v-model="sqlContent"
        class="w-full h-full p-3 font-mono text-sm bg-white border-0 resize-none focus:outline-none"
        :readonly="readonly"
        placeholder="Enter your SQL query here..."
        @input="handleInput"
      ></textarea>
    </div>
    
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
import { ref, watch, onUnmounted } from 'vue'
import { CheckCircle, X, Clipboard, Loader, AlertTriangle } from 'lucide-vue-next'
import type { ValidationResult } from '~/types/validation'

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

// Reactive state
const sqlContent = ref(props.modelValue)
const validationStatus = ref<ValidationResult | null>(null)
const validating = ref(false)



// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  if (newValue !== sqlContent.value) {
    sqlContent.value = newValue
  }
}, { immediate: true })

const validationTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

// Watch for content changes in the editor
watch(sqlContent, (newValue) => {
  if (!props.readonly) {
    emit('update:modelValue', newValue)
  }
  
  if (props.autoValidate && newValue.trim()) {
    // Debounce validation
    if (validationTimeout.value) {
      clearTimeout(validationTimeout.value)
    }
    validationTimeout.value = setTimeout(() => {
      validateSql()
    }, 1000)
  }
})

const handleInput = () => {
  // Handle input event for textarea
}

// SQL Validation
const validateSql = async () => {
  if (!sqlContent.value.trim()) {
    validationStatus.value = null
    return
  }

  validating.value = true
  
  try {
    // Call the SQL validation API
    const response = await fetch('/api/sql/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: sqlContent.value,
        connectionId: props.connectionId,
        database: props.database
      })
    }).then(r => r.json())

    validationStatus.value = response
    emit('validation', response)
    
    // Update editor markers
    updateEditorMarkers(response)
    
  } catch (error) {
    console.error('SQL validation failed:', error)
    validationStatus.value = {
      isValid: false,
      errors: [{ message: 'Validation service unavailable', severity: 'error' }]
    }
  } finally {
    validating.value = false
  }
}

// Update editor with validation markers
const updateEditorMarkers = (_: ValidationResult) => {
  // For textarea, we don't need to update markers
  // This could be enhanced with syntax highlighting in the future
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

// Cleanup
onUnmounted(() => {
  if (validationTimeout.value) {
    clearTimeout(validationTimeout.value)
  }
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
  background-color: rgb(249 250 251);
}

:deep(.monaco-editor .monaco-editor-background) {
  background-color: rgb(255 255 255);
}
</style> 