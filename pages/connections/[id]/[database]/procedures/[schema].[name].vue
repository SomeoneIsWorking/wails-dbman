<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <NuxtLink
          :to="`/connections/${connectionId}/${database}`"
          class="inline-flex items-center gap-2 text-gray-500 hover-contrast"
        >
          <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
          Back
        </NuxtLink>
        <h3 class="text-lg font-medium">
          {{ `${database}.${schema}.${name}` }}
        </h3>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          v-if="procedure && (procedure.parameters?.length || procedure.resultSets?.length)"
          variant="soft"
          icon="i-heroicons-clipboard-document"
          @click="copyProcedureDataAsJson"
        >
          Copy JSON
        </UButton>
        <UButton
          variant="soft"
          icon="i-heroicons-arrow-path"
          :loading="pending"
          @click="refresh()"
        >
          Refresh
        </UButton>
      </div>
    </div>

    <div v-if="pending || !procedure" class="flex justify-center p-4">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin h-6 w-6" />
    </div>

    <div v-else-if="error" class="flex flex-col items-center justify-center p-4 space-y-4">
      <div class="text-red-500">{{ error }}</div>
      <UButton
        variant="soft"
        icon="i-heroicons-arrow-path"
        @click="refresh()"
      >
        Retry
      </UButton>
    </div>

    <div v-else-if="procedure.state === 'loading'" class="flex flex-col items-center justify-center p-4 space-y-4">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin h-6 w-6 text-primary" />
      <div class="text-gray-500">Loading procedure details...</div>
    </div>

    <div v-else-if="procedure.state === 'uncached'" class="flex flex-col items-center justify-center p-4 space-y-4">
      <div class="text-gray-500">Procedure not cached yet</div>
      <UButton
        variant="soft"
        icon="i-heroicons-arrow-path"
        @click="refresh()"
      >
        Load Data
      </UButton>
    </div>

    <div v-else-if="procedure.state === 'failed'" class="flex flex-col items-center justify-center p-4 space-y-4">
      <div class="text-red-500">{{ procedure.error || 'Failed to load procedure data' }}</div>
      <UButton
        variant="soft"
        icon="i-heroicons-arrow-path"
        @click="refresh()"
      >
        Retry
      </UButton>
    </div>

    <div v-else class="space-y-4">
      <!-- Status Alert for Partial Data -->
      <div v-if="procedure.state === 'partial'" class="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-amber-500 mt-0.5" />
          <div>
            <h4 class="text-sm font-medium text-amber-800">Partial Data Available</h4>
            <p class="text-sm text-amber-700 mt-1">
              {{ procedure.error || 'Some procedure details could not be loaded due to access restrictions.' }}
            </p>
            <div v-if="procedure.lastCached" class="text-xs text-amber-600 mt-1">
              Last cached: {{ new Date(procedure.lastCached).toLocaleString() }}
            </div>
          </div>
        </div>
      </div>

      <!-- Cache Status -->
      <div v-else-if="procedure.lastCached" class="bg-green-50 border border-green-200 rounded-lg p-3">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="h-4 w-4 text-green-500" />
          <span class="text-sm text-green-700">
            Cached {{ new Date(procedure.lastCached).toLocaleString() }}
          </span>
        </div>
      </div>

      <!-- Parameters Section -->
      <div class="border rounded-lg overflow-hidden">
        <div class="bg-subtle px-4 py-2 text-sm font-medium text-primary flex items-center justify-between">
          <span>Parameters</span>
          <div v-if="procedure.parametersReadError" class="flex items-center gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="h-4 w-4 text-amber-500" />
            <span class="text-xs text-amber-600">Read Error</span>
          </div>
        </div>
        <div class="p-4">
          <div v-if="procedure.parametersReadError" class="bg-red-50 border border-red-200 rounded p-3 mb-3">
            <div class="text-sm text-red-700">{{ procedure.parametersReadError }}</div>
          </div>
          <div v-if="procedure.parameters && procedure.parameters.length" class="space-y-1">
            <div v-for="param in procedure.parameters" :key="param.name" class="text-sm">
              <UIcon name="i-heroicons-arrow-right" class="inline-block mr-2" />
              <span class="font-medium">{{ param.name }}</span>
              <span class="text-gray-500">
                - {{ param.type }} ({{ param.mode }})</span
              >
              <span v-if="param.defaultValue" class="text-gray-500">
                = {{ param.defaultValue }}</span
              >
            </div>
          </div>
          <div v-else class="text-sm text-gray-500">No parameters</div>
        </div>
      </div>

      <!-- Definition Section -->
      <div class="border rounded-lg overflow-hidden">
        <div class="bg-subtle px-4 py-2 text-sm font-medium text-primary flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span>Definition</span>
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
            <div v-if="procedure.definitionReadError" class="flex items-center gap-2">
              <UIcon name="i-heroicons-exclamation-triangle" class="h-4 w-4 text-amber-500" />
              <span class="text-xs text-amber-600">Read Error</span>
            </div>
            <UButton
              v-if="procedure.definition"
              variant="ghost"
              size="xs"
              icon="i-heroicons-clipboard-document"
              @click="copyDefinition"
            >
              Copy
            </UButton>
            <UButton
              v-if="procedure.definition"
              variant="ghost"
              size="xs"
              icon="i-heroicons-check-circle"
              :loading="validating"
              @click="validateDefinition"
            >
              Validate
            </UButton>
          </div>
        </div>
        <div class="p-4">
          <div v-if="procedure.definitionReadError" class="bg-red-50 border border-red-200 rounded p-3 mb-3">
            <div class="text-sm text-red-700">{{ procedure.definitionReadError }}</div>
          </div>
          <SqlEditor
            v-if="procedure.definition"
            ref="sqlEditor"
            :model-value="procedure.definition"
            :height="400"
            :readonly="true"
            :connection-id="connectionId"
            :database="database"
            :auto-validate="true"
            :show-validate-button="false"
            :show-header="false"
          />
          <div v-else class="text-sm text-gray-500">
            Definition not available
          </div>
        </div>
      </div>

      <!-- Result Sets Section -->
      <div>
        <div class="border rounded-lg overflow-hidden">
          <div class="bg-subtle px-4 py-2 text-sm font-medium text-primary flex items-center justify-between">
            <span>Result Sets</span>
            <div class="flex items-center gap-2">
              <div v-if="procedure.resultSetsReadError" class="flex items-center gap-2">
                <UIcon name="i-heroicons-exclamation-triangle" class="h-4 w-4 text-amber-500" />
                <span class="text-xs text-amber-600">Read Error</span>
              </div>
              <UButton
                v-if="procedure.definition"
                variant="ghost"
                size="xs"
                icon="i-heroicons-arrow-path"
                :loading="reanalyzing"
                @click="reanalyzeResultSets"
              >
                Reanalyze
              </UButton>
            </div>
          </div>
          <div class="p-4">
            <div v-if="procedure.resultSetsReadError" class="bg-red-50 border border-red-200 rounded p-3 mb-3">
              <div class="text-sm text-red-700">{{ procedure.resultSetsReadError }}</div>
            </div>
            <div v-if="procedure.resultSets && procedure.resultSets.length > 0" class="space-y-4">
              <div
                v-for="(resultSet, index) in procedure.resultSets"
                :key="index"
                class="border rounded overflow-hidden"
              >
                <div class="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700">
                  Result Set {{ index + 1 }}
                </div>
                <div class="p-3">
                  <div v-if="resultSet.columns && resultSet.columns.length" class="space-y-1">
                    <div
                      v-for="col in resultSet.columns"
                      :key="col.name"
                      class="text-sm"
                    >
                      <UIcon name="i-heroicons-arrow-right" class="inline-block mr-2" />
                      <span class="font-medium">{{ col.name }}</span>
                      <span class="text-gray-500"> - {{ col.type }}</span>
                      <span v-if="col.nullable" class="text-gray-500"> (nullable)</span>
                    </div>
                  </div>
                  <div v-else class="text-sm text-gray-500">
                    No columns in this result set
                  </div>
                </div>
              </div>
            </div>
            <div v-else-if="!procedure.resultSetsReadError" class="text-sm text-gray-500">
              No result sets
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProcedureResponse } from '~/types/procedure'
import type { ValidationResult } from '~/types/validation'
import { ref, onMounted, onUnmounted } from 'vue'
import { useAsyncFetch } from '~/composables/useAsyncFetch'
import SqlEditor from '~/components/SqlEditor.vue'

