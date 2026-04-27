import { useState, useCallback } from 'react'
import { EXERCISE_MUSCLE_MAP } from '../data/exerciseMuscleMap'

export type WgerStatus = 'idle' | 'loading' | 'ok' | 'error'

// 種目詳細モーダルに表示するデータ型
export interface WgerExerciseData {
  muscles: string[]          // 対象筋肉
  musclesSecondary: string[] // 補助筋
  descriptionJa: string      // 日本語説明文
  thumbnailUrl?: string      // Wikipedia サムネイル URL（なければ空文字）
}

// セッション内でAPIレスポンスを再利用するためのメモリキャッシュ（種目名 → データ）
const cache = new Map<string, WgerExerciseData>()

// テスト間でキャッシュ汚染を防ぐためにexport（beforeEachで呼び出す）
export function clearCache(): void {
  cache.clear()
}

// 日本語Wikipedia REST APIから種目の説明文とサムネイル画像URLを取得する
// 無料・認証不要・日本語テキストを直接返すため翻訳処理が不要
async function fetchExternalData(jaName: string): Promise<{ descriptionJa: string; thumbnailUrl: string }> {
  const encoded = encodeURIComponent(jaName)
  const res = await fetch(`https://ja.wikipedia.org/api/rest_v1/page/summary/${encoded}`)
  if (!res.ok) return { descriptionJa: '', thumbnailUrl: '' } // 記事が存在しない場合は空文字を返す（非表示にする）
  const json: unknown = await res.json()
  const record = typeof json === 'object' && json !== null && !Array.isArray(json)
    ? (json as Record<string, unknown>)
    : null
  const extract = record && typeof record.extract === 'string' ? record.extract : undefined
  const thumbnail = record && typeof record.thumbnail === 'object' && record.thumbnail !== null
    ? (record.thumbnail as Record<string, unknown>)
    : null
  const thumbnailUrl = thumbnail && typeof thumbnail.source === 'string' ? thumbnail.source : ''
  return { descriptionJa: extract ?? '', thumbnailUrl }
}

// 筋肉情報（静的）＋説明文・画像（静的 or Wikipedia）を組み合わせてデータを構築する
// description が静的マップにある場合はAPIを呼ばずにスキップする（thumbnailUrl は空文字）
async function loadExerciseData(jaName: string): Promise<WgerExerciseData> {
  const muscleData = EXERCISE_MUSCLE_MAP[jaName] ?? { muscles: [], musclesSecondary: [] }
  if (muscleData.description) {
    // 静的説明文がある場合は Wikipedia フェッチをスキップ
    return {
      muscles: muscleData.muscles,
      musclesSecondary: muscleData.musclesSecondary,
      descriptionJa: muscleData.description,
      thumbnailUrl: '',
    }
  }
  const { descriptionJa, thumbnailUrl } = await fetchExternalData(jaName)
  return {
    muscles: muscleData.muscles,
    musclesSecondary: muscleData.musclesSecondary,
    descriptionJa,
    thumbnailUrl,
  }
}

export function useWgerExercise(jaName: string): {
  status: WgerStatus
  data: WgerExerciseData | null
  fetch: () => void
} {
  const [status, setStatus] = useState<WgerStatus>('idle')
  const [data, setData] = useState<WgerExerciseData | null>(null)

  const fetchData = useCallback(() => {
    // 空文字の場合はカスタム種目（API不要）または呼び出し不要なケース
    if (!jaName) return

    // 同一種目の2回目以降はキャッシュから返してAPIを叩かない
    const cached = cache.get(jaName)
    if (cached) {
      setData(cached)
      setStatus('ok')
      return
    }

    setStatus('loading')

    loadExerciseData(jaName)
      .then((result) => {
        cache.set(jaName, result)
        setData(result)
        setStatus('ok')
      })
      .catch(() => {
        setData(null)
        setStatus('error')
      })
  }, [jaName])

  return { status, data, fetch: fetchData }
}
