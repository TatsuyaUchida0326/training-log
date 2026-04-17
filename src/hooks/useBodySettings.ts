import { useState } from 'react'
import type { BodySettings } from '../types'

const STORAGE_KEY = 'strength-log-body-settings'

const DEFAULT_SETTINGS: BodySettings = {
  height: 0,
  targetWeight: 0,
  muscleMassUnit: '%',
}

function load(): BodySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS
}

function persist(settings: BodySettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
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
