import { describe, expect, it, vi } from 'vitest'
import { createFileLoadOperationGate } from '../operationGate'
import { useWebFileInputs } from '../useWebFileInputs'
import type { UseProcessFileLoaderOptions } from '../types'
import { ref } from 'vue'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

const createLogFile = (
  content: string,
  text: () => Promise<string>,
): File => ({
  name: 'maa.log',
  size: content.length,
  webkitRelativePath: 'debug/maa.log',
  text,
} as unknown as File)

const createInputEvent = (file: File): Event => ({
  target: { files: [file], value: 'selected' },
} as unknown as Event)

describe('Web file input generations', () => {
  it('drops an older folder read that finishes after a newer selection', async () => {
    const firstText = createDeferred<string>()
    const firstFile = createLogFile('first', () => firstText.promise)
    const secondFile = createLogFile('second', async () => 'second')
    const onUploadContent = vi.fn()
    const options: UseProcessFileLoaderOptions = {
      isInTauri: ref(false),
      isInVSCode: ref(false),
      onUploadFile: vi.fn(),
      onUploadContent,
      onFileLoadingStart: vi.fn(),
      onFileLoadingEnd: vi.fn(),
    }
    const gate = createFileLoadOperationGate({
      setLoading: vi.fn(),
      onLoadingStart: options.onFileLoadingStart,
      onLoadingEnd: options.onFileLoadingEnd,
    })
    const { handleFolderChange } = useWebFileInputs(options, gate)

    const firstRun = handleFolderChange(createInputEvent(firstFile))
    await Promise.resolve()
    const secondRun = handleFolderChange(createInputEvent(secondFile))
    await secondRun
    firstText.resolve('first')
    await firstRun

    expect(onUploadContent).toHaveBeenCalledOnce()
    expect(onUploadContent.mock.calls[0]?.[5]).toEqual([{
      path: 'debug/maa.log',
      name: 'maa.log',
      content: 'second',
    }])
  })
})
