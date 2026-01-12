<template>
  <Dialog :is-open="isOpen" @cancel="handleCancel">
    <div class="p-6 overflow-y-auto">
      <ConnectionForm
        :title="title"
        :is-editing="isEditing"
        :is-loading="isLoading"
        :error="error"
        :form-state="formState"
        :save-button-text="saveButtonText"
        @save="handleSave"
        @cancel="handleCancel"
      />
      <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
        <button
          class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2"
          :disabled="isTesting"
          @click="testConnection"
        >
          <span v-if="isTesting" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
          <Zap v-else class="w-4 h-4" />
          {{ isTesting ? 'Testing...' : 'Test Connection' }}
        </button>
        <div class="flex gap-2">
          <button v-if="isEditing" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600" @click="handleDelete">Delete</button>
          <button class="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50" @click="handleCancel">Cancel</button>
          <button
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            :disabled="isLoading || isTesting"
            @click="handleSave"
          >
            {{ saveButtonText || 'Save' }}
          </button>
        </div>
      </div>
      <div v-if="testResult" class="mt-4 p-3 rounded" :class="testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
        {{ testResult.message }}
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Zap } from 'lucide-vue-next'
import { useConnectionForm } from '../composables/useConnectionForm'
import { UpdateConnection, CreateConnection, TestConnection, DeleteConnection } from 'wailsjs/go/main/App'
import ConnectionForm from './connection/ConnectionForm.vue'
import Dialog from './Dialog.vue'

const props = defineProps<{
  isOpen: boolean
  title: string
  isEditing?: boolean
  isLoading?: boolean
  error?: any
  formState: ReturnType<typeof useConnectionForm>
  saveButtonText?: string
  connectionId?: string
}>()

const emit = defineEmits<{
  (e: 'save'): void
  (e: 'cancel'): void
}>()

const isTesting = ref(false)
const testResult = ref<{success: boolean, message: string} | null>(null)

const handleCancel = () => {
  emit('cancel')
}

const handleSave = async () => {
  try {
    const connectionData = {
      name: props.formState.form.name,
      type: props.formState.form.type,
      host: props.formState.form.host,
      port: props.formState.form.port ? parseInt(props.formState.form.port) : undefined,
      username: props.formState.form.username,
      password: props.formState.form.password,
      database: props.formState.form.database,
    }

    if (props.isEditing && props.connectionId) {
      await UpdateConnection(props.connectionId, connectionData)
    } else {
      await CreateConnection(connectionData as any)
    }

    emit('save')
  } catch (error) {
    console.error('Failed to save connection:', error)
    // TODO: Show error to user
  }
}

const handleDelete = async () => {
  if (!props.connectionId) return
  try {
    await DeleteConnection(props.connectionId)
    emit('save')
  } catch (error) {
    console.error('Failed to delete connection:', error)
  }
}

const testConnection = async () => {
  isTesting.value = true
  testResult.value = null

  try {
    const connectionData = {
      name: props.formState.form.name,
      type: props.formState.form.type,
      host: props.formState.form.host,
      port: props.formState.form.port ? parseInt(props.formState.form.port) : undefined,
      username: props.formState.form.username,
      password: props.formState.form.password,
      database: props.formState.form.database,
    }

    await TestConnection(connectionData as any)
    testResult.value = { success: true, message: 'Connection successful!' }
  } catch (error: any) {
    testResult.value = { success: false, message: `Connection failed: ${error.message || 'Unknown error'}` }
  } finally {
    isTesting.value = false
  }
}
</script>