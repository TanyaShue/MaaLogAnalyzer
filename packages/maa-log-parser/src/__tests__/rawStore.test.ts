import { describe, expect, it } from 'vitest'
import {
  adoptRawLineSource,
  createRawLineStore,
  queryRawLines,
  setRawLineSource,
} from '../raw/store'

describe('RawLineStore queries', () => {
  it('returns no records when limit is zero', () => {
    const store = createRawLineStore()
    setRawLineSource(store, {
      sourceKey: 'maa.log',
      inputIndex: 0,
      lines: ['first', 'second'],
    })

    expect(queryRawLines(store, { limit: 0 })).toEqual([])
    expect(queryRawLines(store, { limit: 1 })).toEqual([
      { sourceKey: 'maa.log', line: 1, text: 'first' },
    ])
  })

  it('only reuses a lines array through the explicit ownership-transfer API', () => {
    const copiedStore = createRawLineStore()
    const copiedLines = ['copied']
    const copied = setRawLineSource(copiedStore, {
      sourceKey: 'copied.log',
      inputIndex: 0,
      lines: copiedLines,
    })
    expect(copied.lines).not.toBe(copiedLines)

    const adoptedStore = createRawLineStore()
    const adoptedLines = ['adopted']
    const adopted = adoptRawLineSource(adoptedStore, {
      sourceKey: 'adopted.log',
      inputIndex: 0,
      lines: adoptedLines,
    })
    expect(adopted.lines).toBe(adoptedLines)
  })
})
