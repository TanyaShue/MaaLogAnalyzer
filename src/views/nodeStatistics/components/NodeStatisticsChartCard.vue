<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { NCard } from 'naive-ui'

const VChart = defineAsyncComponent(() => import('./chartRuntime'))

const props = defineProps<{
  visible: boolean
  option: any
  isMobile: boolean
}>()

const chartHeight = computed(() => {
  const itemCount = Array.isArray(props.option?.yAxis?.data) ? props.option.yAxis.data.length : 0
  const minHeight = props.isMobile ? 360 : 420
  const perItemHeight = props.isMobile ? 34 : 30
  return `${Math.max(minHeight, 88 + itemCount * perItemHeight)}px`
})
</script>

<template>
  <n-card
    v-if="props.visible && props.option"
    size="small"
    class="statistics-chart-card"
    :bordered="false"
  >
    <div
      class="statistics-chart-surface"
      :style="{ width: '100%', height: chartHeight }"
    >
      <v-chart
        :option="props.option"
        autoresize
        style="pointer-events: none"
      />
    </div>
  </n-card>
</template>

<style scoped>
.statistics-chart-card {
  width: 100%;
}

.statistics-chart-surface {
  width: 100%;
}

.statistics-chart-surface :deep(div),
.statistics-chart-surface :deep(canvas) {
  pointer-events: none !important;
}
</style>
