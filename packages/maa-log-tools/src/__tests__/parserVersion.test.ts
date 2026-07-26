import { describe, expect, it } from 'vitest'
import { DEFAULT_PARSER_VERSION } from '@windsland52/maa-log-parser'
import parserPackageJson from '../../../maa-log-parser/package.json' with { type: 'json' }
import { analyzeLogContent } from '../index'

describe('parser version metadata', () => {
  it('reports the parser package version by default', async () => {
    const output = await analyzeLogContent({ content: '' })

    const expectedVersion = `${parserPackageJson.name}/${parserPackageJson.version}`

    expect(DEFAULT_PARSER_VERSION).toBe(expectedVersion)
    expect(output.meta.parserVersion).toBe(DEFAULT_PARSER_VERSION)
    expect(output.meta.parserVersion).toMatch(/^@windsland52\/maa-log-parser\//)
  })

  it('keeps an explicit parser version override', async () => {
    const output = await analyzeLogContent({
      content: '',
      parserVersion: 'custom-parser/2.0.0',
    })

    expect(output.meta.parserVersion).toBe('custom-parser/2.0.0')
  })
})
