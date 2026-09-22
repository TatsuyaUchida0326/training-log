import { useState } from 'react'
import type { Settings, WeightUnit } from '../types'

export const STORAGE_KEY = 'strength-log-settings'

export const DEFAULT_SETTINGS: Settings = {
  requiredSets: 3,
  defaultSets: 3,
  weightUnit: 'kg',
  requiredExercises: 3,
}

/** 旧形式では defaultSets が継続達成セット数、trainingDefaultSets が記録画面の初期セット数だった */
type StoredSettings = Partial<Settings> & { trainingDefaultSets?: number }

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const stored = JSON.parse(raw) as StoredSettings
    if (typeof stored.trainingDefaultSets === 'number') {
      const { trainingDefaultSets, defaultSets, ...rest } = stored
      return {
        ...DEFAULT_SETTINGS,
        ...rest,
        requiredSets: defaultSets ?? DEFAULT_SETTINGS.requiredSets,
        defaultSets: trainingDefaultSets,
      }
    }
    return { ...DEFAULT_SETTINGS, ...stored }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      saveSettings(next)
      return next
    })
  }

  function updateRequiredSets(sets: number) {
    updateSetting('requiredSets', sets)
  }

  function updateDefaultSets(sets: number) {
    updateSetting('defaultSets', sets)
  }

  function updateRequiredExercises(exercises: number) {
    updateSetting('requiredExercises', exercises)
  }

  function updateWeightUnit(unit: WeightUnit) {
    updateSetting('weightUnit', unit)
  }

  return { settings, updateRequiredSets, updateDefaultSets, updateRequiredExercises, updateWeightUnit }
}
