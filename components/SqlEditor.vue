<template>
  <div class="sql-editor-container">
    <div v-if="showHeader" class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <h4 class="text-sm font-medium text-gray-700">SQL Definition</h4>
        <div v-if="validationStatus" class="flex items-center gap-1">
          <UIcon 
            :name="validationStatus.isValid ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle'"
            :class="validationStatus.isValid ? 'text-green-500' : 'text-red-500'"
            class="h-4 w-4"
          />
          <span :class="validationStatus.isValid ? 'text-green-600' : 'text-red-600'" class="text-xs">
            {{ validationStatus.isValid ? 'Valid SQL' : `${validationStatus.errors.length} error(s)` }}
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          variant="ghost"
          size="xs"
          icon="i-heroicons-clipboard-document"
          @click="copyToClipboard"
        >
          Copy
        </UButton>
        <UButton
          v-if="showValidateButton"
          variant="ghost"
          size="xs"
          icon="i-heroicons-check-circle"
          :loading="validating"
          @click="validateSql"
        >
          Validate
        </UButton>
      </div>
    </div>
    
    <div class="border rounded-lg overflow-hidden monaco-container" :style="{ height: typeof height === 'number' ? `${height}px` : height }">
      <MonacoEditor
        v-model="sqlContent"
        lang="sql"
        theme="vs"
        :height="typeof height === 'number' ? `${height}px` : height"
        :width="'100%'"
        :options="editorOptions"
        @editorDidMount="onEditorMount"
      >
        <template #default>
          <div class="flex items-center justify-center h-full">
            <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-500" />
            <span class="ml-2 text-gray-500">Loading SQL Editor...</span>
          </div>
        </template>
      </MonacoEditor>
    </div>
    
    <!-- Validation Messages -->
    <div v-if="validationStatus && !validationStatus.isValid" class="mt-2 space-y-1">
      <div 
        v-for="(error, index) in validationStatus.errors" 
        :key="index"
        class="bg-red-50 border border-red-200 rounded p-2 text-sm"
      >
        <div class="flex items-start gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="h-4 w-4 text-red-500 mt-0.5" />
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
          <UIcon name="i-heroicons-exclamation-triangle" class="h-4 w-4 text-amber-500 mt-0.5" />
          <div class="text-amber-700">{{ warning }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, readonly, onUnmounted } from 'vue'
import type { editor as MonacoEditor } from 'monaco-editor'
import type { ValidationResult } from '~/types/validation'

// Extend window interface for Monaco
declare global {
  interface Window {
    monaco: any
  }
}

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
const editorInstance = ref<MonacoEditor.IStandaloneCodeEditor | null>(null)



// Editor configuration
const editorOptions = computed(() => ({
  automaticLayout: true,
  fontSize: 13,
  fontFamily: '"JetBrains Mono", "Fira Code", "Monaco", "Menlo", "Ubuntu Mono", monospace',
  lineNumbers: 'on' as const,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on' as const,
  readOnly: props.readonly,
  tabSize: 2,
  insertSpaces: true,
  folding: true,
  showFoldingControls: 'always' as const,
  bracketPairColorization: { enabled: true },
  formatOnPaste: true,
  formatOnType: true,
  renderLineHighlight: 'line' as const,
  renderWhitespace: 'selection' as const,
  quickSuggestions: {
    other: true,
    comments: false,
    strings: false
  }
}))

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  if (newValue !== sqlContent.value) {
    sqlContent.value = newValue
  }
}, { immediate: true })

const validationTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

// Editor lifecycle
const onEditorMount = (editor: MonacoEditor.IStandaloneCodeEditor) => {
  editorInstance.value = editor
  
  // Configure SQL language features
  setupSqlLanguageFeatures()
  
  // Set content if it exists
  if (sqlContent.value && editor.getModel()) {
    editor.getModel()?.setValue(sqlContent.value)
  }
  
  // Force layout to ensure proper height
  nextTick(() => {
    if (sqlContent.value.trim() && props.autoValidate) {
      validateSql()
    }
  })
}

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
  
  // Clear validation markers when content changes
  if (editorInstance.value && validationStatus.value && !validationStatus.value.isValid) {
    const model = editorInstance.value.getModel()
    if (model) {
      // Clear previous error markers
      window.monaco?.editor.setModelMarkers(model, 'sql-validation', [])
    }
  }
})

