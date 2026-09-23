import { useState } from 'react'
import type { Settings, WeightUnit } from '../types'
import { isPlainObject, loadStoredValue, writeStoredValue } from '../utils/storage'

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
  const stored = loadStoredValue<StoredSettings>(STORAGE_KEY, isPlainObject)
  if (!stored) return DEFAULT_SETTINGS
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
}

function saveSettings(settings: Settings): void {
  writeStoredValue(STORAGE_KEY, settings)
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
