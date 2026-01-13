<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Compact Header -->
    <div class="toolbar px-2 py-1">
      <div class="flex items-center gap-3 min-w-0">
        <!-- Icon and Title -->
        <div class="flex items-center gap-1.5 shrink-0">
          <component 
            v-if="icon" 
            :is="icon" 
            class="w-4 h-4" 
            :class="iconClass || 'text-foreground-secondary'" 
          />
          <h3 class="text-xs font-semibold text-foreground truncate max-w-[250px] select-none" :title="title">
            {{ title }}
          </h3>
        </div>

        <div v-if="tabs && tabs.length > 0" class="toolbar-divider shrink-0"></div>

        <!-- Tabs -->
        <nav v-if="tabs && tabs.length > 0" class="tab-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="$emit('update:activeTab', tab.id)"
            :class="[
              'tab-item',
              activeTab === tab.id ? 'tab-item-active' : ''
            ]"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Actions Slot -->
      <div class="toolbar-group shrink-0 ml-4">
        <slot name="actions" />
      </div>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-hidden relative bg-surface">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { type Component } from 'vue';

interface Tab {
  id: string;
  label: string;
}

defineProps<{
  title: string;
  icon?: Component;
  iconClass?: string;
  tabs?: Tab[];
  activeTab?: string;
}>();

defineEmits<{
  (e: 'update:activeTab', id: string): void;
}>();
</script>
