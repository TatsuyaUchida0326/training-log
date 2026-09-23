import { useState } from 'react'
import type { BodySettings } from '../types'
import { isPlainObject, loadStoredValue, writeStoredValue } from '../utils/storage'

export const STORAGE_KEY = 'strength-log-body-settings'

export const DEFAULT_BODY_SETTINGS: BodySettings = {
  height: 0,
  targetWeight: 0,
  muscleMassUnit: '%',
  targetBodyFat: 0,
}

function load(): BodySettings {
  const stored = loadStoredValue<Partial<BodySettings>>(STORAGE_KEY, isPlainObject)
  if (!stored) return DEFAULT_BODY_SETTINGS
  return { ...DEFAULT_BODY_SETTINGS, ...stored }
}

function persist(settings: BodySettings): void {
  writeStoredValue(STORAGE_KEY, settings)
}

export function useBodySettings() {
  const [settings, setSettings] = useState<BodySettings>(load)

  function updateSettings(updates: Partial<BodySettings>): void {
    setSettings((prev) => {
      const next = { ...prev, ...updates }
      persist(next)
      return next
    })
  }

  return { settings, updateSettings }
}
