import { onMounted, onUnmounted } from 'vue'
import type { LoadedTextFile } from '../../utils/fileLoadingHelpers'
import type { LoadedPrimaryLogFile } from '../../../../utils/logFileDiscovery'
import type { UseProcessFileLoaderOptions } from './types'
import {
  assertArchiveInputsWithinLimits,
  DEFAULT_ARCHIVE_LIMITS,
} from '../../../../utils/archiveLimits'
import {
  InputResourceLimitError,
  chargeInputResourceBytes,
  createInputResourceBudget,
  registerInputResourceEntry,
  type InputResourceBudget,
} from '../../../../utils/browserInputBudget'
import { replaceBlobUrl, revokeBlobUrlMap } from '../../../../utils/blobUrlMap'

export interface VSCodeBridgePayload {
  type: string
  content?: string
  archives?: Array<{ name: string, base64: string }>
  selectedPaths?: string[]
  primaryLogFiles?: LoadedPrimaryLogFile[]
  textFiles?: LoadedTextFile[]
  errorImages?: Array<{ key: string, base64?: string, url?: string }>
  visionImages?: Array<{ key: string, base64?: string, url?: string }>
  waitFreezesImages?: Array<{ key: string, base64?: string, url?: string }>
}

type VSCodeLoadFileOptions = Pick<
  UseProcessFileLoaderOptions,
  'onUploadContent' | 'onFileLoadingStart' | 'onFileLoadingEnd'
>

type UnknownRecord = Record<string, unknown>
const utf8Encoder = new TextEncoder()

const asRecord = (value: unknown, label: string): UnknownRecord => {
  if (typeof value !== 'object' || value == null || Array.isArray(value)) {
    throw new InputResourceLimitError(`${label} 格式无效`)
  }
  return value as UnknownRecord
}

const asString = (value: unknown, label: string): string => {
  if (typeof value !== 'string') throw new InputResourceLimitError(`${label} 格式无效`)
  return value
}

const chargeBridgeText = (
  value: string,
  path: string,
  budget: InputResourceBudget,
) => {
  if (value.length > DEFAULT_ARCHIVE_LIMITS.maxFileBytes) {
    chargeInputResourceBytes(budget, value.length)
  }
  registerInputResourceEntry(budget, path, 2)
  chargeInputResourceBytes(budget, utf8Encoder.encode(value).byteLength)
}

const estimateBase64Size = (value: string): number => {
  const encodedLimit = Math.ceil(DEFAULT_ARCHIVE_LIMITS.maxFileBytes / 3) * 4 + 4
  if (value.length > encodedLimit) {
    throw new InputResourceLimitError('VS Code 消息中的 Base64 数据超过限制')
  }
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  return Math.floor(value.length * 3 / 4) - padding
}

const decodeBase64Bytes = (
  value: string,
  path: string,
  budget: InputResourceBudget,
  options: { image?: boolean } = {},
): Uint8Array<ArrayBuffer> => {
  registerInputResourceEntry(budget, path, 2)
  const expectedSize = estimateBase64Size(value)
  chargeInputResourceBytes(budget, expectedSize, options)
  const binary = atob(value)
  if (binary.length !== expectedSize) {
    throw new InputResourceLimitError('VS Code 消息中的 Base64 数据格式无效')
  }
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

const decodeImageEntries = (
  value: unknown,
  mimeType: string,
  label: string,
  budget: InputResourceBudget,
): Map<string, string> => {
  const images = new Map<string, string>()
  if (value == null) return images
  if (!Array.isArray(value)) throw new InputResourceLimitError(`${label} 格式无效`)

  try {
    for (let index = 0; index < value.length; index += 1) {
      const entry = asRecord(value[index], `${label}[${index}]`)
      const key = asString(entry.key, `${label}[${index}].key`)
      if (entry.url != null) {
        const url = asString(entry.url, `${label}[${index}].url`)
        const protocol = new URL(url).protocol
        if (!['https:', 'vscode-resource:', 'vscode-webview-resource:'].includes(protocol)) {
          throw new InputResourceLimitError(`${label}[${index}].url 协议无效`)
        }
        images.set(key, url)
        continue
      }
      const base64 = asString(entry.base64, `${label}[${index}].base64`)
      const bytes = decodeBase64Bytes(base64, `${label}/${index}/${key}`, budget, { image: true })
      replaceBlobUrl(images, key, new Blob([bytes], { type: mimeType }))
    }
    return images
  } catch (error) {
    revokeBlobUrlMap(images)
    throw error
  }
}

const decodeLoadedTextEntries = <T extends LoadedTextFile>(
  value: unknown,
  label: string,
  budget: InputResourceBudget,
): T[] | undefined => {
  if (value == null) return undefined
  if (!Array.isArray(value)) throw new InputResourceLimitError(`${label} 格式无效`)
  return value.map((candidate, index) => {
    const entry = asRecord(candidate, `${label}[${index}]`)
    const path = asString(entry.path, `${label}[${index}].path`)
    const name = asString(entry.name, `${label}[${index}].name`)
    const content = asString(entry.content, `${label}[${index}].content`)
    chargeBridgeText(content, `${label}/${index}/${path}`, budget)
    return { path, name, content } as T
  })
}

const decodeArchiveEntries = (value: unknown, budget: InputResourceBudget): File[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new InputResourceLimitError('VS Code 压缩包消息格式无效')
  }
  const entries = value.map((candidate, index) => {
    const entry = asRecord(candidate, `archives[${index}]`)
    const name = asString(entry.name, `archives[${index}].name`)
    const base64 = asString(entry.base64, `archives[${index}].base64`)
    return { name, base64, size: estimateBase64Size(base64) }
  })
  assertArchiveInputsWithinLimits(entries)

  return entries.map((entry, index) => {
    const bytes = decodeBase64Bytes(entry.base64, `archives/${index}/${entry.name}`, budget)
    return new File([bytes], entry.name, { type: 'application/zip' })
  })
}

