import { ArchiveLimitError, DEFAULT_ARCHIVE_LIMITS } from './archiveLimits'

export const BROWSER_INPUT_MAX_DIRECTORY_DEPTH = 64
const utf8Encoder = new TextEncoder()

export class BrowserInputLimitError extends Error {
  readonly name = 'BrowserInputLimitError'

  constructor(message: string) {
    super(message)
  }
}

export interface BrowserInputBudget {
  entryCount: number
  totalPathBytes: number
  selectedBytes: number
  readonly registeredFiles: WeakSet<File>
  readonly chargedFiles: WeakSet<File>
}

export const createBrowserInputBudget = (): BrowserInputBudget => ({
  entryCount: 0,
  totalPathBytes: 0,
  selectedBytes: 0,
  registeredFiles: new WeakSet<File>(),
  chargedFiles: new WeakSet<File>(),
})

const assertFileSize = (file: File) => {
  if (!Number.isSafeInteger(file.size) || file.size < 0) {
    throw new BrowserInputLimitError('浏览器返回了无效的文件大小')
  }
}

export const registerBrowserInputEntry = (
  budget: BrowserInputBudget,
  path: string,
  depth: number,
) => {
  if (!Number.isSafeInteger(depth) || depth < 0 || depth > BROWSER_INPUT_MAX_DIRECTORY_DEPTH) {
    throw new BrowserInputLimitError(`目录嵌套层级超过限制 (${BROWSER_INPUT_MAX_DIRECTORY_DEPTH})`)
  }

  const pathBytes = utf8Encoder.encode(path).byteLength
  if (pathBytes > DEFAULT_ARCHIVE_LIMITS.maxPathBytes) {
    throw new ArchiveLimitError('path-size', pathBytes, DEFAULT_ARCHIVE_LIMITS.maxPathBytes)
  }

  const nextEntryCount = budget.entryCount + 1
  const nextTotalPathBytes = budget.totalPathBytes + pathBytes
  if (!Number.isSafeInteger(nextEntryCount) || nextEntryCount > DEFAULT_ARCHIVE_LIMITS.maxEntries) {
    throw new ArchiveLimitError('entry-count', nextEntryCount, DEFAULT_ARCHIVE_LIMITS.maxEntries)
  }
  if (!Number.isSafeInteger(nextTotalPathBytes) || nextTotalPathBytes > DEFAULT_ARCHIVE_LIMITS.maxTotalPathBytes) {
    throw new ArchiveLimitError(
      'total-path-size',
      nextTotalPathBytes,
      DEFAULT_ARCHIVE_LIMITS.maxTotalPathBytes,
    )
  }

  budget.entryCount = nextEntryCount
  budget.totalPathBytes = nextTotalPathBytes
}

export const registerBrowserInputFile = (
  budget: BrowserInputBudget,
  file: File,
  path: string,
) => {
  if (budget.registeredFiles.has(file)) return
  const depth = path.replace(/\\/g, '/').split('/').filter(Boolean).length - 1
  registerBrowserInputEntry(budget, path, Math.max(0, depth))
  budget.registeredFiles.add(file)
}

export const chargeBrowserInputFile = (
  budget: BrowserInputBudget,
  file: File,
  options: { image?: boolean } = {},
) => {
  if (budget.chargedFiles.has(file)) return
  assertFileSize(file)
  if (file.size > DEFAULT_ARCHIVE_LIMITS.maxFileBytes) {
    throw new ArchiveLimitError('file-size', file.size, DEFAULT_ARCHIVE_LIMITS.maxFileBytes)
  }
  if (options.image && file.size > DEFAULT_ARCHIVE_LIMITS.maxImageBytes) {
    throw new ArchiveLimitError('image-size', file.size, DEFAULT_ARCHIVE_LIMITS.maxImageBytes)
  }

  const nextSelectedBytes = budget.selectedBytes + file.size
  if (!Number.isSafeInteger(nextSelectedBytes) || nextSelectedBytes > DEFAULT_ARCHIVE_LIMITS.maxExtractedBytes) {
    throw new ArchiveLimitError(
      'extracted-size',
      nextSelectedBytes,
      DEFAULT_ARCHIVE_LIMITS.maxExtractedBytes,
    )
  }
  budget.selectedBytes = nextSelectedBytes
  budget.chargedFiles.add(file)
}
