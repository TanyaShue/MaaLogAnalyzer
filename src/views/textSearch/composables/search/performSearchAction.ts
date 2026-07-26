import { executeAndCommitSearch } from './executeAndCommit'
import { executeSearchByMode } from './executeByMode'
import { toastError } from '../../../../utils/toast'
import { ensureSearchPreconditions } from './preconditions'
import type { TextSearchSearchExecutorOptions } from './executorTypes'
import { buildSearchExecutionSnapshot } from './optionBuilders'

interface PerformSearchActionDependencies {
  ensurePreconditions?: typeof ensureSearchPreconditions
  executeSearch?: typeof executeSearchByMode
  reportError?: (error: unknown) => void
}

export const createPerformSearchAction = (
  options: TextSearchSearchExecutorOptions,
  dependencies: PerformSearchActionDependencies = {},
) => {
  const ensurePreconditions = dependencies.ensurePreconditions ?? ensureSearchPreconditions
  const executeSearch = dependencies.executeSearch ?? executeSearchByMode
  const reportError = dependencies.reportError ?? ((error: unknown) => {
    toastError('搜索失败: ' + error)
  })
  let latestInvocationId = 0

  return async () => {
    const invocationId = ++latestInvocationId
    options.searchRequestGeneration.value += 1
    options.isSearching.value = false
    const isLatestInvocation = () => invocationId === latestInvocationId
    let isCurrent = isLatestInvocation

    try {
      const preconditionsReady = await ensurePreconditions(options, isLatestInvocation)
      if (!isLatestInvocation() || !preconditionsReady) return

      const requestGeneration = options.searchRequestGeneration.value
      isCurrent = () => (
        isLatestInvocation() &&
        options.searchRequestGeneration.value === requestGeneration
      )
      const snapshot = buildSearchExecutionSnapshot(options)
      options.isSearching.value = true

      await executeAndCommitSearch(options, { snapshot, isCurrent }, executeSearch)
    } catch (error) {
      if (isCurrent()) {
        reportError(error)
      }
    } finally {
      if (isCurrent()) {
        options.isSearching.value = false
      }
    }
  }
}
