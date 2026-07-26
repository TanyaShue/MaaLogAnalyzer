import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Rust dependency audit workflow', () => {
  it('runs a reproducible RustSec audit in PR checks', () => {
    const workflow = readFileSync(
      new URL('../../../.github/workflows/pr-check.yml', import.meta.url),
      'utf8',
    )

    expect(workflow).toContain('cargo install cargo-audit --version 0.22.2 --locked')
    expect(workflow).toContain('cargo audit --file src-tauri/Cargo.lock')
  })
})
