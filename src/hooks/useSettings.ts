import { useState } from 'react'
import type { Settings } from '../types'

const STORAGE_KEY = 'strength-log-settings'

const DEFAULT_SETTINGS: Settings = {
  defaultSets: 3,
  trainingDefaultSets: 3,
  weightUnit: 'kg',
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  function updateDefaultSets(n: number) {
    setSettings((prev) => {
      const next = { ...prev, defaultSets: n }
      saveSettings(next)
      return next
    })
  }

  function updateTrainingDefaultSets(n: number) {
    setSettings((prev) => {
      const next = { ...prev, trainingDefaultSets: n }
      saveSettings(next)
      return next
    })
  }

  function updateWeightUnit(unit: 'kg' | 'lbs') {
    setSettings((prev) => {
      const next = { ...prev, weightUnit: unit }
      saveSettings(next)
      return next
    })
  }

  return { settings, updateDefaultSets, updateTrainingDefaultSets, updateWeightUnit }
}
