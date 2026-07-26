import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readWorkflow = (name: string): string => (
  readFileSync(new URL(`../../../.github/workflows/${name}`, import.meta.url), 'utf8')
)

const extractRunBlocks = (workflow: string): string[] => {
  const lines = workflow.split(/\r?\n/)
  const blocks: string[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(\s*)run:\s*\|\s*$/.exec(lines[index] ?? '')
    if (!match) continue

    const indentation = match[1]!.length
    const block: string[] = []
    for (index += 1; index < lines.length; index += 1) {
      const line = lines[index] ?? ''
      if (line.trim() && line.length - line.trimStart().length <= indentation) {
        index -= 1
        break
      }
      block.push(line)
    }
    blocks.push(block.join('\n'))
  }

  return blocks
}

describe('release workflow shell safety', () => {
  it.each(['build.yml', 'release-vscode.yml'])('does not inject refs into run blocks in %s', (name) => {
    const runScripts = extractRunBlocks(readWorkflow(name)).join('\n')

    expect(runScripts).not.toContain('${{ github.ref }}')
    expect(runScripts).not.toContain('${{ github.ref_name }}')
    expect(runScripts).toContain('GITHUB_REF')
  })

  it('accepts semantic release tags and rejects shell metacharacters', () => {
    const workflows = `${readWorkflow('build.yml')}\n${readWorkflow('release-vscode.yml')}`
    const bashPatterns = [...workflows.matchAll(/tag_pattern='([^']+)'/g)]
      .map(match => match[1]!)
    const powershellPattern = /\$tag -notmatch '([^']+)'/.exec(workflows)?.[1]

    expect(bashPatterns).toHaveLength(3)
    expect(new Set([...bashPatterns, powershellPattern])).toHaveLength(1)

    const pattern = new RegExp(bashPatterns[0]!)
    expect(['v3.5.0', 'v3.5.0-rc.1', 'v3.5.0+build.7'].every(tag => pattern.test(tag))).toBe(true)
    expect([
      'v1.2.3;id',
      'v1.2.3$(id)',
      'v1.2.3";whoami;#',
      'main',
    ].every(tag => !pattern.test(tag))).toBe(true)
  })

  it('creates desktop releases only for version tags', () => {
    expect(readWorkflow('build.yml')).toMatch(
      /\n  release:\r?\n    if: startsWith\(github\.ref, 'refs\/tags\/v'\)/,
    )
  })
})
