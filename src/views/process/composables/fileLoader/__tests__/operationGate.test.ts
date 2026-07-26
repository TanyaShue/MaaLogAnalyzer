import { describe, expect, it, vi } from 'vitest'
import { createFileLoadOperationGate } from '../operationGate'

describe('file load operation gate', () => {
  it('invalidates older work without letting it finish newer loading state', () => {
    const setLoading = vi.fn()
    const onLoadingStart = vi.fn()
    const onLoadingEnd = vi.fn()
    const gate = createFileLoadOperationGate({ setLoading, onLoadingStart, onLoadingEnd })

    const first = gate.begin()
    expect(gate.startLoading(first)).toBe(true)
    const second = gate.begin()
    expect(gate.isCurrent(first)).toBe(false)
    expect(gate.startLoading(second)).toBe(true)

    gate.finish(first)
    expect(setLoading).toHaveBeenLastCalledWith(true)

    gate.finish(second)
    expect(setLoading).toHaveBeenLastCalledWith(false)
    expect(onLoadingStart).toHaveBeenCalledTimes(2)
    expect(onLoadingEnd).toHaveBeenCalledTimes(2)
  })
})
