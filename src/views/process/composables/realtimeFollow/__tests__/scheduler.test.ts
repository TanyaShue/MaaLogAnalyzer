import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { TaskInfo } from '../../../../../types'
import { createFollowScheduler } from '../scheduler'

const makeTask = (startEventIndex: number): TaskInfo => ({
  task_id: 1,
  entry: 'Same numeric id',
  hash: `hash-${startEventIndex}`,
  uuid: `uuid-${startEventIndex}`,
  start_time: `2026-07-26 12:00:${startEventIndex}.000`,
  status: 'running',
  nodes: [],
  events: [],
  _startEventIndex: startEventIndex,
})

describe('createFollowScheduler', () => {
  it('switches to the latest execution when numeric task ids are reused', async () => {
    const previousTask = makeTask(10)
    const latestTask = makeTask(20)
    const activeTaskIndex = ref(0)
    const onSelectTask = vi.fn()
    const taskListPanel = { scrollToBottom: vi.fn() }
    const nodeNavPanel = { scrollToBottom: vi.fn() }
    const scrollToLatestNodeBottom = vi.fn(async () => {})
    const scheduler = createFollowScheduler({
      tasks: ref([previousTask, latestTask]),
      selectedTask: ref(previousTask),
      isRealtimeStreaming: ref(true),
      followLast: ref(true),
      activeTaskIndex,
      onSelectTask,
      taskListPanelRef: ref(taskListPanel),
      nodeNavPanelRef: ref(nodeNavPanel),
      scrollToLatestNodeBottom,
    })

    await scheduler.followToLatest()

    expect(activeTaskIndex.value).toBe(1)
    expect(onSelectTask).toHaveBeenCalledWith(latestTask)
    expect(taskListPanel.scrollToBottom).toHaveBeenCalledOnce()
    expect(nodeNavPanel.scrollToBottom).toHaveBeenCalledOnce()
    expect(scrollToLatestNodeBottom).toHaveBeenCalledOnce()
  })

  it('does not reselect a refreshed projection of the same execution', async () => {
    const task = makeTask(10)
    const refreshedTask = { ...task, nodes: [...task.nodes] }
    const onSelectTask = vi.fn()
    const scheduler = createFollowScheduler({
      tasks: ref([refreshedTask]),
      selectedTask: ref(task),
      isRealtimeStreaming: ref(true),
      followLast: ref(true),
      activeTaskIndex: ref(0),
      onSelectTask,
      taskListPanelRef: ref(null),
      nodeNavPanelRef: ref(null),
      scrollToLatestNodeBottom: vi.fn(async () => {}),
    })

    await scheduler.followToLatest()

    expect(onSelectTask).not.toHaveBeenCalled()
  })
})
