import { ref } from 'vue'

export const APP_LAYOUT_STORAGE_KEY = 'maa-log-analyzer-app-layout'
export const PROCESS_LAYOUT_STORAGE_KEY = 'maa-log-analyzer-process-layout'
export const TEXT_SEARCH_LAYOUT_STORAGE_KEY = 'maa-log-analyzer-text-search-layout'

export const layoutResetGeneration = ref(0)

export const resetPersistedLayouts = (): void => {
  for (const key of [
    APP_LAYOUT_STORAGE_KEY,
    PROCESS_LAYOUT_STORAGE_KEY,
    TEXT_SEARCH_LAYOUT_STORAGE_KEY,
  ]) {
    try {
      localStorage.removeItem(key)
    } catch {
      // Keep resetting live state when storage is unavailable.
    }
  }
  layoutResetGeneration.value += 1
}
