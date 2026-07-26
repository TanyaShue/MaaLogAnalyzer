import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(TEST_DIR, '../../../')
const SRC_ROOT = path.join(REPO_ROOT, 'src')

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.vue'])

const IMPORT_SOURCE_REGEX = /\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g

const collectSourceFiles = (dirPath: string, output: string[]) => {
  const entries = readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      collectSourceFiles(entryPath, output)
      continue
    }
    const ext = path.extname(entry.name)
    if (SOURCE_EXTENSIONS.has(ext)) {
      output.push(entryPath)
    }
  }
}

const isLegacyCompatImport = (source: string): boolean => {
  if (source.includes('/utils/logParserVueRuntime')) return false
  if (source.includes('/utils/logParser')) return true
  return (
    source.includes('/utils/nodeFlow') ||
    source.includes('/utils/nodeStatistics') ||
    source.includes('/utils/stringPool') ||
    source.includes('/utils/timestamp') ||
    source.includes('/utils/logEventDecoders')
  )
}

describe('parser import boundary', () => {
  it('does not import legacy parser compatibility utils in app source', () => {
    const files: string[] = []
    collectSourceFiles(SRC_ROOT, files)

    const violations: string[] = []
    for (const filePath of files) {
      const content = readFileSync(filePath, 'utf8')
      for (const match of content.matchAll(IMPORT_SOURCE_REGEX)) {
        const source = (match[1] || match[2] || '').trim()
        if (!source) continue
        if (isLegacyCompatImport(source)) {
          violations.push(`${path.relative(REPO_ROOT, filePath)} -> ${source}`)
        }
      }
    }

    expect(violations).toEqual([])
  })
})
