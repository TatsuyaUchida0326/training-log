import { useState, useCallback } from 'react'
import { EXERCISE_EN_MAP } from '../data/exerciseEnMap'

export type WgerStatus = 'idle' | 'loading' | 'ok' | 'error'

export interface WgerExerciseData {
  muscles: string[]
  musclesSecondary: string[]
  descriptionJa: string
}

// Module-level cache: jaName -> WgerExerciseData
const cache = new Map<string, WgerExerciseData>()

export function clearCache(): void {
  cache.clear()
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim()
}

async function translateToJa(text: string): Promise<string> {
  const encoded = encodeURIComponent(text)
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|ja`
  )
  const json = await res.json()
  return (json as { responseData: { translatedText: string } }).responseData.translatedText
}

async function fetchMuscleName(muscleId: number): Promise<string> {
  const res = await fetch(`https://wger.de/api/v2/muscle/${muscleId}/?format=json`)
  const json = await res.json()
  return (json as { name_en: string }).name_en
}

async function loadExerciseData(jaName: string): Promise<WgerExerciseData> {
  const enName = EXERCISE_EN_MAP[jaName] ?? jaName
  const encodedEnName = encodeURIComponent(enName)

  // Step a: search
  const searchRes = await fetch(
    `https://wger.de/api/v2/exercise/search/?term=${encodedEnName}&language=english&format=json`
  )
  const searchJson = await searchRes.json()
  const suggestions = (searchJson as { suggestions: Array<{ data: { id: number } }> }).suggestions

  if (suggestions.length === 0) {
    throw new Error('No exercise found')
  }

  const exerciseId = suggestions[0].data.id

  // Step b: exercise detail
  const detailRes = await fetch(
    `https://wger.de/api/v2/exerciseinfo/${exerciseId}/?format=json`
  )
  const detailJson = await detailRes.json()
  const detail = detailJson as {
    muscles: Array<{ id: number }>
    muscles_secondary: Array<{ id: number }>
    translations: Array<{ language: number; description: string; name: string }>
  }

  const muscleIds = detail.muscles.map((m) => m.id)
  const musclesSecondaryIds = detail.muscles_secondary.map((m) => m.id)
  const translation = detail.translations.find((t) => t.language === 2)
  const rawDescription = translation?.description ?? ''
  const cleanDescription = stripHtml(rawDescription)

  // Step c & d: fetch muscle names
  const muscleNamePromises = muscleIds.map((id) => fetchMuscleName(id))
  const musclesSecondaryNamePromises = musclesSecondaryIds.map((id) => fetchMuscleName(id))

  const muscleNamesEn = await Promise.all(muscleNamePromises)
  const musclesSecondaryNamesEn = await Promise.all(musclesSecondaryNamePromises)

  // Step e: translate muscle names
  const muscleTranslatePromises = muscleNamesEn.map((name) => translateToJa(name))
  const musclesSecondaryTranslatePromises = musclesSecondaryNamesEn.map((name) => translateToJa(name))

  const muscles = await Promise.all(muscleTranslatePromises)
  const musclesSecondary = await Promise.all(musclesSecondaryTranslatePromises)

  // Step f: translate description
  const descriptionJa = cleanDescription ? await translateToJa(cleanDescription) : ''

  return { muscles, musclesSecondary, descriptionJa }
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

    // Return cached result immediately
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
