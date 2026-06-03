import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CHUNK_RELOAD_KEY, handleChunkLoad, isChunkLoadError } from '../utils/lazyWithReload'

describe('isChunkLoadError', () => {
  it('Failed to fetch dynamically imported module を検知する', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: foo.js'))).toBe(true)
  })

  it('Failed to load module script を検知する', () => {
    expect(isChunkLoadError(new Error('Failed to load module script: ...'))).toBe(true)
  })

  it('Importing a module script failed を検知する', () => {
    expect(isChunkLoadError(new Error('Importing a module script failed'))).toBe(true)
  })

  it('無関係なエラーは検知しない', () => {
    expect(isChunkLoadError(new Error('Network error'))).toBe(false)
    expect(isChunkLoadError(new TypeError('undefined is not a function'))).toBe(false)
  })

  it('Error 以外の値も文字列化して判定する', () => {
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(true)
    expect(isChunkLoadError(null)).toBe(false)
  })
})

describe('handleChunkLoad', () => {
  let reloadSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sessionStorage.clear()
    reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    })
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('チャンクロード失敗時：初回はリロードされ、リロード済みフラグが立つ', async () => {
    const error = new Error('Failed to fetch dynamically imported module: x.js')
    const factory = vi.fn().mockRejectedValue(error)

    // resolve しない Promise を返すので race で打ち切る
    const result = handleChunkLoad(factory)
    await Promise.race([result, new Promise(r => setTimeout(r, 10))])

    expect(reloadSpy).toHaveBeenCalledOnce()
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBe('1')
  })

  it('チャンクロード失敗時：すでにリロード済みなら再リロードせずエラーを投げる', async () => {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
    const error = new Error('Failed to fetch dynamically imported module: x.js')
    const factory = vi.fn().mockRejectedValue(error)

    await expect(handleChunkLoad(factory)).rejects.toBe(error)
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('チャンクロード以外のエラーはリロードせずエラーを投げる', async () => {
    const error = new Error('Network down')
    const factory = vi.fn().mockRejectedValue(error)

    await expect(handleChunkLoad(factory)).rejects.toBe(error)
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('成功時にリロード済みフラグをクリアする', async () => {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
    const mod = { default: 'ok' }
    const factory = vi.fn().mockResolvedValue(mod)

    await expect(handleChunkLoad(factory)).resolves.toBe(mod)
    expect(reloadSpy).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBeNull()
  })
})
