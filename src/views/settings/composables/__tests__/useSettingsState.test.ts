import { beforeAll, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

const success = vi.fn()

vi.mock('naive-ui', () => ({
  useMessage: () => ({ success }),
}))

describe('settings draft state', () => {
  beforeAll(() => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    })
  })

  it('does not mutate global settings before save and reloads on reopen', async () => {
    const { getSettings } = await import('../../../../utils/settings')
    const { useSettingsState } = await import('../useSettingsState')
    const show = ref(true)
    const state = useSettingsState(show)
    const persisted = getSettings()

    state.settings.displayMode = 'compact'
    expect(persisted.displayMode).toBe('tree')

    show.value = false
    show.value = true
    await nextTick()
    expect(state.settings.displayMode).toBe('tree')

    state.settings.displayMode = 'detailed'
    state.handleSave()
    expect(persisted.displayMode).toBe('detailed')
    expect(success).toHaveBeenCalledWith('设置已保存')
  })
})
