import type {
  ClearRuntimeContentOptions,
  HandleRuntimeFileUploadOptions,
  JumpToLineRuntimeOptions,
  LoadContextLinesOptions,
  TextSearchFileRuntimeOptions,
} from './types'

export const buildHandleFileUploadOptions = (
  options: TextSearchFileRuntimeOptions,
): HandleRuntimeFileUploadOptions => ({
  sourceMode: options.sourceMode,
  sourceLoadGeneration: options.sourceLoadGeneration,
  sourceIntentGeneration: options.sourceIntentGeneration,
  isLoadingFile: options.isLoadingFile,
  resetSearchResultsOnly: options.resetSearchResultsOnly,
  fileName: options.fileName,
  fileSizeInMB: options.fileSizeInMB,
  isLargeFile: options.isLargeFile,
  fileContent: options.fileContent,
  fileHandle: options.fileHandle,
  totalLines: options.totalLines,
})

export const buildClearRuntimeOptions = (
  options: TextSearchFileRuntimeOptions,
): ClearRuntimeContentOptions => ({
  sourceLoadGeneration: options.sourceLoadGeneration,
  sourceIntentGeneration: options.sourceIntentGeneration,
  searchRequestGeneration: options.searchRequestGeneration,
  isLoadingFile: options.isLoadingFile,
  isSearching: options.isSearching,
  contentKey: options.contentKey,
  showFileContent: options.showFileContent,
  selectedLine: options.selectedLine,
  searchResults: options.searchResults,
  totalMatches: options.totalMatches,
  searchText: options.searchText,
  isLargeFile: options.isLargeFile,
  fileHandle: options.fileHandle,
  totalLines: options.totalLines,
  fileSizeInMB: options.fileSizeInMB,
  contextLines: options.contextLines,
  contextStartLine: options.contextStartLine,
  fileContent: options.fileContent,
  fileName: options.fileName,
  topToolbarRef: options.topToolbarRef,
})

export const buildLoadContextLinesOptions = (
  options: TextSearchFileRuntimeOptions,
): LoadContextLinesOptions => ({
  sourceLoadGeneration: options.sourceLoadGeneration,
  fileHandle: options.fileHandle,
  fileContent: options.fileContent,
  totalLines: options.totalLines,
  contextLines: options.contextLines,
  contextStartLine: options.contextStartLine,
})

export const buildJumpToLineOptions = (
  options: TextSearchFileRuntimeOptions,
): JumpToLineRuntimeOptions => ({
  selectedLine: options.selectedLine,
  isLargeFile: options.isLargeFile,
  showFileContent: options.showFileContent,
  contentPaneRef: options.contentPaneRef,
})
