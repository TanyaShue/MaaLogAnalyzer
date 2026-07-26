import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(
  new URL('../../../.github/workflows/pr-check.yml', import.meta.url),
  'utf8',
)

describe('test workflow compatibility', () => {
  it('uses supported Vitest worker options without swallowing them after --', () => {
    expect(workflow).toContain('pnpm test --pool=threads --maxWorkers=1')
    expect(workflow).not.toContain('--minWorkers')
    expect(workflow).not.toContain('pnpm test -- --pool')
  })
})
