export interface FileLoadOperationGate {
  begin: () => number
  startLoading: (generation: number) => boolean
  isCurrent: (generation: number) => boolean
  finish: (generation: number) => void
}

interface CreateFileLoadOperationGateOptions {
  setLoading: (loading: boolean) => void
  onLoadingStart: () => void
  onLoadingEnd: () => void
}

export const createFileLoadOperationGate = (
  options: CreateFileLoadOperationGateOptions,
): FileLoadOperationGate => {
  let generation = 0
  let loadingGeneration: number | null = null

  const endCurrentLoading = () => {
    if (loadingGeneration == null) return
    loadingGeneration = null
    options.setLoading(false)
    options.onLoadingEnd()
  }

  return {
    begin() {
      endCurrentLoading()
      generation += 1
      return generation
    },
    startLoading(candidate) {
      if (candidate !== generation) return false
      if (loadingGeneration === candidate) return true
      endCurrentLoading()
      loadingGeneration = candidate
      options.setLoading(true)
      options.onLoadingStart()
      return true
    },
    isCurrent(candidate) {
      return candidate === generation
    },
    finish(candidate) {
      if (loadingGeneration !== candidate) return
      endCurrentLoading()
    },
  }
}