// SQL Language Features Setup
const setupSqlLanguageFeatures = () => {
  if (!window.monaco) return
  
  // Configure SQL language
  window.monaco.languages.setLanguageConfiguration('sql', {
    comments: {
      lineComment: '--',
      blockComment: ['/*', '*/']
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string'] },
      { open: "'", close: "'", notIn: ['string'] }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ]
  })

  // Enhanced SQL syntax highlighting
  window.monaco.languages.setMonarchTokensProvider('sql', {
    defaultToken: '',
    tokenPostfix: '.sql',
    ignoreCase: true,

    brackets: [
      { open: '[', close: ']', token: 'delimiter.square' },
      { open: '(', close: ')', token: 'delimiter.parenthesis' }
    ],

    keywords: [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS',
      'ON', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'LIKE', 'BETWEEN', 'IS', 'NULL',
      'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'MERGE', 'USING', 'WHEN', 'MATCHED',
      'CREATE', 'ALTER', 'DROP', 'TABLE', 'VIEW', 'INDEX', 'PROCEDURE', 'FUNCTION',
      'IF', 'ELSE', 'BEGIN', 'END', 'WHILE', 'FOR', 'DECLARE', 'SET', 'EXEC', 'EXECUTE',
      'RETURN', 'BREAK', 'CONTINUE', 'GOTO', 'TRY', 'CATCH', 'THROW', 'RAISERROR',
      'DISTINCT', 'ALL', 'TOP', 'ORDER', 'BY', 'GROUP', 'HAVING', 'UNION', 'INTERSECT', 'EXCEPT',
      'AS', 'ASC', 'DESC', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'WITH'
    ],

    operators: [
      '=', '!=', '<>', '<', '<=', '>', '>=', '+', '-', '*', '/', '%', '&', '|', '^', '~'
    ],

    builtinFunctions: [
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CAST', 'CONVERT', 'ISNULL', 'COALESCE',
      'SUBSTRING', 'LEFT', 'RIGHT', 'LEN', 'LTRIM', 'RTRIM', 'TRIM', 'UPPER', 'LOWER',
      'REPLACE', 'CHARINDEX', 'PATINDEX', 'CONCAT', 'FORMAT', 'GETDATE', 'SYSDATETIME',
      'DATEADD', 'DATEDIFF', 'YEAR', 'MONTH', 'DAY', 'ROW_NUMBER', 'RANK', 'DENSE_RANK'
    ],

    builtinVariables: [
      '@@IDENTITY', '@@ROWCOUNT', '@@ERROR', '@@TRANCOUNT', '@@VERSION', '@@SERVERNAME'
    ],

    typeKeywords: [
      'VARCHAR', 'NVARCHAR', 'CHAR', 'NCHAR', 'TEXT', 'NTEXT',
      'INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'BIT',
      'DECIMAL', 'NUMERIC', 'FLOAT', 'REAL', 'MONEY', 'SMALLMONEY',
      'DATE', 'TIME', 'DATETIME', 'DATETIME2', 'SMALLDATETIME', 'DATETIMEOFFSET',
      'UNIQUEIDENTIFIER', 'XML', 'VARBINARY', 'BINARY', 'IMAGE'
    ],

    tokenizer: {
      root: [
        { include: '@comments' },
        { include: '@whitespace' },
        { include: '@numbers' },
        { include: '@strings' },
        { include: '@scopes' },
        [/[;,.]/, 'delimiter'],
        [/[()]/, '@brackets'],
        [/[\[\]]/, 'delimiter.square'],
        [/@\w+/, 'variable'],
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@operators': 'operator',
            '@builtinVariables': 'predefined',
            '@builtinFunctions': 'predefined',
            '@typeKeywords': 'type',
            '@default': 'identifier'
          }
        }],
        [/[<>=!%&+\-*/|~^]/, 'operator']
      ],

      whitespace: [
        [/\s+/, 'white']
      ],

      comments: [
        [/--+.*/, 'comment'],
        [/\/\*/, { token: 'comment.quote', next: '@comment' }]
      ],

      comment: [
        [/[^*/]+/, 'comment'],
        [/\*\//, { token: 'comment.quote', next: '@pop' }],
        [/./, 'comment']
      ],

      numbers: [
        [/0[xX][0-9a-fA-F]*/, 'number'],
        [/[$][+-]*\d*(\.\d*)?/, 'number'],
        [/((\d+(\.\d*)?)|(\.\d+))([eE][\-+]?\d+)?/, 'number']
      ],

      strings: [
        [/N?'/, { token: 'string', next: '@string' }],
        [/N?"/, { token: 'string', next: '@stringDouble' }]
      ],

      string: [
        [/[^']+/, 'string'],
        [/''/, 'string'],
        [/'/, { token: 'string', next: '@pop' }]
      ],

      stringDouble: [
        [/[^"]+/, 'string'],
        [/""/, 'string'],
        [/"/, { token: 'string', next: '@pop' }]
      ],

      scopes: [
        [/BEGIN\s+(TRANSACTION|TRAN)/, 'keyword'],
        [/END\s+(TRANSACTION|TRAN)/, 'keyword']
      ]
    }
  })
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
    const response = await $fetch<ValidationResult>('/api/sql/validate', {
      method: 'POST',
      body: {
        sql: sqlContent.value,
        connectionId: props.connectionId,
        database: props.database
      }
    })

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
const updateEditorMarkers = (result: ValidationResult) => {
  if (!editorInstance.value || !window.monaco) return
  
  const model = editorInstance.value.getModel()
  if (!model) return

  const markers: MonacoEditor.IMarkerData[] = result.errors.map(error => ({
    severity: error.severity === 'error' 
      ? window.monaco.MarkerSeverity.Error 
      : window.monaco.MarkerSeverity.Warning,
    message: error.message,
    startLineNumber: error.line || 1,
    startColumn: error.column || 1,
    endLineNumber: error.line || 1,
    endColumn: (error.column || 1) + 10 // Approximate end column
  }))

  window.monaco.editor.setModelMarkers(model, 'sql-validation', markers)
}

// Copy to clipboard
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(sqlContent.value)
    const toast = useToast()
    toast.add({
      title: 'Copied!',
      description: 'SQL definition copied to clipboard',
      icon: 'i-heroicons-clipboard-document-check'
    })
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