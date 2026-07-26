import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(
  new URL('../../../.github/workflows/release-npm.yml', import.meta.url),
  'utf8',
)

describe('npm release workflow', () => {
  it('preflights every unpublished artifact before publishing any package', () => {
    const preflightIndex = workflow.indexOf('- name: Preflight package release')
    const publishIndex = workflow.indexOf('- name: Publish preflighted packages')

    expect(preflightIndex).toBeGreaterThan(-1)
    expect(publishIndex).toBeGreaterThan(preflightIndex)
    const preflight = workflow.slice(preflightIndex, publishIndex)
    expect(preflight).toContain('npm whoami')
    expect(preflight).toContain("grep -q 'E404'")
    expect(preflight).toContain('pnpm --dir "${pkg_dir}" pack')
    expect(preflight).not.toMatch(/\b(?:npm|pnpm) publish\b/)
  })

  it('publishes only tarballs recorded by the preflight plan', () => {
    const publish = workflow.slice(workflow.indexOf('- name: Publish preflighted packages'))

    expect(publish).toContain('read -r tarball package_ref')
    expect(publish).toContain('npm publish "${tarball}" --access public --provenance')
    expect(publish).not.toMatch(/done < "\$\{plan_file\}"\r?\n\s+done/)
    expect(workflow).not.toContain('pnpm publish --access public')
  })

  it('limits registry mutations to the upstream repository', () => {
    expect(workflow).toContain("if: ${{ github.repository_owner == 'MaaXYZ' }}")
  })
})
