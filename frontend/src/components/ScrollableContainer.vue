<template>
  <div class="flex-1 relative h-full flex items-center overflow-hidden">
    <!-- Left Indicator -->
    <div
      v-if="canScrollLeft"
      class="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-surface via-surface/80 to-transparent z-10 pointer-events-none flex items-center pl-1"
    >
      <ChevronLeft class="w-3 h-3 text-foreground-secondary opacity-50" />
    </div>

    <OverlayScrollbarsComponent
      ref="osComponent"
      class="w-full h-full"
      @wheel="handleWheel"
      @os-scroll="updateScrollIndicators"
      @os-updated="updateScrollIndicators"
      :options="{
        scrollbars: { visibility: 'hidden' },
        overflow: { y: 'hidden' }
      }"
    >
      <slot />
    </OverlayScrollbarsComponent>

    <!-- Right Indicator -->
    <div
      v-if="canScrollRight"
      class="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-surface via-surface/80 to-transparent z-10 pointer-events-none flex items-center justify-end pr-1"
    >
      <ChevronRight class="w-3 h-3 text-foreground-secondary opacity-50" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { OverlayScrollbarsComponent } from "overlayscrollbars-vue";

const osComponent = ref();
const canScrollLeft = ref(false);
const canScrollRight = ref(false);

const updateScrollIndicators = () => {
  const osInstance = osComponent.value?.osInstance();
  if (osInstance) {
    const { scrollOffsetElement } = osInstance.elements();
    const { scrollLeft, scrollWidth, clientWidth } = scrollOffsetElement;
    canScrollLeft.value = scrollLeft > 1;
    canScrollRight.value = scrollLeft + clientWidth < scrollWidth - 5;
  }
};

onMounted(() => {
  setTimeout(updateScrollIndicators, 100);
});

const handleWheel = (e: WheelEvent) => {
  if (e.deltaY !== 0) {
    const osInstance = osComponent.value?.osInstance();
    if (osInstance) {
      const { viewport } = osInstance.elements();
      viewport.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }
};

const scrollIntoView = (selector: string) => {
  const osInstance = osComponent.value?.osInstance();
  if (osInstance) {
    const { viewport } = osInstance.elements();
    const element = viewport.querySelector(selector) as HTMLElement;
    if (element) {
      // Use native scrollIntoView which is more reliable across OverlayScrollbars versions
      // 'nearest' acts like 'ifneeded' - it only scrolls if the element is not already visible
      element.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }
};

defineExpose({
  update: updateScrollIndicators,
  scrollIntoView,
});
</script>
