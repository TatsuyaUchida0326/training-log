import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useWgerExercise, clearCache } from './useWgerExercise'

function makeWikipediaResponse(extract: string) {
  return { type: 'standard', extract }
}

describe('useWgerExercise', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    clearCache()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('初期状態は status="idle", data=null である', () => {
    const { result } = renderHook(() => useWgerExercise('ベンチプレス'))
    expect(result.current.status).toBe('idle')
    expect(result.current.data).toBeNull()
  })

  it('fetch() を呼ぶと status が "loading" になる', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useWgerExercise('ベンチプレス'))
    act(() => { result.current.fetch() })
    expect(result.current.status).toBe('loading')
  })

  it('Wikipedia API 成功のとき status="ok" になり静的筋肉データと説明文が入る', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => makeWikipediaResponse('上半身を鍛えるウェイトトレーニングの種目。'),
    })

    const { result } = renderHook(() => useWgerExercise('ベンチプレス'))
    act(() => { result.current.fetch() })
    await waitFor(() => expect(result.current.status).toBe('ok'))

    expect(result.current.data).not.toBeNull()
    expect(result.current.data!.muscles).toContain('大胸筋')
    expect(result.current.data!.musclesSecondary).toContain('上腕三頭筋')
    expect(result.current.data!.descriptionJa).toBe('上半身を鍛えるウェイトトレーニングの種目。')
  })

  it('Wikipedia API が 404 を返した場合は descriptionJa="" で status="ok" になる', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 })

    const { result } = renderHook(() => useWgerExercise('ベンチプレス'))
    act(() => { result.current.fetch() })
    await waitFor(() => expect(result.current.status).toBe('ok'))

    expect(result.current.data!.descriptionJa).toBe('')
    expect(result.current.data!.muscles).toContain('大胸筋')
  })

  it('Wikipedia API がネットワークエラーのとき status="error" になる', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network Error'))

    const { result } = renderHook(() => useWgerExercise('スクワット'))
    act(() => { result.current.fetch() })
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.data).toBeNull()
  })

  it('EXERCISE_MUSCLE_MAP にない種目は muscles=[], musclesSecondary=[] になる', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => makeWikipediaResponse('説明文。'),
    })

    const { result } = renderHook(() => useWgerExercise('存在しない種目'))
    act(() => { result.current.fetch() })
    await waitFor(() => expect(result.current.status).toBe('ok'))

    expect(result.current.data!.muscles).toEqual([])
    expect(result.current.data!.musclesSecondary).toEqual([])
  })

  it('同じ jaName で2回 fetch() しても Wikipedia API 呼び出しは1回（キャッシュが効く）', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => makeWikipediaResponse('キャッシュテスト。'),
    })

    const { result } = renderHook(() => useWgerExercise('ベンチプレス'))
    act(() => { result.current.fetch() })
    await waitFor(() => expect(result.current.status).toBe('ok'))

    const callCount = fetchMock.mock.calls.length

    act(() => { result.current.fetch() })
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(fetchMock.mock.calls.length).toBe(callCount)
  })

  it('jaName が空文字のとき fetch() を呼んでも何もしない（status は idle のまま）', async () => {
    const { result } = renderHook(() => useWgerExercise(''))
    act(() => { result.current.fetch() })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(result.current.status).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
