import { ref } from 'vue'
import type { SearchResult } from '../types'

export const useTextSearchSearchState = () => {
  const maxResults = 500
  const isSearching = ref(false)
  const isLoadingFile = ref(false)
  const searchRequestGeneration = ref(0)
  const searchResults = ref<SearchResult[]>([])
  const totalMatches = ref(0)

  return {
    maxResults,
    isSearching,
    isLoadingFile,
    searchRequestGeneration,
    searchResults,
    totalMatches,
  }
}
