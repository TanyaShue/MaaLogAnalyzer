const handles = new WeakMap<File, FileSystemFileHandle>()
const readers = new WeakMap<File, () => Promise<File>>()

export const rememberWebFileHandle = (file: File, handle: FileSystemFileHandle): File => {
  handles.set(file, handle)
  return file
}

export const getWebFileHandle = (file: File): FileSystemFileHandle | undefined => handles.get(file)

export const rememberFileReader = (file: File, reader: () => Promise<File>): File => {
  readers.set(file, reader)
  return file
}

export const getRememberedFileReader = (file: File): (() => Promise<File>) | undefined => readers.get(file)