const decodeSelectedPaths = (value: unknown, budget: InputResourceBudget): Set<string> => {
  if (value == null) return new Set()
  if (!Array.isArray(value)) throw new InputResourceLimitError('selectedPaths 格式无效')
  const result = new Set<string>()
  for (let index = 0; index < value.length; index += 1) {
    const path = asString(value[index], `selectedPaths[${index}]`)
    registerInputResourceEntry(budget, `selectedPaths/${index}/${path}`, 2)
    result.add(path)
  }
  return result
}

export const handleVSCodeLoadFilePayload = (
  value: unknown,
  options: VSCodeLoadFileOptions,
): boolean => {
  if (typeof value !== 'object' || value == null || Array.isArray(value)) return false
  const message = value as UnknownRecord
  if (message.type !== 'loadFile') return false

  const content = message.content == null ? '' : asString(message.content, 'content')
  if (!content && (!Array.isArray(message.primaryLogFiles) || message.primaryLogFiles.length === 0)) {
    return false
  }

  options.onFileLoadingStart()
  const createdImageMaps: Array<Map<string, string>> = []
  let adopted = false
  try {
    const budget = createInputResourceBudget()
    if (content) chargeBridgeText(content, 'content', budget)
    const primaryLogFiles = decodeLoadedTextEntries<LoadedPrimaryLogFile>(
      message.primaryLogFiles,
      'primaryLogFiles',
      budget,
    )
    const textFiles = decodeLoadedTextEntries<LoadedTextFile>(message.textFiles, 'textFiles', budget)
    const errorImages = decodeImageEntries(message.errorImages, 'image/png', 'errorImages', budget)
    createdImageMaps.push(errorImages)
    const visionImages = decodeImageEntries(message.visionImages, 'image/jpeg', 'visionImages', budget)
    createdImageMaps.push(visionImages)
    const waitFreezesImages = decodeImageEntries(
      message.waitFreezesImages,
      'image/jpeg',
      'waitFreezesImages',
      budget,
    )
    createdImageMaps.push(waitFreezesImages)
    options.onUploadContent(
      content,
      errorImages,
      visionImages,
      waitFreezesImages,
      textFiles,
      primaryLogFiles,
    )
    adopted = true
    return true
  } finally {
    if (!adopted) {
      for (const images of createdImageMaps) revokeBlobUrlMap(images)
    }
    options.onFileLoadingEnd()
  }
}

export const useVSCodeBridge = (
  options: UseProcessFileLoaderOptions,
  isInVSCode: () => boolean,
) => {
  const handleVSCodeOpen = () => {
    if (window.vscodeApi) {
      window.vscodeApi.postMessage({ type: 'openFile' })
    } else {
      console.error('[VS Code] vscodeApi not available')
    }
  }

  const handleVSCodeOpenFolder = () => {
    if (window.vscodeApi) {
      window.vscodeApi.postMessage({ type: 'openFolder' })
    } else {
      console.error('[VS Code] vscodeApi not available')
    }
  }

  const handleVSCodeMessage = (event: MessageEvent) => {
    if (typeof event.data !== 'object' || event.data == null || Array.isArray(event.data)) return
    const message = event.data as UnknownRecord
    try {
      if (message.type === 'loadArchive') {
        const budget = createInputResourceBudget()
        const archives = decodeArchiveEntries(message.archives, budget)
        const selectedPaths = decodeSelectedPaths(message.selectedPaths, budget)
        options.onUploadFile(
          archives.length === 1 ? archives[0] : archives,
          selectedPaths.size > 0
            ? async logOptions => logOptions.filter(option => selectedPaths.has(option.path))
            : options.selectPrimaryLogs,
        )
        return
      }

      if (handleVSCodeLoadFilePayload(message, options)) return

      if (message.type === 'loadZipFile') {
        handleVSCodeLoadFilePayload({ ...message, type: 'loadFile' }, options)
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      window.$message?.error(`无法读取 VS Code 消息: ${detail}`)
    }
  }

  onMounted(() => {
    if (isInVSCode()) {
      window.addEventListener('message', handleVSCodeMessage)
    }
  })

  onUnmounted(() => {
    if (isInVSCode()) {
      window.removeEventListener('message', handleVSCodeMessage)
    }
  })

  return {
    handleVSCodeOpen,
    handleVSCodeOpenFolder,
  }
}
