import { useState, useCallback } from 'react'
import { EXERCISE_MUSCLE_MAP } from '../data/exerciseMuscleMap'

export type WgerStatus = 'idle' | 'loading' | 'ok' | 'error'

export interface WgerExerciseData {
  muscles: string[]
  musclesSecondary: string[]
  descriptionJa: string
}

const cache = new Map<string, WgerExerciseData>()

export function clearCache(): void {
  cache.clear()
}

async function fetchDescription(jaName: string): Promise<string> {
  const encoded = encodeURIComponent(jaName)
  const res = await fetch(`https://ja.wikipedia.org/api/rest_v1/page/summary/${encoded}`)
  if (!res.ok) return ''
  const json = await res.json() as { extract?: string }
  return json.extract ?? ''
}

async function loadExerciseData(jaName: string): Promise<WgerExerciseData> {
  const muscleData = EXERCISE_MUSCLE_MAP[jaName] ?? { muscles: [], musclesSecondary: [] }
  const descriptionJa = await fetchDescription(jaName)
  return {
    muscles: muscleData.muscles,
    musclesSecondary: muscleData.musclesSecondary,
    descriptionJa,
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
    if (!jaName) return

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
