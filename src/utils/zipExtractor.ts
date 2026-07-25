/**
 * ZIP 压缩包解压与日志提取工具
 * 从 ZIP 文件中提取日志（maa / maafw）及 on_error 截图
 *
 * 使用 fflate 的 filter 选项，只解压需要的文件，避免大 ZIP 全量解压导致内存暴涨。
 */

import { unzip, unzipSync, type Unzipped } from 'fflate'
import { decodeFileContent } from './textEncoding'
import {
  createPrimaryLogSelectionOptions,
  isPrimaryLogFileName,
  type LoadedPrimaryLogFile,
  type PrimaryLogSelectionOption,
  selectPrimaryLogGroup,
  sortLoadedPrimaryLogSegments,
} from './logFileDiscovery'
import {
  extractErrorImages,
  extractVisionImages,
  extractWaitFreezesImages,
  extractSearchTextFiles,
  isNeededFile,
} from './archiveShared'
import type { ExtractedTextFile } from './archiveShared'

export type { ExtractedTextFile } from './archiveShared'

export interface ExtractZipContentOptions {
  includeAuxiliaryFiles?: boolean
}

function toMap(record: Record<string, Uint8Array>): Map<string, Uint8Array> {
  const map = new Map<string, Uint8Array>()
  for (const key of Object.keys(record)) {
    map.set(key, record[key])
  }
  return map
}

/**
 * 在 files 中查找指定路径的文件（不区分路径分隔符）
 */
function findFile(
  files: Record<string, Uint8Array>,
  paths: string[],
  target: string,
): Uint8Array | null {
  const normalizedTarget = target.replace(/\\/g, '/').toLowerCase()
  for (const p of paths) {
    if (p.replace(/\\/g, '/').toLowerCase() === normalizedTarget) {
      return files[p]
    }
  }
  return null
}

interface BufferedZipArchive {
  data: Uint8Array
  paths: string[]
}

async function bufferZipArchive(file: File): Promise<BufferedZipArchive> {
  const data = new Uint8Array(await file.arrayBuffer())
  const paths: string[] = []
  unzipSync(data, {
    filter: (entry) => {
      paths.push(entry.name)
      return false
    },
  })
  return { data, paths }
}

async function unzipNeededFiles(
  zipData: Uint8Array,
  includeAuxiliaryFiles: boolean,
  selectedPaths: Set<string>,
): Promise<Unzipped> {
  return new Promise<Unzipped>((resolve, reject) => {
    unzip(
      zipData,
      {
        filter: (entry) => {
          const fileName = entry.name.replace(/\\/g, '/').split('/').pop() ?? ''
          if (isPrimaryLogFileName(fileName)) return selectedPaths.has(entry.name)
          return includeAuxiliaryFiles && isNeededFile(entry.name)
        },
      },
      (err, unzipped) => {
        if (err) reject(err)
        else resolve(unzipped)
      },
    )
  })
}

/**
 * Extract logs and debug assets from one or more independent ZIP files.
 * MXU volumes are complete ZIP files, so entries must be merged before log discovery.
 */
export async function extractZipContents(
  archiveFiles: readonly File[],
  selectPrimaryLogs?: (options: PrimaryLogSelectionOption[]) => Promise<PrimaryLogSelectionOption[] | null>,
  options: ExtractZipContentOptions = {},
): Promise<{
  content: string
  errorImages: Map<string, string>
  visionImages: Map<string, string>
  waitFreezesImages: Map<string, string>
  textFiles: ExtractedTextFile[]
  primaryLogFiles: LoadedPrimaryLogFile[]
} | null> {
  const includeAuxiliaryFiles = options.includeAuxiliaryFiles !== false
  const archives = await Promise.all(archiveFiles.map(bufferZipArchive))
  const archivePaths = Array.from(new Set(archives.flatMap(archive => archive.paths)))

  const selectedLogs = selectPrimaryLogGroup(archivePaths.map((path) => ({
    path,
    name: path.replace(/\\/g, '/').split('/').pop() || path,
  })))
  if (selectedLogs.length === 0) {
    return null
  }

  const selectedOptions = selectPrimaryLogs
    ? await selectPrimaryLogs(createPrimaryLogSelectionOptions(selectedLogs.map(({ item }) => item)))
    : createPrimaryLogSelectionOptions(selectedLogs.map(({ item }) => item))
  if (!selectedOptions || selectedOptions.length === 0) {
    return null
  }
  const selectedPaths = new Set(selectedOptions.map(option => option.path))

  const files = Object.create(null) as Unzipped
  for (const archive of archives) {
    const unzipped = await unzipNeededFiles(archive.data, includeAuxiliaryFiles, selectedPaths)
    for (const [path, data] of Object.entries(unzipped)) {
      files[path] = data
    }
  }

  const fileMap = toMap(files)
  const paths = Object.keys(files)

  const basePath = selectedLogs[0].candidate.dirPath
  const loadedLogs = selectedLogs
    .filter(({ item }) => selectedPaths.has(item.path))
    .map(({ item }) => {
      const data = findFile(files, paths, item.path)
      if (!data) return null
      return {
        path: item.path,
        name: item.name,
        content: decodeFileContent(data),
      }
    })
    .filter((entry): entry is LoadedPrimaryLogFile => entry != null)
  const primaryLogFiles = sortLoadedPrimaryLogSegments(loadedLogs)

  if (primaryLogFiles.length === 0) {
    return null
  }

  const errorImages = includeAuxiliaryFiles ? extractErrorImages(fileMap, paths, basePath) : new Map<string, string>()
  const visionImages = includeAuxiliaryFiles ? extractVisionImages(fileMap, paths, basePath) : new Map<string, string>()
  const waitFreezesImages = includeAuxiliaryFiles ? extractWaitFreezesImages(fileMap, paths, basePath) : new Map<string, string>()
  const textFiles = includeAuxiliaryFiles
    ? extractSearchTextFiles(fileMap, paths, basePath, decodeFileContent)
    : []

  return { content: '', errorImages, visionImages, waitFreezesImages, textFiles, primaryLogFiles }
}

/**
 * Extract logs and debug assets from a single ZIP file.
 */
export async function extractZipContent(
  file: File,
  selectPrimaryLogs?: (options: PrimaryLogSelectionOption[]) => Promise<PrimaryLogSelectionOption[] | null>,
  options: ExtractZipContentOptions = {},
) {
  return extractZipContents([file], selectPrimaryLogs, options)
}
