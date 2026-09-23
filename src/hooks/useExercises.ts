import { useState } from 'react'
import { DEFAULT_EXERCISES } from '../data/defaultExercises'
import type { Exercise, CategoryId } from '../types'
import { isArrayOf, loadStoredValue, writeStoredValue } from '../utils/storage'

export const STORAGE_KEY = 'strength-log-exercises'

function loadExercises(): Exercise[] {
  // 壊れていた場合は loadStoredValue が退避するので、ここで上書きしてもカスタム種目は失われない
  const stored = loadStoredValue<Exercise[]>(STORAGE_KEY, isArrayOf)
  if (stored) return stored
  // 初回: デフォルト種目を書き込んで返す
  save(DEFAULT_EXERCISES)
  return DEFAULT_EXERCISES
}

function save(exercises: Exercise[]): void {
  writeStoredValue(STORAGE_KEY, exercises)
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
      // undefined のフィールドはオブジェクトに含めない（localStorage の肥大化を防ぐ）
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
