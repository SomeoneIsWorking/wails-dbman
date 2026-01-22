<template>
  <Teleport to="body">
    <div
      v-if="show"
      ref="menuRef"
      class="fixed z-[9999] bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[160px] text-sm animate-in fade-in zoom-in duration-75"
      :style="{
        left: `${x}px`,
        top: `${y}px`,
      }"
    >
      <slot></slot>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";

const props = defineProps<{
  show: boolean;
  x: number;
  y: number;
}>();

const emit = defineEmits(["close"]);
const menuRef = ref<HTMLElement | null>(null);

const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit("close");
  }
};

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    emit("close");
  }
};

onMounted(() => {
  document.addEventListener("mousedown", handleClickOutside);
  document.addEventListener("keydown", handleEscape);
});

onUnmounted(() => {
  document.removeEventListener("mousedown", handleClickOutside);
  document.removeEventListener("keydown", handleEscape);
});

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      // Adjust position if it goes off screen
      setTimeout(() => {
        if (menuRef.value) {
          const rect = menuRef.value.getBoundingClientRect();
          const screenWidth = window.innerWidth;
          if (rect.right > screenWidth) {
            menuRef.value.style.left = `${screenWidth - rect.width - 5}px`;
          }
          const screenHeight = window.innerHeight;
          if (rect.bottom > screenHeight) {
            menuRef.value.style.top = `${screenHeight - rect.height - 5}px`;
          }
        }
      }, 0);
    }
  },
);
</script>
