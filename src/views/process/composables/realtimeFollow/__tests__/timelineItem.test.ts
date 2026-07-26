import { describe, expect, it } from 'vitest'
import type { NodeInfo } from '../../../../../types'
import { createNodeTimelineItem } from '../../useRealtimeFollow'

describe('createNodeTimelineItem', () => {
  it('adds the virtual scroll key without mutating a frozen parser snapshot', () => {
    const node = Object.freeze({
      node_id: 7,
      ts: 123,
      node_flow: [],
    }) as unknown as NodeInfo

    const item = createNodeTimelineItem(node, 'task-7-123-0')

    expect(item).not.toBe(node)
    expect(item).toMatchObject(node)
    expect(item._uniqueKey).toBe('task-7-123-0')
    expect(Object.prototype.hasOwnProperty.call(node, '_uniqueKey')).toBe(false)
  })
})
