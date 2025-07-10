<template>
  <UApp>
    <UContainer class="min-h-screen p-4">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h1 class="text-xl font-bold">Multi-Database Management System</h1>
            <div class="flex items-center gap-4">
              <UButton
                variant="ghost"
                icon="i-heroicons-magnifying-glass"
                @click="commandPalette.open()"
              >
                <span class="hidden md:inline">Search</span>
                <span class="md:hidden">⌘K</span>
              </UButton>
              <UButton
                variant="ghost"
                icon="i-heroicons-document-magnifying-glass"
                @click="procedureTextSearch.open()"
              >
                <span class="hidden md:inline">Procedure Search</span>
                <span class="md:hidden">⌘F</span>
              </UButton>
              <UButton
                icon="i-heroicons-plus-circle"
                label="New Connection"
                to="/connections/new"
              />
            </div>
          </div>
        </template>
        <NuxtPage />
      </UCard>
      <CommandPalette ref="commandPalette" />
      <ProcedureTextSearchModal ref="procedureTextSearch" />
    </UContainer>
  </UApp>
</template>

<script setup lang="ts">
const commandPalette = ref()
const procedureTextSearch = ref()

// Expose methods globally
defineExpose({
  openCommandPalette: () => commandPalette.value?.open(),
  openProcedureTextSearch: () => procedureTextSearch.value?.open()
})
</script>
