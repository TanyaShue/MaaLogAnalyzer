import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const packageNames = [
  'maa-log-kernel',
  'maa-log-parser',
  'maa-log-runtime',
  'maa-log-adapter',
  'maa-log-tools',
]

describe('published package engine compatibility', () => {
  it('keeps every library on the tested Node 20 baseline', () => {
    const root = resolve(import.meta.dirname, '../../..')
    const engines = packageNames.map((name) => {
      const manifest = JSON.parse(
        readFileSync(resolve(root, 'packages', name, 'package.json'), 'utf8'),
      ) as { engines?: { node?: string } }
      return manifest.engines?.node
    })

    expect(new Set(engines)).toEqual(new Set(['>=20.18.0']))
  })
})
