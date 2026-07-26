import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const extensionSource = readFileSync(
  new URL('../../../src-vscode/src/extension.ts', import.meta.url),
  'utf8',
)

describe('VS Code Webview security policy', () => {
  it('does not execute or connect to third-party origins', () => {
    expect(extensionSource).not.toContain('cloud.umami.is')
    expect(extensionSource).not.toContain('gateway.umami.is')
    expect(extensionSource).not.toMatch(/<script[^>]+src=["']https?:\/\//i)
    expect(extensionSource).toContain('connect-src ${webview.cspSource} data: blob:;')
  })
})
