import { describe, expect, it, vi } from 'vitest'
import { handleVSCodeLoadFilePayload } from '../useVSCodeBridge'

describe('VS Code loadFile bridge', () => {
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
})
