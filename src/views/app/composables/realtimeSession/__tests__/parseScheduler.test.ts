import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createRealtimeParseScheduler } from '../parseScheduler'
import type { RealtimeSessionState } from '../types'

const PARSE_INTERVAL_MS = 25

const createSession = (): RealtimeSessionState => ({
  sessionId: 'session-1',
  startedAt: 1,
  lastSeq: 1,
  pendingLines: ['head'],
})

const createHarness = (session: RealtimeSessionState) => {
  const appendRealtimeLines = vi.fn<(lines: string[]) => void>()
  const getTasksSnapshot = vi.fn<() => unknown[]>(() => [{ task_id: 1 }])
  const applyParsedTasks = vi.fn<(tasks: unknown[], preserveSelection: boolean) => void>()
  const syncRealtimeLoadedTarget = vi.fn<(value: RealtimeSessionState) => void>()
  const realtimeSession = ref<RealtimeSessionState | null>(session)
  const scheduler = createRealtimeParseScheduler({
    parseIntervalMs: PARSE_INTERVAL_MS,
    realtimeSession,
    appendRealtimeLines,
    getTasksSnapshot,
    applyParsedTasks,
    syncRealtimeLoadedTarget,
  })

  return {
    appendRealtimeLines,
    getTasksSnapshot,
    applyParsedTasks,
    syncRealtimeLoadedTarget,
    realtimeSession,
    scheduler,
  }
}

describe('createRealtimeParseScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('keeps an unacknowledged batch and retries it without changing the receive cursor', async () => {
    const session = createSession()
    const harness = createHarness(session)
    harness.appendRealtimeLines
      .mockImplementationOnce(() => {
        session.pendingLines.push('tail')
        throw new Error('append failed')
      })
      .mockImplementation(() => {})

    await harness.scheduler.runRealtimeParse()

    expect(session.pendingLines).toEqual(['head', 'tail'])
    expect(session.lastSeq).toBe(1)
    expect(harness.appendRealtimeLines).toHaveBeenNthCalledWith(1, ['head'])
    expect(harness.scheduler.realtimeParseFailed.value).toBe(true)

    await vi.advanceTimersByTimeAsync(PARSE_INTERVAL_MS)

    expect(harness.appendRealtimeLines).toHaveBeenNthCalledWith(2, ['head', 'tail'])
    expect(session.pendingLines).toEqual([])
    expect(harness.applyParsedTasks).toHaveBeenCalledTimes(1)
    expect(harness.syncRealtimeLoadedTarget).toHaveBeenCalledTimes(1)
    expect(harness.scheduler.realtimeParseFailed.value).toBe(false)
  })

  it('does not append an acknowledged batch again when projection fails', async () => {
    const session = createSession()
    const harness = createHarness(session)
    harness.getTasksSnapshot
      .mockImplementationOnce(() => {
        throw new Error('projection failed')
      })
      .mockReturnValue([{ task_id: 1 }])

    await harness.scheduler.runRealtimeParse()

    expect(session.pendingLines).toEqual([])
    expect(harness.appendRealtimeLines).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(PARSE_INTERVAL_MS)

    expect(harness.appendRealtimeLines).toHaveBeenCalledTimes(1)
    expect(harness.getTasksSnapshot).toHaveBeenCalledTimes(2)
    expect(harness.applyParsedTasks).toHaveBeenCalledTimes(1)
    expect(harness.syncRealtimeLoadedTarget).toHaveBeenCalledTimes(1)
  })

  it('only acknowledges the captured prefix when new lines arrive during append', async () => {
    const session = createSession()
    const harness = createHarness(session)
    harness.appendRealtimeLines.mockImplementationOnce(() => {
      session.pendingLines.push('tail')
    })

    await harness.scheduler.runRealtimeParse()

    expect(session.pendingLines).toEqual(['tail'])

    await harness.scheduler.runRealtimeParse()

    expect(harness.appendRealtimeLines).toHaveBeenNthCalledWith(1, ['head'])
    expect(harness.appendRealtimeLines).toHaveBeenNthCalledWith(2, ['tail'])
    expect(session.pendingLines).toEqual([])
  })

  it('stops automatic retries at the limit and reset restores the retry budget', async () => {
    const session = createSession()
    const harness = createHarness(session)
    harness.appendRealtimeLines.mockImplementation(() => {
      throw new Error('append failed')
    })

    await harness.scheduler.runRealtimeParse()
    await vi.runAllTimersAsync()

    expect(harness.appendRealtimeLines).toHaveBeenCalledTimes(4)
    expect(session.pendingLines).toEqual(['head'])
    expect(session.lastSeq).toBe(1)
    expect(vi.getTimerCount()).toBe(0)
    expect(harness.getTasksSnapshot).not.toHaveBeenCalled()
    expect(harness.scheduler.realtimeParseFailed.value).toBe(true)

    harness.scheduler.resetParseState()
    expect(harness.scheduler.realtimeParseFailed.value).toBe(false)
    await harness.scheduler.runRealtimeParse()

    expect(harness.appendRealtimeLines).toHaveBeenCalledTimes(5)
    expect(vi.getTimerCount()).toBe(1)
  })
})
