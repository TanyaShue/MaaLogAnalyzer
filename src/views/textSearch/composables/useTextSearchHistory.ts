import { onMounted, ref } from 'vue'

const MAX_SEARCH_HISTORY_ITEMS = 20

export const normalizeSearchHistory = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  const result: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || item.trim() === '' || seen.has(item)) continue
    seen.add(item)
    result.push(item)
    if (result.length === MAX_SEARCH_HISTORY_ITEMS) break
  }
  return result
}

export const useTextSearchHistory = () => {
  const searchHistory = ref<string[]>([])
  const storageKey = 'searchHistory'

  onMounted(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        searchHistory.value = normalizeSearchHistory(JSON.parse(saved))
      } catch {
        // ignore parse errors
      }
    }
  })

  const saveSearchHistory = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(searchHistory.value))
    } catch {
      // ignore save errors
    }
  }

  const addToHistory = (text: string) => {
    if (!text || text.trim() === '') return

    const index = searchHistory.value.indexOf(text)
    if (index > -1) {
      searchHistory.value.splice(index, 1)
    }

    searchHistory.value.unshift(text)

    if (searchHistory.value.length > MAX_SEARCH_HISTORY_ITEMS) {
      searchHistory.value = searchHistory.value.slice(0, MAX_SEARCH_HISTORY_ITEMS)
    }

    saveSearchHistory()
  }

  const removeFromHistory = (text: string) => {
    const index = searchHistory.value.indexOf(text)
    if (index > -1) {
      searchHistory.value.splice(index, 1)
      saveSearchHistory()
    }
  }

  return {
    searchHistory,
    addToHistory,
    removeFromHistory,
  }
}
