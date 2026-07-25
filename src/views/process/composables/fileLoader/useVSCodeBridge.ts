import { onMounted, onUnmounted } from 'vue'
import { decodeBase64ImageEntries } from '../../utils/fileLoadingHelpers'
import type { LoadedPrimaryLogFile } from '../../../../utils/logFileDiscovery'
import type { UseProcessFileLoaderOptions } from './types'

interface VSCodeBridgePayload {
  type: string
  content?: string
  archives?: Array<{ name: string, base64: string }>
  selectedPaths?: string[]
  primaryLogFiles?: LoadedPrimaryLogFile[]
  errorImages?: Array<{ key: string, base64: string }>
  visionImages?: Array<{ key: string, base64: string }>
  waitFreezesImages?: Array<{ key: string, base64: string }>
}

const decodeBase64Archive = (entry: { name: string, base64: string }): File => {
  const binary = atob(entry.base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new File([bytes], entry.name, { type: 'application/zip' })
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
    const message = event.data as VSCodeBridgePayload
    if (message.type === 'loadArchive' && message.archives?.length) {
      try {
        const archives = message.archives.map(decodeBase64Archive)
        const selectedPaths = new Set(message.selectedPaths ?? [])
        options.onUploadFile(
          archives.length === 1 ? archives[0] : archives,
          selectedPaths.size > 0
            ? async logOptions => logOptions.filter(option => selectedPaths.has(option.path))
            : options.selectPrimaryLogs,
        )
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        window.$message?.error(`无法读取 ZIP 文件: ${detail}`)
      }
      return
    }

    if (message.type === 'loadFile' && (message.content || message.primaryLogFiles?.length)) {
      options.onFileLoadingStart()
      const errorImages = decodeBase64ImageEntries(message.errorImages, 'image/png')
      const visionImages = decodeBase64ImageEntries(message.visionImages, 'image/jpeg')
      const waitFreezesImages = decodeBase64ImageEntries(message.waitFreezesImages, 'image/jpeg')
      options.onUploadContent(message.content ?? '', errorImages, visionImages, waitFreezesImages, undefined, message.primaryLogFiles)
      options.onFileLoadingEnd()
      return
    }

    if (message.type === 'loadZipFile' && message.content) {
      options.onFileLoadingStart()
      const errorImages = decodeBase64ImageEntries(message.errorImages, 'image/png')
      const visionImages = decodeBase64ImageEntries(message.visionImages, 'image/jpeg')
      const waitFreezesImages = decodeBase64ImageEntries(message.waitFreezesImages, 'image/jpeg')
      options.onUploadContent(message.content, errorImages, visionImages, waitFreezesImages)
      options.onFileLoadingEnd()
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
