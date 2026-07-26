import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveArchiveLimits } from '../archiveLimits'
import { openFolderDialog } from '../fileDialog'

type MockEntry = FileSystemFileHandle | FileSystemDirectoryHandle

const mockFile = (name: string, content: string, size?: number): File => {
  if (size == null) return new File([content], name)
  return { name, size, text: async () => content } as File
}

const fileHandle = (file: File): FileSystemFileHandle => ({
  kind: 'file',
  name: file.name,
  getFile: async () => file,
} as FileSystemFileHandle)

const directoryHandle = (
  name: string,
  entries: MockEntry[],
): FileSystemDirectoryHandle => ({
  kind: 'directory',
  name,
  async *values() {
    yield* entries
  },
  async getDirectoryHandle(childName: string) {
    const entry = entries.find(candidate => (
      candidate.kind === 'directory' && candidate.name === childName
    ))
    if (entry) return entry as FileSystemDirectoryHandle
    const error = new Error(`Missing directory: ${childName}`)
    error.name = 'NotFoundError'
    throw error
  },
} as unknown as FileSystemDirectoryHandle)

const stubPicker = (root: FileSystemDirectoryHandle) => {
  vi.stubGlobal('window', { showDirectoryPicker: vi.fn(async () => root) })
}

describe('Web file picker resource budgets', () => {
  beforeEach(() => {
    vi.stubGlobal('alert', vi.fn())
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('rejects an oversized primary log before reading its text', async () => {
    const text = vi.fn(async () => 'oversized')
    const file = {
      name: 'maa.log',
      size: resolveArchiveLimits().maxFileBytes + 1,
      text,
    } as unknown as File
    stubPicker(directoryHandle('debug', [fileHandle(file)]))

    await expect(openFolderDialog()).resolves.toBeNull()
    expect(text).not.toHaveBeenCalled()
  })

  it('loads a directly nested debug folder within the shared budget', async () => {
    const debug = directoryHandle('debug', [
      fileHandle(mockFile('maa.log', 'primary')),
      fileHandle(mockFile('details.txt', 'auxiliary')),
    ])
    stubPicker(directoryHandle('selected', [debug]))

    await expect(openFolderDialog()).resolves.toMatchObject({
      primaryLogFiles: [{ name: 'maa.log', content: 'primary' }],
      textFiles: [{ path: 'details.txt', name: 'details.txt', content: 'auxiliary' }],
    })
  })

  it('stops recursive discovery at the shared directory depth limit', async () => {
    let nested = directoryHandle('leaf', [])
    for (let index = 65; index >= 0; index -= 1) {
      nested = directoryHandle(`level-${index}`, [nested])
    }
    stubPicker(nested)

    await expect(openFolderDialog()).resolves.toBeNull()
    expect(alert).toHaveBeenCalledWith(expect.stringContaining('目录嵌套层级超过限制'))
  })

  it('revokes image URLs if a later URL allocation fails', async () => {
    const errorImage = fileHandle(mockFile(
      '2026.03.08-13.12.30.216_Node.png',
      'error-image',
    ))
    const visionImage = fileHandle(mockFile(
      '2026.03.08-13.12.30.216_Node_123456789.jpg',
      'vision-image',
    ))
    const root = directoryHandle('debug', [
      fileHandle(mockFile('maa.log', 'primary')),
      directoryHandle('on_error', [errorImage]),
      directoryHandle('vision', [visionImage]),
    ])
    stubPicker(root)
    const createObjectURL = vi.fn()
      .mockReturnValueOnce('blob:first')
      .mockImplementationOnce(() => { throw new Error('allocation failed') })
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    await expect(openFolderDialog()).resolves.toBeNull()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:first')
  })
})