const route = useRoute()
const connectionId = route.params.id as string
const database = route.params.database as string
const schema = route.params.schema as string
const name = route.params.name as string

// Split the procedure name into database.schema.name
if (!database || !schema || !name) {
  throw createError({
    statusCode: 400,
    message: 'Invalid procedure name format. Expected: database.schema.name'
  })
}

const { data: procedure, error, isLoading: pending, fetch: fetchProcedure } = useAsyncFetch<ProcedureResponse>()

let pollInterval: NodeJS.Timeout | null = null
const reanalyzing = ref(false)
const validating = ref(false)
const validationStatus = ref<ValidationResult | null>(null)
const sqlEditor = ref<InstanceType<typeof SqlEditor> | null>(null)

const startPolling = () => {
  if (pollInterval) return
  
  pollInterval = setInterval(async () => {
    try {
      await fetchProcedure(`/api/connections/${connectionId}/${database}/procedures/${schema}.${name}`)
      
      // Stop polling if procedure is loaded, failed, or partial
      if (procedure.value && ['loaded', 'failed', 'partial'].includes(procedure.value.state)) {
        stopPolling()
      }
    } catch (error) {
      console.error('Polling error:', error)
    }
  }, 2000) // Poll every 2 seconds
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// Only fetch on client-side
onMounted(async () => {
  await fetchProcedure(`/api/connections/${connectionId}/${database}/procedures/${schema}.${name}`)
  
  // Start polling if procedure is loading
  if (procedure.value?.state === 'loading') {
    startPolling()
  }
})

onUnmounted(() => {
  stopPolling()
})

const refresh = async () => {
  stopPolling()
  await fetchProcedure(`/api/connections/${connectionId}/${database}/procedures/${schema}.${name}`, {
    query: { invalidate: 'true' }
  })
}

const copyProcedureDataAsJson = async () => {
  if (!procedure.value) return
  
  try {
    const data = {
      parameters: procedure.value.parameters || [],
      resultSets: procedure.value.resultSets || []
    }
    const json = JSON.stringify(data, null, 2)
    await navigator.clipboard.writeText(json)
    // Show toast notification
    const toast = useToast()
    toast.add({
      title: 'Copied!',
      description: 'Procedure data copied to clipboard as JSON',
      icon: 'i-heroicons-clipboard-document-check'
    })
  } catch (error) {
    console.error('Failed to copy procedure data:', error)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: 'Failed to copy procedure data to clipboard',
      color: 'error'
    })
  }
}



