<template>
  <div :class="containerClass" ref="containerRef">
    <div ref="paneRef" :style="paneStyle" class="grid">
      <slot />
    </div>
    <div
      :class="resizerClass"
      @mousedown="onMouseDown"
      @touchstart.prevent="onTouchStart"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from "vue";

const props = defineProps({
  width: { type: Number, default: 320 },
  min: { type: Number, default: 200 },
  max: { type: Number, default: 600 },
  horizontal: { type: Boolean, default: false },
});

const emit = defineEmits<{
  "update:width": [value: number];
}>();

const localWidth = ref(props.width);
watch(() => props.width, (v) => (localWidth.value = v));
watch(localWidth, (v) => emit("update:width", v));

const containerRef = ref<HTMLElement | null>(null);
let isResizing = false;

const paneStyle = computed(() => ({
  width: props.horizontal ? `${localWidth.value}px` : undefined,
  height: props.horizontal ? undefined : `${localWidth.value}px`,
}));

function clamp(v: number, a: number, b: number) {
  return Math.min(Math.max(v, a), b);
}

const onMouseMove = (e: MouseEvent) => {
  if (!isResizing || !containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const newSize = props.horizontal
    ? clamp(e.clientX - rect.left, props.min, props.max)
    : clamp(e.clientY - rect.top, props.min, props.max);
  localWidth.value = newSize;
};

const onMouseUp = () => {
  isResizing = false;
  removeListeners();
};

const onMouseDown = (_: MouseEvent) => {
  isResizing = true;
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
};

const onTouchStart = (_: TouchEvent) => {
  isResizing = true;
  window.addEventListener("touchmove", onTouchMove, { passive: false } as any);
  window.addEventListener("touchend", onTouchEnd);
};

const onTouchMove = (e: TouchEvent) => {
  if (!isResizing || !containerRef.value) return;
  const t = e.touches[0];
  const rect = containerRef.value.getBoundingClientRect();
  const newSize = props.horizontal
    ? clamp(t.clientX - rect.left, props.min, props.max)
    : clamp(t.clientY - rect.top, props.min, props.max);
  localWidth.value = newSize;
};

const onTouchEnd = () => {
  isResizing = false;
  removeListeners();
};

function removeListeners() {
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
  window.removeEventListener("touchmove", onTouchMove as any);
  window.removeEventListener("touchend", onTouchEnd as any);
}

onBeforeUnmount(removeListeners);

const containerClass = computed(() =>
  props.horizontal ? "flex items-stretch" : "flex flex-col"
);

const resizerClass = computed(() =>
  props.horizontal
    ? "w-1 bg-border/50 cursor-col-resize hover:bg-primary/50 transition-colors"
    : "h-1 bg-border/50 cursor-row-resize hover:bg-primary/50 transition-colors"
);
</script>
