import { execFileSync } from 'node:child_process'
import { WINDOWS_CONTEXT_MENU_KEYS } from './windowsContextMenu'

if (process.platform === 'win32') {
  for (const key of WINDOWS_CONTEXT_MENU_KEYS) {
    try {
      execFileSync('reg.exe', ['delete', key, '/f'], { windowsHide: true })
    } catch {
      // The key may not exist or may already have been removed explicitly.
    }
  }
}