const reanalyzeResultSets = async () => {
  if (!procedure.value?.definition) return
  
  reanalyzing.value = true
  const toast = useToast()
  
  try {
    const response = await $fetch(`/api/connections/${connectionId}/${database}/procedures/${schema}.${name}/reanalyze`, {
      method: 'POST'
    })
    
    // Refresh the procedure data to get the updated result sets
    await fetchProcedure(`/api/connections/${connectionId}/${database}/procedures/${schema}.${name}`)
    
    toast.add({
      title: 'Success!',
      description: `Result sets reanalyzed successfully. Found ${response.resultSets.length} result sets.`,
      icon: 'i-heroicons-check-circle'
    })
    
    if (response.warnings && response.warnings.length > 0) {
      toast.add({
        title: 'Analysis Warnings',
        description: response.warnings.join(', '),
        color: 'warning'
      })
    }
  } catch (error: any) {
    console.error('Failed to reanalyze result sets:', error)
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to reanalyze result sets',
      color: 'error'
    })
  } finally {
    reanalyzing.value = false
  }
}

const copyDefinition = async () => {
  if (!procedure.value?.definition) return
  
  try {
    await navigator.clipboard.writeText(procedure.value.definition)
    const toast = useToast()
    toast.add({
      title: 'Copied!',
      description: 'SQL definition copied to clipboard',
      icon: 'i-heroicons-clipboard-document-check'
    })
  } catch (error) {
    console.error('Failed to copy definition:', error)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: 'Failed to copy definition to clipboard',
      color: 'error'
    })
  }
}

const validateDefinition = async () => {
  if (sqlEditor.value) {
    await sqlEditor.value.validateSql()
    validationStatus.value = sqlEditor.value.validationStatus
  }
}
</script>