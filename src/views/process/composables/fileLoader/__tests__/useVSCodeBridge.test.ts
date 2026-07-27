import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleVSCodeLoadFilePayload } from '../useVSCodeBridge'

describe('VS Code loadFile bridge', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('forwards archive search text alongside selected primary logs', () => {
    const onUploadContent = vi.fn()
    const onFileLoadingStart = vi.fn()
    const onFileLoadingEnd = vi.fn()
    const textFiles = [{ path: 'debug/report.txt', name: 'report.txt', content: 'details' }]
    const primaryLogFiles = [{ path: 'debug/maa.log', name: 'maa.log', content: 'log' }]

    const handled = handleVSCodeLoadFilePayload(
      { type: 'loadFile', content: '', textFiles, primaryLogFiles },
      { onUploadContent, onFileLoadingStart, onFileLoadingEnd },
    )

    expect(handled).toBe(true)
    expect(onFileLoadingStart).toHaveBeenCalledOnce()
    expect(onFileLoadingEnd).toHaveBeenCalledOnce()
    expect(onUploadContent).toHaveBeenCalledWith(
      '',
      new Map(),
      new Map(),
      new Map(),
      textFiles,
      primaryLogFiles,
    )
  })

  it('ends loading and revokes decoded images when a later field is invalid', () => {
    const onUploadContent = vi.fn()
    const onFileLoadingStart = vi.fn()
    const onFileLoadingEnd = vi.fn()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:error-image')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    expect(() => handleVSCodeLoadFilePayload(
      {
        type: 'loadFile',
        content: 'log',
        errorImages: [{ key: 'error', base64: btoa('image') }],
        visionImages: [{ key: 'vision', base64: 'not-base64' }],
      },
      { onUploadContent, onFileLoadingStart, onFileLoadingEnd },
    )).toThrow()

    expect(onUploadContent).not.toHaveBeenCalled()
    expect(onFileLoadingStart).toHaveBeenCalledOnce()
    expect(onFileLoadingEnd).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:error-image')
  })

  it('forwards webview image resource URLs without Base64 decoding', () => {
    const onUploadContent = vi.fn()
    const createObjectURL = vi.spyOn(URL, 'createObjectURL')
    const imageUrl = 'https://file+.vscode-resource.vscode-cdn.net/c%3A/logs/vision/image.jpg'

    expect(handleVSCodeLoadFilePayload(
      {
        type: 'loadFile',
        content: 'log',
        visionImages: [{ key: 'vision', url: imageUrl }],
      },
      {
        onUploadContent,
        onFileLoadingStart: vi.fn(),
        onFileLoadingEnd: vi.fn(),
      },
    )).toBe(true)

    expect(createObjectURL).not.toHaveBeenCalled()
    expect(onUploadContent).toHaveBeenCalledWith(
      'log',
      new Map(),
      new Map([['vision', imageUrl]]),
      new Map(),
      undefined,
      undefined,
    )
  })

  it('rejects malformed loaded-file entries without leaving loading active', () => {
    const onUploadContent = vi.fn()
    const onFileLoadingStart = vi.fn()
    const onFileLoadingEnd = vi.fn()

    expect(() => handleVSCodeLoadFilePayload(
      {
        type: 'loadFile',
        content: 'log',
        primaryLogFiles: [{ path: 'maa.log', name: 'maa.log', content: 42 }],
      },
      { onUploadContent, onFileLoadingStart, onFileLoadingEnd },
    )).toThrow(/primaryLogFiles/)

    expect(onUploadContent).not.toHaveBeenCalled()
    expect(onFileLoadingEnd).toHaveBeenCalledOnce()
  })
})
