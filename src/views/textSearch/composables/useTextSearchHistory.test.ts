import { describe, expect, it } from 'vitest'
import { normalizeSearchHistory } from './useTextSearchHistory'

describe('text search history persistence', () => {
  it.each([null, {}, 'query', 42])('rejects non-array persisted value %#', (value) => {
    expect(normalizeSearchHistory(value)).toEqual([])
  })

  it('keeps only unique non-empty strings within the history limit', () => {
    const saved = [
      'recent',
      42,
      '',
      '   ',
      'recent',
      ...Array.from({ length: 25 }, (_, index) => `query-${index}`),
    ]

    const normalized = normalizeSearchHistory(saved)

    expect(normalized).toHaveLength(20)
    expect(normalized.slice(0, 3)).toEqual(['recent', 'query-0', 'query-1'])
    expect(normalized[normalized.length - 1]).toBe('query-18')
  })
})
