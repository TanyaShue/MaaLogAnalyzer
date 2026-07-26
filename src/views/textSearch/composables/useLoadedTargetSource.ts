import { computed, ref } from 'vue'
import type { SourceMode } from './loadedSource/types'
import type { LoadedSourceStateOptions } from './loadedSource/optionTypes'
import {
  createLoadedSourceActions,
  createLoadedSourceSyncOptions,
  mapLoadedTargetOptions,
  setupLoadedTargetSourceSync,
} from './loadedSource'
import { createSourceSelectionActions } from './loadedSource/selectionActions'
export type { SourceMode }

type UseLoadedTargetSourceOptions = LoadedSourceStateOptions

export const useLoadedTargetSource = (options: UseLoadedTargetSourceOptions) => {
  const sourceMode = ref<SourceMode>('manual')
  const selectedLoadedTargetId = ref('')

  const sourceModeOptions = [
    { label: '已加载目标', value: 'loaded' },
    { label: '手动选择文件', value: 'manual' },
  ]

  const loadedTargetOptions = computed(() => {
    return mapLoadedTargetOptions(options.loadedTargets.value ?? [])
  })

  const {
    selectSourceMode,
    selectLoadedTarget,
    beginManualFileSelection,
    prepareSourceMode,
    prepareLoadedTarget,
  } = createSourceSelectionActions({
    sourceMode,
    selectedLoadedTargetId,
    sourceLoadGeneration: options.sourceLoadGeneration,
    sourceIntentGeneration: options.sourceIntentGeneration,
    isLoadingFile: options.isLoadingFile,
    resetSearchResultsOnly: options.resetSearchResultsOnly,
  })

  const {
    applyLoadedTarget,
    ensureLoadedTargetReady,
    ensureDeferredLoadedTargetsReady,
  } = createLoadedSourceActions({
    sourceMode,
    selectedLoadedTargetId,
    prepareLoadedTarget,
    ...options,
  })

  setupLoadedTargetSourceSync(createLoadedSourceSyncOptions({
    options,
    sourceMode,
    selectedLoadedTargetId,
    applyLoadedTarget,
    prepareSourceMode,
    prepareLoadedTarget,
  }))

  return {
    sourceMode,
    selectedLoadedTargetId,
    sourceModeOptions,
    loadedTargetOptions,
    applyLoadedTarget,
    selectSourceMode,
    selectLoadedTarget,
    beginManualFileSelection,
    prepareSourceMode,
    ensureLoadedTargetReady,
    ensureDeferredLoadedTargetsReady,
  }
}
