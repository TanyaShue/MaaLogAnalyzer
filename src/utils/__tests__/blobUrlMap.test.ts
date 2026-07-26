import { afterEach, describe, expect, it, vi } from 'vitest'

import { replaceBlobUrl } from '../blobUrlMap'

describe('replaceBlobUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('revokes the previous URL when replacing a duplicate key', () => {
    vi.spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:first')
      .mockReturnValueOnce('blob:second')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const target = new Map<string, string>()

    replaceBlobUrl(target, 'same-key', new Blob(['first']))
    replaceBlobUrl(target, 'same-key', new Blob(['second']))

    expect(target.get('same-key')).toBe('blob:second')
    expect(revoke).toHaveBeenCalledOnce()
    expect(revoke).toHaveBeenCalledWith('blob:first')
  })

  it('keeps the previous URL when creating the replacement fails', () => {
    vi.spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:first')
      .mockImplementationOnce(() => {
        throw new Error('allocation failed')
      })
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const target = new Map<string, string>()

    replaceBlobUrl(target, 'same-key', new Blob(['first']))
    expect(() => replaceBlobUrl(target, 'same-key', new Blob(['second']))).toThrow('allocation failed')

    expect(target.get('same-key')).toBe('blob:first')
    expect(revoke).not.toHaveBeenCalled()
  })
})
