import { describe, expect, it } from 'vitest'
import {
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
})
