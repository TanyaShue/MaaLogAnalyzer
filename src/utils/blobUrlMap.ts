export const replaceBlobUrl = (
  target: Map<string, string>,
  key: string,
  source: Blob,
): string => {
  const nextUrl = URL.createObjectURL(source)
  const previousUrl = target.get(key)
  if (previousUrl && previousUrl !== nextUrl) {
    URL.revokeObjectURL(previousUrl)
  }
  target.set(key, nextUrl)
  return nextUrl
}
