import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  confirmAndResetAllData,
  isArrayOf,
  isPlainObject,
  loadStoredValue,
  peekStoredValue,
  writeStoredValue,
} from './storage'

const KEY = 'test-key'

describe('isPlainObject', () => {
  it('オブジェクトだけを通す', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject(null)).toBe(false)
    expect(isPlainObject('{}')).toBe(false)
  })
})

describe('isArrayOf', () => {
  it('配列だけを通す', () => {
    expect(isArrayOf([])).toBe(true)
    expect(isArrayOf({})).toBe(false)
    expect(isArrayOf(null)).toBe(false)
  })
})

describe('peekStoredValue', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('保存されていなければ null', () => {
    expect(peekStoredValue(KEY, isArrayOf)).toBeNull()
  })

  it('保存されていれば読める', () => {
    localStorage.setItem(KEY, JSON.stringify([1, 2]))
    expect(peekStoredValue(KEY, isArrayOf)).toEqual([1, 2])
  })

  it('壊れていても退避せず null を返す', () => {
    localStorage.setItem(KEY, 'INVALID_JSON{{{')
    expect(peekStoredValue(KEY, isArrayOf)).toBeNull()
    expect(localStorage.getItem(KEY)).toBe('INVALID_JSON{{{')
  })
})

describe('loadStoredValue', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('保存されていなければ null（退避キーも作らない）', () => {
    expect(loadStoredValue(KEY, isArrayOf)).toBeNull()
    expect(Object.keys(localStorage)).toHaveLength(0)
  })

  it('JSON の null は形が違うので退避される', () => {
    localStorage.setItem(KEY, 'null')
    expect(loadStoredValue(KEY, isArrayOf)).toBeNull()
    expect(Object.keys(localStorage).some((key) => key.startsWith(`${KEY}-broken-`))).toBe(true)
  })

  it('退避キーは元のキー名を接頭辞に持つ', () => {
    localStorage.setItem(KEY, 'INVALID_JSON{{{')
    loadStoredValue(KEY, isArrayOf)
    const brokenKey = Object.keys(localStorage).find((key) => key.startsWith(`${KEY}-broken-`))
    expect(brokenKey).toBeDefined()
    expect(localStorage.getItem(brokenKey!)).toBe('INVALID_JSON{{{')
  })
})

describe('writeStoredValue', () => {
  let alertSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    localStorage.clear()
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('値を JSON にして保存する', () => {
    writeStoredValue(KEY, [1, 2])
    expect(localStorage.getItem(KEY)).toBe('[1,2]')
  })

  it('保存に失敗したら利用者に伝える（握りつぶさない）', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() => writeStoredValue(KEY, [1, 2])).not.toThrow()
    expect(alertSpy).toHaveBeenCalledWith(
      '保存できませんでした。ブラウザの空き容量を確認してください。',
    )
  })

  it('退避に失敗したときは元の値を消さない', () => {
    localStorage.setItem(KEY, 'INVALID_JSON{{{')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    loadStoredValue(KEY, isArrayOf)

    expect(localStorage.getItem(KEY)).toBe('INVALID_JSON{{{')
  })
})

describe('confirmAndResetAllData', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>
  let reloadMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    reloadMock = vi.fn()
    // window.location は読み取り専用のため Object.defineProperty で上書きする
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('確認して OK なら全消去してリロードする', () => {
    confirmSpy.mockReturnValue(true)
    localStorage.setItem(KEY, '[]')

    confirmAndResetAllData()

    expect(localStorage.getItem(KEY)).toBeNull()
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('キャンセルなら何もしない', () => {
    localStorage.setItem(KEY, '[]')

    confirmAndResetAllData()

    expect(localStorage.getItem(KEY)).toBe('[]')
    expect(reloadMock).not.toHaveBeenCalled()
  })
})
