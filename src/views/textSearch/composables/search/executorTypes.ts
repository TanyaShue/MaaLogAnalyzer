import type { Ref } from 'vue'
import type { LoadedSearchTarget, SearchResult } from '../types'
import type { SourceMode } from '../loadedSource/types'

export interface TextSearchSearchExecutorOptions {
  searchText: Ref<string>
  fileName: Ref<string>
  fileContent: Ref<string>
  fileHandle: Ref<File | null>
  isLargeFile: Ref<boolean>
  isLoadingFile: Ref<boolean>
  isSearching: Ref<boolean>
  sourceLoadGeneration: Ref<number>
  sourceIntentGeneration: Ref<number>
  sourceMode: Ref<SourceMode>
  prepareSourceMode: (mode: SourceMode) => void
  loadedTargets: Ref<LoadedSearchTarget[] | undefined>
  ensureDeferredLoadedTargetsReady: () => Promise<void>
  ensureLoadedTargetReady: () => Promise<boolean>
  caseSensitive: Ref<boolean>
  useRegex: Ref<boolean>
  maxResults: number
  searchResults: Ref<SearchResult[]>
  totalMatches: Ref<number>
  addToHistory: (text: string) => void
  searchRequestGeneration: Ref<number>
}

export interface TextSearchExecutionSnapshot {
  fileContent: string
  fileHandle: File | null
  isLargeFile: boolean
  keyword: string
  useRegex: boolean
  caseSensitive: boolean
}

export interface ActiveTextSearchRequest {
  snapshot: TextSearchExecutionSnapshot
  isCurrent: () => boolean
}
