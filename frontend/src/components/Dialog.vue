<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        @click.self="$emit('cancel')"
      >
        <div
          class="bg-surface rounded-md shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-border text-foreground flex flex-col animate-in fade-in zoom-in-95 duration-200"
        >
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  isOpen: boolean;
}>();

defineEmits<{
  (e: "cancel"): void;
}>();
</script>
