import type { Ref } from 'vue'
import type { SourceMode } from '../loadedSource/types'
import type { SearchResult } from '../types'

export interface TextSearchFileRuntimeOptions {
  sourceMode: Ref<SourceMode>
  sourceLoadGeneration: Ref<number>
  sourceIntentGeneration: Ref<number>
  isLoadingFile: Ref<boolean>
  isSearching: Ref<boolean>
  searchRequestGeneration: Ref<number>
  resetSearchResultsOnly: () => void
  searchText: Ref<string>
  fileName: Ref<string>
  fileContent: Ref<string>
  fileSizeInMB: Ref<number>
  isLargeFile: Ref<boolean>
  fileHandle: Ref<File | null>
  totalLines: Ref<number>
  contextLines: Ref<string[]>
  contextStartLine: Ref<number>
  selectedLine: Ref<number | null>
  showFileContent: Ref<boolean>
  contentKey: Ref<number>
  searchResults: Ref<SearchResult[]>
  totalMatches: Ref<number>
  topToolbarRef: Ref<{ resetFileInput: () => void } | null>
  contentPaneRef: Ref<{ scrollToLine: (lineNumber: number) => void } | null>
  filterDebugInfo: (line: string) => string
}

export interface HandleRuntimeFileUploadOptions {
  sourceMode: Ref<SourceMode>
  sourceLoadGeneration: Ref<number>
  sourceIntentGeneration: Ref<number>
  isLoadingFile: Ref<boolean>
  resetSearchResultsOnly: () => void
  fileName: Ref<string>
  fileSizeInMB: Ref<number>
  isLargeFile: Ref<boolean>
  fileContent: Ref<string>
  fileHandle: Ref<File | null>
  totalLines: Ref<number>
}

export interface ClearRuntimeContentOptions {
  sourceLoadGeneration: Ref<number>
  sourceIntentGeneration: Ref<number>
  searchRequestGeneration: Ref<number>
  isLoadingFile: Ref<boolean>
  isSearching: Ref<boolean>
  contentKey: Ref<number>
  showFileContent: Ref<boolean>
  selectedLine: Ref<number | null>
  searchResults: Ref<SearchResult[]>
  totalMatches: Ref<number>
  searchText: Ref<string>
  isLargeFile: Ref<boolean>
  fileHandle: Ref<File | null>
  totalLines: Ref<number>
  fileSizeInMB: Ref<number>
  contextLines: Ref<string[]>
  contextStartLine: Ref<number>
  fileContent: Ref<string>
  fileName: Ref<string>
  topToolbarRef: Ref<{ resetFileInput: () => void } | null>
}

export interface JumpToLineRuntimeOptions {
  selectedLine: Ref<number | null>
  isLargeFile: Ref<boolean>
  showFileContent: Ref<boolean>
  contentPaneRef: Ref<{ scrollToLine: (lineNumber: number) => void } | null>
}

export interface LoadContextLinesOptions {
  sourceLoadGeneration: Ref<number>
  fileHandle: Ref<File | null>
  fileContent: Ref<string>
  totalLines: Ref<number>
  contextLines: Ref<string[]>
  contextStartLine: Ref<number>
}
