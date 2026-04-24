import { useState } from 'react'
import { DEFAULT_EXERCISES } from '../data/defaultExercises'
import type { Exercise, CategoryId } from '../types'

const STORAGE_KEY = 'strength-log-exercises'

function loadExercises(): Exercise[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Exercise[]
  } catch {
    // ignore
  }
  // 初回: デフォルト種目を書き込んで返す
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_EXERCISES))
  return DEFAULT_EXERCISES
}

function save(exercises: Exercise[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises))
}

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>(loadExercises)

  function addExercise(params: {
    name: string
    categoryId: CategoryId
    muscles?: string[]
    musclesSecondary?: string[]
    description?: string
  }) {
    const newExercise: Exercise = {
      id: `custom-${Date.now()}`,
      name: params.name,
      categoryId: params.categoryId,
      isCustom: true,
      ...(params.muscles !== undefined && { muscles: params.muscles }),
      ...(params.musclesSecondary !== undefined && { musclesSecondary: params.musclesSecondary }),
      ...(params.description !== undefined && { description: params.description }),
    }
    setExercises((prev) => {
      const next = [...prev, newExercise]
      save(next)
      return next
    })
  }

  function deleteExercise(id: string) {
    setExercises((prev) => {
      const next = prev.filter((e) => e.id !== id)
      save(next)
      return next
    })
  }

  function getCategoryExercises(categoryId: CategoryId): Exercise[] {
    return exercises.filter((e) => e.categoryId === categoryId)
  }

  return { exercises, addExercise, deleteExercise, getCategoryExercises }
}
