import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useWgerExercise, clearCache } from './useWgerExercise'

// ---------- ヘルパー: wger API レスポンスのファクトリ ----------

function makeWgerSearchResponse(count: number, exerciseId: number | null) {
  return {
    suggestions: count === 0 || exerciseId === null
      ? []
      : [{ data: { id: exerciseId } }],
  }
}

function makeWgerExerciseResponse(
  muscleIds: number[],
  musclesSecondaryIds: number[],
  description: string
) {
  return {
    muscles: muscleIds.map((id) => ({ id })),
    muscles_secondary: musclesSecondaryIds.map((id) => ({ id })),
    translations: [
      {
        language: 2, // English
        description,
        name: 'Bench Press',
      },
    ],
  }
}

function makeMuscleResponse(name: string) {
  return { name_en: name }
}

function makeMyMemoryResponse(translatedText: string) {
  return {
    responseStatus: 200,
    responseData: { translatedText },
  }
}

// ---------- テスト本体 ----------

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

  // ---- 1. 初期状態 ----
  it('初期状態は status="idle", data=null である', () => {
    const { result } = renderHook(() => useWgerExercise('ベンチプレス'))

    expect(result.current.status).toBe('idle')
    expect(result.current.data).toBeNull()
  })

  // ---- 2. fetch() を呼ぶと loading になる ----
  it('fetch() を呼ぶと status が "loading" になる', async () => {
    // fetch が永遠に解決しないプロミスを返す（loading を観察するため）
    fetchMock.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useWgerExercise('ベンチプレス'))

    act(() => {
      result.current.fetch()
    })

    expect(result.current.status).toBe('loading')
  })

  // ---- 3. wger API 成功 + MyMemory 翻訳成功 → status='ok', data に値が入る ----
  it('wger API 成功 + 翻訳成功のとき status="ok", data に筋肉名と説明文が入る', async () => {
    // 呼び出し順序に合わせて fetch モックを設定
    // 1) wger search → exerciseId=1
    // 2) wger exercise detail → muscles=[1], muscles_secondary=[2], description
    // 3) muscle 1 名称取得 → Chest
    // 4) muscle 2 名称取得 → Triceps
    // 5) 筋肉名翻訳 (Chest) → 大胸筋
    // 6) 筋肉名翻訳 (Triceps) → 上腕三頭筋
    // 7) 説明文翻訳 → 「バーベルを使った胸のトレーニング」
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeWgerSearchResponse(1, 1),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeWgerExerciseResponse([1], [2], 'A chest exercise using a barbell.'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeMuscleResponse('Chest'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeMuscleResponse('Triceps'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeMyMemoryResponse('大胸筋'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeMyMemoryResponse('上腕三頭筋'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeMyMemoryResponse('バーベルを使った胸のトレーニング。'),
      })

    const { result } = renderHook(() => useWgerExercise('ベンチプレス'))

    act(() => {
      result.current.fetch()
    })

    await waitFor(() => expect(result.current.status).toBe('ok'))

    expect(result.current.data).not.toBeNull()
    expect(result.current.data!.muscles).toContain('大胸筋')
    expect(result.current.data!.musclesSecondary).toContain('上腕三頭筋')
    expect(result.current.data!.descriptionJa).toBe('バーベルを使った胸のトレーニング。')
  })

  // ---- 4. wger API が筋肉ID なしを返した場合 ----
  it('wger API が筋肉IDなしを返した場合、muscles=[], musclesSecondary=[] になり説明文は翻訳される', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeWgerSearchResponse(1, 1),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeWgerExerciseResponse([], [], 'An exercise with no muscle data.'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeMyMemoryResponse('筋肉データのないエクササイズ。'),
      })

    const { result } = renderHook(() => useWgerExercise('サンプル種目'))

    act(() => {
      result.current.fetch()
    })

    await waitFor(() => expect(result.current.status).toBe('ok'))

    expect(result.current.data!.muscles).toEqual([])
    expect(result.current.data!.musclesSecondary).toEqual([])
    expect(result.current.data!.descriptionJa).toBe('筋肉データのないエクササイズ。')
  })

  // ---- 5. wger API が結果0件を返した場合 → status='error' ----
  it('wger API が結果0件を返した場合、status="error" になる', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => makeWgerSearchResponse(0, null),
    })

    const { result } = renderHook(() => useWgerExercise('存在しない種目'))

    act(() => {
      result.current.fetch()
    })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.data).toBeNull()
  })

  // ---- 6. fetch がネットワークエラーの場合 → status='error' ----
  it('fetch がネットワークエラーのとき status="error" になる', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network Error'))

    const { result } = renderHook(() => useWgerExercise('ベンチプレス'))

    act(() => {
      result.current.fetch()
    })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.data).toBeNull()
  })

  // ---- 7. 同じ jaName で2回 fetch() しても API 呼び出しは1回（キャッシュ） ----
  it('同じ jaName で2回 fetch() しても fetch の呼び出しは1回（キャッシュが効く）', async () => {
    // 1回目の fetch シーケンス（全 API 呼び出し分）
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeWgerSearchResponse(1, 1),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeWgerExerciseResponse([1], [], 'Cached exercise.'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeMuscleResponse('Chest'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeMyMemoryResponse('大胸筋'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeMyMemoryResponse('キャッシュされたエクササイズ。'),
      })

    const { result } = renderHook(() => useWgerExercise('ベンチプレス'))

    // 1回目
    act(() => {
      result.current.fetch()
    })
    await waitFor(() => expect(result.current.status).toBe('ok'))

    const callCountAfterFirst = fetchMock.mock.calls.length

    // 2回目
    act(() => {
      result.current.fetch()
    })

    // 非同期処理が走らないよう少し待つ
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(fetchMock.mock.calls.length).toBe(callCountAfterFirst)
  })

  // ---- 8. jaName が空文字のとき fetch() を呼んでも何もしない ----
  it('jaName が空文字のとき fetch() を呼んでも何もしない（status は idle のまま）', async () => {
    const { result } = renderHook(() => useWgerExercise(''))

    act(() => {
      result.current.fetch()
    })

    // 非同期処理が走らないよう少し待つ
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(result.current.status).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
