import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSeedState } from './seed'
import { saveState, STORAGE_KEY } from './storage'

afterEach(() => vi.unstubAllGlobals())

describe('storage persistence', () => {
  it('keeps the last good localStorage value when a later save fails', () => {
    const values = new Map<string, string>([[STORAGE_KEY, 'last-good-value']])
    vi.stubGlobal('window', { localStorage: { setItem: () => { throw new Error('quota exceeded') }, getItem: (key: string) => values.get(key), removeItem: (key: string) => values.delete(key) } })
    const result = saveState(createSeedState())
    expect(result).toMatchObject({ persisted: false })
    expect(result.warning).toContain('last saved demo data')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('last-good-value')
  })
})
