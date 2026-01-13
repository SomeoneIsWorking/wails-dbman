<template>
  <div class="scroll-view" ref="scrollViewRef">
    <div class="scroll-content" :class="containerClass" ref="contentRef">
      <div>
          <slot></slot>
      </div>
    </div>
    <!-- Vertical scrollbar -->
    <div
      v-if="showVerticalScrollbar"
      class="custom-scrollbar vertical"
      @mousedown="startVerticalDrag"
    >
      <div class="scrollbar-thumb" :style="{ height: verticalThumbHeight + 'px', top: verticalThumbTop + 'px' }"></div>
    </div>
    <!-- Horizontal scrollbar -->
    <div
      v-if="showHorizontalScrollbar"
      class="custom-scrollbar horizontal"
      @mousedown="startHorizontalDrag"
    >
      <div class="scrollbar-thumb" :style="{ width: horizontalThumbWidth + 'px', left: horizontalThumbLeft + 'px' }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

interface Props {
  containerClass?: string;
}

defineProps<Props>()

const scrollViewRef = ref<HTMLElement>()
const contentRef = ref<HTMLElement>()
const resizeObserver = ref<ResizeObserver>()

const isVerticalDragging = ref(false)
const isHorizontalDragging = ref(false)
const dragStartY = ref(0)
const dragStartX = ref(0)
const scrollStartTop = ref(0)
const scrollStartLeft = ref(0)

const showVerticalScrollbar = ref(false)
const showHorizontalScrollbar = ref(false)
const verticalThumbHeight = ref(0)
const verticalThumbTop = ref(0)
const horizontalThumbWidth = ref(0)
const horizontalThumbLeft = ref(0)

const updateScrollbars = () => {
  if (!scrollViewRef.value || !contentRef.value) return

  const containerWidth = scrollViewRef.value.clientWidth
  const containerHeight = scrollViewRef.value.clientHeight
  const contentWidth = contentRef.value.scrollWidth
  const contentHeight = contentRef.value.scrollHeight

  // Vertical
  if (contentHeight > containerHeight) {
    showVerticalScrollbar.value = true
    const scrollRatio = containerHeight / contentHeight
    verticalThumbHeight.value = Math.max(scrollRatio * containerHeight, 20)
    const scrollTop = contentRef.value.scrollTop
    const maxScrollTop = contentHeight - containerHeight
    verticalThumbTop.value = (scrollTop / maxScrollTop) * (containerHeight - verticalThumbHeight.value)
  } else {
    showVerticalScrollbar.value = false
  }

  // Horizontal
  if (contentWidth > containerWidth) {
    showHorizontalScrollbar.value = true
    const scrollRatio = containerWidth / contentWidth
    horizontalThumbWidth.value = Math.max(scrollRatio * containerWidth, 20)
    const scrollLeft = contentRef.value.scrollLeft
    const maxScrollLeft = contentWidth - containerWidth
    horizontalThumbLeft.value = (scrollLeft / maxScrollLeft) * (containerWidth - horizontalThumbWidth.value)
  } else {
    showHorizontalScrollbar.value = false
  }
}

const handleScroll = () => {
  updateScrollbars()
}

const startVerticalDrag = (e: MouseEvent) => {
  isVerticalDragging.value = true
  dragStartY.value = e.clientY
  scrollStartTop.value = contentRef.value?.scrollTop || 0
  document.addEventListener('mousemove', onVerticalDrag)
  document.addEventListener('mouseup', stopVerticalDrag)
}

const onVerticalDrag = (e: MouseEvent) => {
  if (!isVerticalDragging.value || !scrollViewRef.value || !contentRef.value) return

  const deltaY = e.clientY - dragStartY.value
  const containerHeight = scrollViewRef.value.clientHeight
  const contentHeight = contentRef.value.scrollHeight
  const maxScrollTop = contentHeight - containerHeight
  const scrollbarHeight = containerHeight - verticalThumbHeight.value
  const scrollDelta = (deltaY / scrollbarHeight) * maxScrollTop

  contentRef.value.scrollTop = Math.max(0, Math.min(maxScrollTop, scrollStartTop.value + scrollDelta))
}

const stopVerticalDrag = () => {
  isVerticalDragging.value = false
  document.removeEventListener('mousemove', onVerticalDrag)
  document.removeEventListener('mouseup', stopVerticalDrag)
}

const startHorizontalDrag = (e: MouseEvent) => {
  isHorizontalDragging.value = true
  dragStartX.value = e.clientX
  scrollStartLeft.value = contentRef.value?.scrollLeft || 0
  document.addEventListener('mousemove', onHorizontalDrag)
  document.addEventListener('mouseup', stopHorizontalDrag)
}

const onHorizontalDrag = (e: MouseEvent) => {
  if (!isHorizontalDragging.value || !scrollViewRef.value || !contentRef.value) return

  const deltaX = e.clientX - dragStartX.value
  const containerWidth = scrollViewRef.value.clientWidth
  const contentWidth = contentRef.value.scrollWidth
  const maxScrollLeft = contentWidth - containerWidth
  const scrollbarWidth = containerWidth - horizontalThumbWidth.value
  const scrollDelta = (deltaX / scrollbarWidth) * maxScrollLeft

  contentRef.value.scrollLeft = Math.max(0, Math.min(maxScrollLeft, scrollStartLeft.value + scrollDelta))
}

const stopHorizontalDrag = () => {
  isHorizontalDragging.value = false
  document.removeEventListener('mousemove', onHorizontalDrag)
  document.removeEventListener('mouseup', stopHorizontalDrag)
}

onMounted(() => {
  nextTick(() => {
    updateScrollbars()
    contentRef.value?.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', updateScrollbars)
    resizeObserver.value = new ResizeObserver(() => {
      updateScrollbars()
    })
    resizeObserver.value.observe(contentRef.value?.firstChild as Element)
  })
})

onUnmounted(() => {
  contentRef.value?.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', updateScrollbars)
  resizeObserver.value?.disconnect()
})
</script>

<style scoped>
.scroll-view {
  position: relative;
  overflow: hidden;
  height: 100%;
  width: 100%;
}

.scroll-content{
    height: 100%;
    width: 100%;
    overflow: scroll;
    box-sizing: border-box;
}

.custom-scrollbar {
  position: absolute;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  cursor: pointer;
}

.custom-scrollbar.vertical {
  top: 0;
  right: 0;
  width: 8px;
  height: 100%;
}

.custom-scrollbar.horizontal {
  bottom: 0;
  left: 0;
  height: 8px;
  width: 100%;
}

.scrollbar-thumb {
  position: absolute;
  background: rgb(128, 128, 128);
  border-radius: 4px;
  transition: background-color 0.2s;
  width: 100%;
}

.scrollbar-thumb:hover {
  background: rgb(160, 160, 160);
}
</style>