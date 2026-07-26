export type ThemePreference = 'dark' | 'light'

const getStorage = (): Storage | null => {
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

export const readThemePreference = (): ThemePreference | null => {
  try {
    const value = getStorage()?.getItem('theme')
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return null
  }
}

export const writeThemePreference = (preference: ThemePreference): boolean => {
  try {
    const storage = getStorage()
    if (!storage) return false
    storage.setItem('theme', preference)
    return true
  } catch {
    return false
  }
}
