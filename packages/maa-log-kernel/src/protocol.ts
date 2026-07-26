import type { EventNotification, TaskInfo } from './types'
import type { NodeStatistics, RecognitionActionStatistics } from './statistics'

export const MLA_KERNEL_SCHEMA_VERSION = '1.0.0'

export interface KernelOutputMeta {
  schemaVersion: typeof MLA_KERNEL_SCHEMA_VERSION
  parserVersion: string
  generatedAt: string
}

export interface KernelStatistics {
  nodes: NodeStatistics[]
  recognitionActions: RecognitionActionStatistics[]
}

export interface KernelOutput<TTask extends TaskInfo = TaskInfo> {
  meta: KernelOutputMeta
  tasks: TTask[]
  events: EventNotification[]
  stats: KernelStatistics
  warnings: string[]
}
