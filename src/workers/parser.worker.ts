/// <reference lib="webworker" />

import { LogParser, type ParseSourceInput } from '@windsland52/maa-log-parser'
import { decodeFileContent } from '../utils/textEncoding'
import type {
  LogParserWorkerInput,
  LogParserWorkerRequest,
  LogParserWorkerResponse,
} from '../utils/parserWorkerProtocol'

const post = (message: LogParserWorkerResponse): void => {
  self.postMessage(message)
}

const toParseSourceInput = (
  input: LogParserWorkerInput,
  index: number,
): ParseSourceInput => ({
  content: input.bytes
    ? decodeFileContent(new Uint8Array(input.bytes))
    : input.content ?? '',
  sourceKey: input.sourceKey,
  sourcePath: input.sourcePath,
  inputIndex: input.inputIndex ?? index,
})

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  return String(error)
}

self.onmessage = async (event: MessageEvent<LogParserWorkerRequest>) => {
  const request = event.data
  if (request?.type !== 'parse') return

  const { requestId } = request
  try {
    const parser = new LogParser()
    parser.setErrorImages(request.errorImages ?? new Map())
    parser.setVisionImages(request.visionImages ?? new Map())
    parser.setWaitFreezesImages(request.waitFreezesImages ?? new Map())

    await parser.parseInputs(
      request.inputs.map(toParseSourceInput),
      (progress) => {
        post({ type: 'progress', requestId, percentage: progress.percentage })
      },
    )

    post({ type: 'result', requestId, tasks: parser.consumeTasks() })
  } catch (error) {
    post({ type: 'error', requestId, message: getErrorMessage(error) })
  }
}
