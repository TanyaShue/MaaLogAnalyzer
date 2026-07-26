export function isValidReleaseVersion(version: string): boolean

export function collectVersionUpdates(rootDir: string, version: string): Map<string, string>

export function syncVersion(options: {
  rootDir: string
  version: string
  check?: boolean
}): string[]
