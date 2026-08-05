import { getErrorMessage } from '../../../../utils/errorHandler'
import type { LoadedTextFile } from '../../../../utils/fileDialog'
import {
  createPrimaryLogParseInputs,
  getPrimaryLogContentLoader,
  type PrimaryLogFile,
} from '../../../../utils/logFileDiscovery'
import { isSupportedArchive, extractArchiveContents } from '../../../../utils/archiveExtractor'
import type { LogLoadingPipelineOptions } from './types'
import type { ProcessLogContentParams } from './types'
import type { DeferredTextSearchTarget, TextSearchLoadedTarget } from '../useTextSearchTargets'
import { getTextFileContentLoader } from '../../../../utils/textFileSource'
import { decodeFileContent } from '../../../../utils/textEncoding'
import { getRememberedFileReader, getWebFileHandle } from '../../../../utils/webFileHandles'

import {
  confirmInsistParsing,
  INSIST_ARCHIVE_LIMIT_OVERRIDES,
} from '../../../../utils/archiveLimits'

interface CreateUploadHandlersOptions {
  pipeline: LogLoadingPipelineOptions
  processLogContent: (params: ProcessLogContentParams) => Promise<void>
}

const createDeferredTargetsFromTextFiles = (
  content: string,
  textFiles?: LoadedTextFile[],
  primaryLogFiles?: PrimaryLogFile[],
): DeferredTextSearchTarget[] => {
  const primaryPaths = new Set((primaryLogFiles ?? []).map(file => file.path))
  const primaryTargets: DeferredTextSearchTarget[] = (primaryLogFiles ?? []).map((file, index) => ({
    id: `loaded:primary:${index}:${file.path}`,
    label: file.path || file.name,
    fileName: file.name,
    loadContent: getPrimaryLogContentLoader(file),
  }))
  const explicitTargets: DeferredTextSearchTarget[] = (textFiles ?? [])
    .filter(file => !primaryPaths.has(file.path))
    .map((file, index) => ({
      id: `loaded:text:${index}:${file.path}`,
      label: file.path || file.name,
      fileName: file.name,
      loadContent: getTextFileContentLoader(file),
    }))
  if (primaryTargets.length > 0) return [...primaryTargets, ...explicitTargets]
  if (explicitTargets.length > 0) return explicitTargets
  return [{
    id: 'loaded:content',
    label: 'loaded.log',
    fileName: 'loaded.log',
    loadContent: async () => content,
  }]
}

const pickPreferredDeferredTargetId = (
  pipeline: LogLoadingPipelineOptions,
  targets: DeferredTextSearchTarget[],
): string => pipeline.pickPreferredLogTargetId(targets.map((target): TextSearchLoadedTarget => ({
  id: target.id,
  label: target.label,
  fileName: target.fileName,
  content: '',
})))

