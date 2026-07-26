import { h, onUnmounted, ref } from 'vue'
import { FileOutlined, FolderOutlined } from '@vicons/antd'
import type { UseProcessFileLoaderOptions } from './fileLoader/types'
import { useWebFileInputs } from './fileLoader/useWebFileInputs'
import { useVSCodeBridge } from './fileLoader/useVSCodeBridge'
import { useTauriBridge } from './fileLoader/useTauriBridge'
import { createTauriArchiveResourceOwner } from '../../../utils/tauriArchiveResources'

export const useProcessFileLoader = (options: UseProcessFileLoaderOptions) => {
  const fileLoading = ref(false)
  const archiveResourceOwner = createTauriArchiveResourceOwner()
  const releaseArchiveResource = () => {
    void archiveResourceOwner.release()
  }
  const lifecycleOptions: UseProcessFileLoaderOptions = {
    ...options,
    onUploadFile: (...args) => {
      releaseArchiveResource()
      options.onUploadFile(...args)
    },
    onUploadContent: (...args) => {
      releaseArchiveResource()
      options.onUploadContent(...args)
    },
  }
  const setFileLoading = (loading: boolean) => {
    fileLoading.value = loading
  }

  const {
    folderInputRef,
    fileInputRef,
    handleDrop,
    handleDragOver,
    handleFolderChange,
    handleFileInputChange,
    triggerFolderSelect,
    triggerFileSelect,
  } = useWebFileInputs(lifecycleOptions, setFileLoading)

  const {
    handleVSCodeOpen,
    handleVSCodeOpenFolder,
  } = useVSCodeBridge(lifecycleOptions, () => options.isInVSCode.value)

  const {
    handleTauriOpen,
    handleTauriOpenFolder,
  } = useTauriBridge(lifecycleOptions, setFileLoading, archiveResourceOwner)

  onUnmounted(() => {
    void archiveResourceOwner.dispose()
  })

  const reloadOptions = [
    {
      label: '选择文件',
      key: 'file',
      icon: () => h(FileOutlined),
    },
    {
      label: '选择文件夹',
      key: 'folder',
      icon: () => h(FolderOutlined),
    },
  ]

  const handleReloadSelect = (key: string) => {
    if (options.isInTauri.value) {
      if (key === 'file') {
        void handleTauriOpen()
      } else if (key === 'folder') {
        void handleTauriOpenFolder()
      }
      return
    }

    if (options.isInVSCode.value) {
      if (key === 'file') {
        handleVSCodeOpen()
      } else if (key === 'folder') {
        handleVSCodeOpenFolder()
      }
      return
    }

    if (key === 'file') {
      triggerFileSelect()
    } else if (key === 'folder') {
      triggerFolderSelect()
    }
  }

  return {
    fileLoading,
    folderInputRef,
    fileInputRef,
    reloadOptions,
    handleDrop,
    handleDragOver,
    handleFolderChange,
    triggerFolderSelect,
    triggerFileSelect,
    handleFileInputChange,
    handleReloadSelect,
    handleTauriOpen,
    handleTauriOpenFolder,
    handleVSCodeOpen,
    handleVSCodeOpenFolder,
  }
}
