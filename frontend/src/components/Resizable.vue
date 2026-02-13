<template>
  <div :class="containerClass" ref="containerRef">
    <div
      v-if="isReverse"
      :class="resizerClass"
      @mousedown="onMouseDown"
      @touchstart.prevent="onTouchStart"
    ></div>
    <div ref="paneRef" :style="paneStyle" class="grid overflow-hidden">
      <slot />
    </div>
    <div
      v-if="!isReverse"
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
  position: { 
    type: String, 
    default: "bottom",
    validator: (v: string) => ["left", "right", "top", "bottom"].includes(v)
  },
});

const emit = defineEmits<{
  "update:width": [value: number];
}>();

const localWidth = ref(props.width);
watch(() => props.width, (v) => (localWidth.value = v));
watch(localWidth, (v) => emit("update:width", v));

const containerRef = ref<HTMLElement | null>(null);
let isResizing = false;

const isHorizontal = computed(() => props.position === "left" || props.position === "right");
const isReverse = computed(() => props.position === "left" || props.position === "top");

const paneStyle = computed(() => ({
  width: isHorizontal.value ? `${localWidth.value}px` : undefined,
  height: isHorizontal.value ? undefined : `${localWidth.value}px`,
}));

function clamp(v: number, a: number, b: number) {
  return Math.min(Math.max(v, a), b);
}

const onMouseMove = (e: MouseEvent) => {
  if (!isResizing || !containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  
  let newSize: number;
  if (isHorizontal.value) {
    newSize = props.position === "left" 
      ? rect.right - e.clientX 
      : e.clientX - rect.left;
  } else {
    newSize = props.position === "top" 
      ? rect.bottom - e.clientY 
      : e.clientY - rect.top;
  }
  
  localWidth.value = clamp(newSize, props.min, props.max);
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
  
  let newSize: number;
  if (isHorizontal.value) {
    newSize = props.position === "left" 
      ? rect.right - t.clientX 
      : t.clientX - rect.left;
  } else {
    newSize = props.position === "top" 
      ? rect.bottom - t.clientY 
      : t.clientY - rect.top;
  }
  
  localWidth.value = clamp(newSize, props.min, props.max);
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
  isHorizontal.value ? "flex items-stretch" : "flex flex-col"
);

const resizerClass = computed(() =>
  isHorizontal.value
    ? "w-1 bg-border/50 cursor-col-resize hover:bg-primary/50 transition-colors"
    : "h-1 bg-border/50 cursor-row-resize hover:bg-primary/50 transition-colors"
);
</script>