export const createLogLoadingUploadHandlers = (options: CreateUploadHandlersOptions) => {
  const { pipeline, processLogContent } = options
  let incrementalTimer: number | null = null
  let incrementalGeneration = 0

  const stopIncrementalMonitor = () => {
    incrementalGeneration += 1
    if (incrementalTimer != null) window.clearTimeout(incrementalTimer)
    incrementalTimer = null
  }

  const startIncrementalMonitor = (readCurrentFile: () => Promise<File>, initialOffset = 0) => {
    stopIncrementalMonitor()
    const generation = incrementalGeneration
    let offset = initialOffset
    let carry = ''
    const poll = async () => {
      if (generation !== incrementalGeneration) return
      try {
        const file = await readCurrentFile()
        if (file.size < offset) {
          // Truncate/rotation: restart through the normal full-file path.
          offset = 0
          carry = ''
          await processLogContent({ content: '', incrementalFileHandle: true })
        }
        if (file.size > offset) {
          const bytes = new Uint8Array(await file.slice(offset).arrayBuffer())
          offset = file.size
          const text = carry + decodeFileContent(bytes)
          const lines = text.split(/\r?\n/)
          carry = lines.pop() ?? ''
          if (lines.length > 0) {
            pipeline.parser.appendRealtimeLines(lines)
            pipeline.applyParsedTasks(pipeline.parser.getTasksSnapshot(), true)
          }
        }
      } catch (error) {
        console.warn('[web-file-monitor] incremental read failed:', error)
      } finally {
        if (generation === incrementalGeneration) {
          incrementalTimer = window.setTimeout(() => void poll(), 1000)
        }
      }
    }
    void poll()
  }

  const handleFileUpload = async (
    upload: File | File[],
    selectPrimaryLogs = pipeline.selectPrimaryLogs,
  ) => {
    const files = Array.isArray(upload) ? upload : [upload]
    const file = files[0]
    if (!file) return

    stopIncrementalMonitor()

    if (pipeline.loading.value) {
      pipeline.onWarning('正在处理上一个文件，请稍候')
      return
    }
    pipeline.loading.value = true
    try {
      if (isSupportedArchive(file.name)) {
        pipeline.onFileLoadingStart?.()
        let fileLoadingActive = true
        try {
          let result
          try {
            result = await extractArchiveContents(files, selectPrimaryLogs)
          } catch (error) {
            if (!confirmInsistParsing(error)) throw error
            result = await extractArchiveContents(files, selectPrimaryLogs, undefined, {
              archiveLimits: INSIST_ARCHIVE_LIMIT_OVERRIDES,
            })
          }
          if (!result) {
            pipeline.onWarning('压缩包中未找到有效的日志文件')
            return
          }

          const deferredTargets = createDeferredTargetsFromTextFiles(result.content, result.textFiles, result.primaryLogFiles)
          const defaultTargetId = pickPreferredDeferredTargetId(pipeline, deferredTargets)
          pipeline.onFileLoadingEnd?.()
          fileLoadingActive = false
          await processLogContent({
            content: result.content,
            parseInputs: result.primaryLogFiles.length > 0
              ? createPrimaryLogParseInputs(result.primaryLogFiles)
              : undefined,
            sortParseInputs: result.primaryLogFiles.length > 1,
            errorImages: result.errorImages,
            visionImages: result.visionImages,
            waitFreezesImages: result.waitFreezesImages,
            deferredTargets,
            loadedDefaultTargetId: defaultTargetId,
          })
        } finally {
          if (fileLoadingActive) {
            pipeline.onFileLoadingEnd?.()
          }
        }
        return
      }

      const fileName = file.name || 'loaded.log'
      const handle = getWebFileHandle(file)
      const rememberedReader = getRememberedFileReader(file)
      const readCurrentFile = handle
        ? () => handle.getFile()
        : rememberedReader
      if (readCurrentFile) {
        let initial: File
        try {
          initial = await readCurrentFile()
        } catch {
          initial = file
        }
        if (initial === file) {
          await processLogContent({
            content: '',
            parseInputs: [{ file, sourceKey: fileName, sourcePath: fileName, inputIndex: 0 }],
            loadedDefaultTargetId: 'loaded:single',
            deferredTargets: [{
              id: 'loaded:single', label: file.name, fileName: file.name,
              loadContent: async () => decodeFileContent(new Uint8Array(await file.arrayBuffer())),
            }],
          })
          return
        }
        await processLogContent({
          content: '',
          parseInputs: [{ file: initial, sourceKey: fileName, sourcePath: fileName, inputIndex: 0 }],
          incrementalFileHandle: true,
          loadedDefaultTargetId: 'loaded:single',
          deferredTargets: [{
            id: 'loaded:single', label: file.name, fileName: file.name,
            loadContent: async () => {
              const latest = await readCurrentFile()
              return decodeFileContent(new Uint8Array(await latest.arrayBuffer()))
            },
          }],
        })
        startIncrementalMonitor(readCurrentFile, initial.size)
        return
      }
      await processLogContent({
        content: '',
        parseInputs: [{
          file,
          sourceKey: fileName,
          sourcePath: fileName,
          inputIndex: 0,
        }],
        loadedDefaultTargetId: 'loaded:single',
        deferredTargets: [{
          id: 'loaded:single',
          label: file.name,
          fileName: file.name,
          loadContent: async () => decodeFileContent(new Uint8Array(await file.arrayBuffer())),
        }],
      })
    } catch (error) {
      pipeline.onError(getErrorMessage(error))
    } finally {
      pipeline.loading.value = false
    }
  }

  const handleContentUpload = async (
    content: string,
    errorImages?: Map<string, string>,
    visionImages?: Map<string, string>,
    waitFreezesImages?: Map<string, string>,
    textFiles?: LoadedTextFile[],
    primaryLogFiles?: PrimaryLogFile[],
  ) => {
    stopIncrementalMonitor()
    if (pipeline.loading.value) {
      pipeline.onWarning('正在处理上一个文件，请稍候')
      return
    }
    pipeline.loading.value = true
    try {
      const deferredTargets = createDeferredTargetsFromTextFiles(content, textFiles, primaryLogFiles)
      const defaultTargetId = pickPreferredDeferredTargetId(pipeline, deferredTargets)
      await processLogContent({
        content,
        parseInputs: primaryLogFiles && primaryLogFiles.length > 0
          ? createPrimaryLogParseInputs(primaryLogFiles)
          : undefined,
        sortParseInputs: (primaryLogFiles?.length ?? 0) > 1,
        errorImages,
        visionImages,
        waitFreezesImages,
        deferredTargets,
        loadedDefaultTargetId: defaultTargetId,
      })
    } catch (error) {
      pipeline.onError(getErrorMessage(error))
    } finally {
      pipeline.loading.value = false
    }
  }

  return {
    handleFileUpload,
    handleContentUpload,
  }
}
