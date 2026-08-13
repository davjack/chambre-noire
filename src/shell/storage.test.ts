import { afterEach, describe, expect, it } from 'vitest'

import { parseVisited, readStored, writeStored } from './storage'

function useStorage(implementation: Storage | undefined | 'throwing') {
  if (implementation === 'throwing') {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError')
      },
    })
    return
  }
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: implementation,
    writable: true,
  })
}

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  }
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage')
})

describe('parseVisited', () => {
  it('reads a well-formed list', () => {
    expect(parseVisited('["wow","the-hole"]')).toEqual(new Set(['wow', 'the-hole']))
  })

  it('treats nothing as nothing', () => {
    expect(parseVisited(null)).toEqual(new Set())
    expect(parseVisited('')).toEqual(new Set())
  })

  it('survives everything a storage slot can actually contain', () => {
    for (const rubbish of ['{', 'null', '"wow"', '42', '{"a":1}', '[[]]', 'undefined']) {
      expect(parseVisited(rubbish)).toBeInstanceOf(Set)
    }
  })

  it('drops non-string entries instead of letting them reach the progress bar', () => {
    expect(parseVisited('["wow",null,3,{"x":1},"the-hole"]')).toEqual(
      new Set(['wow', 'the-hole']),
    )
  })
})

describe('readStored / writeStored', () => {
  it('round-trips through a working storage', () => {
    useStorage(memoryStorage())
    writeStored('locale', 'fr')
    expect(readStored('locale')).toBe('fr')
  })

  it('namespaces its keys so it cannot collide with another app on the origin', () => {
    const storage = memoryStorage()
    useStorage(storage)
    writeStored('locale', 'fr')
    expect(storage.getItem('petit-trou:locale')).toBe('fr')
    expect(storage.getItem('locale')).toBeNull()
  })

  it('stays silent when storage throws — Safari private mode', () => {
    useStorage('throwing')
    expect(() => writeStored('locale', 'fr')).not.toThrow()
    expect(readStored('locale')).toBeNull()
  })

  it('stays silent when there is no storage at all', () => {
    useStorage(undefined)
    expect(() => writeStored('locale', 'fr')).not.toThrow()
    expect(readStored('locale')).toBeNull()
  })
})
