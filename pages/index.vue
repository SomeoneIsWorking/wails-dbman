<template>
  <div>
    <div v-if="isLoading">
      <USkeleton class="h-8 w-full mb-4" v-for="i in 3" :key="i" />
    </div>
    <div v-else-if="connections?.length === 0" class="text-center py-8">
      <UIcon
        name="i-heroicons-database"
        class="h-12 w-12 mx-auto mb-4 text-gray-400"
      />
      <h3 class="text-lg font-semibold mb-2">No Database Connections</h3>
      <p class="text-gray-500 mb-4">
        Get started by adding your first database connection
      </p>
      <UButton
        to="/connections/new"
        label="Add Connection"
        icon="i-heroicons-plus-circle"
      />
    </div>
    <div v-else class="space-y-4">
      <DatabaseConnectionCard
        v-for="conn in connections"
        :key="conn.id"
        :connection="conn"
        @delete="fetch('/api/connections', { query: { invalidate: 'true' } })"
      />
    </div>

    <UButton
      class="fixed bottom-4 right-4"
      icon="i-heroicons-plus-circle"
      size="xl"
      color="primary"
      to="/connections/new"
      square
    />
  </div>
</template>

<script setup lang="ts">
interface Connection {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}

const {
  data: connections,
  error: connectionsError,
  isLoading,
  fetch,
} = useAsyncFetch<Connection[]>();

// Load connections on mount
await fetch("/api/connections");
</script>
