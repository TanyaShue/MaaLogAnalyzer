import { describe, expect, it } from 'vitest'
import { isPersistedLayoutCollapsed } from './useProcessLayout'

describe('process layout persistence', () => {
  it('restores only an explicit boolean true as collapsed', () => {
    expect(isPersistedLayoutCollapsed(true)).toBe(true)

    for (const value of [false, 'true', 'false', 1, 0, null, undefined]) {
      expect(isPersistedLayoutCollapsed(value)).toBe(false)
    }
  })
})
