import { describe, expect, it } from 'vitest'
import { LogParser } from '@windsland52/maa-log-parser'

describe('LogParser parse options', () => {
  it.each([
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid chunkLineCount %s', async (chunkLineCount) => {
    const parser = new LogParser()

    await expect(parser.parseFile('non-empty', undefined, {
      chunkLineCount,
      yieldControl: null,
    })).rejects.toThrow(new RangeError('chunkLineCount must be a positive safe integer'))
  })

  it('accepts a positive safe integer chunkLineCount', async () => {
    const parser = new LogParser()

    await expect(parser.parseFile('first\nsecond', undefined, {
      chunkLineCount: 1,
      yieldControl: null,
    })).resolves.toBeUndefined()
  })
})
