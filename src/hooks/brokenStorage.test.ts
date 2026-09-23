import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useBodyRecords } from './useBodyRecords'
import { DEFAULT_BODY_SETTINGS, useBodySettings } from './useBodySettings'
import { useExercises } from './useExercises'
import { DEFAULT_SETTINGS, useSettings } from './useSettings'
import { useTrainingRecords } from './useTrainingRecords'
import { DEFAULT_EXERCISES } from '../data/defaultExercises'
import {
  BODY_RECORDS_KEY,
  BODY_SETTINGS_KEY,
  EXERCISES_KEY,
  RECORDS_KEY,
  SETTINGS_KEY,
} from '../test/storageKeys'

/** 保存データが壊れているときの共通の期待値をまとめる */
interface BrokenStorageCase {
  hookName: string
  key: string
  /** JSON としては読めるが形が違う値（配列であるべき場所にオブジェクト、など） */
  wrongShape: string
  readValue: () => unknown
  expected: unknown
}

const INVALID_JSON = 'INVALID_JSON{{{'

const CASES: BrokenStorageCase[] = [
  {
    hookName: 'useTrainingRecords',
    key: RECORDS_KEY,
    wrongShape: '{"not":"an array"}',
    readValue: () => renderHook(() => useTrainingRecords()).result.current.records,
    expected: [],
  },
  {
    hookName: 'useExercises',
    key: EXERCISES_KEY,
    wrongShape: '{"not":"an array"}',
    readValue: () => renderHook(() => useExercises()).result.current.exercises,
    expected: DEFAULT_EXERCISES,
  },
  {
    hookName: 'useBodyRecords',
    key: BODY_RECORDS_KEY,
    wrongShape: '{"not":"an array"}',
    readValue: () => renderHook(() => useBodyRecords()).result.current.records,
    expected: [],
  },
  {
    hookName: 'useSettings',
    key: SETTINGS_KEY,
    wrongShape: '["not","an object"]',
    readValue: () => renderHook(() => useSettings()).result.current.settings,
    expected: DEFAULT_SETTINGS,
  },
  {
    hookName: 'useBodySettings',
    key: BODY_SETTINGS_KEY,
    wrongShape: '["not","an object"]',
    readValue: () => renderHook(() => useBodySettings()).result.current.settings,
    expected: DEFAULT_BODY_SETTINGS,
  },
]

/** 退避キー（`<キー>-broken-<ISO日時>`）に元の文字列が移っていること */
function findQuarantinedValues(key: string): string[] {
  return Object.keys(localStorage)
    .filter((storedKey) => storedKey.startsWith(`${key}-broken-`))
    .map((storedKey) => localStorage.getItem(storedKey) ?? '')
}

describe('保存データが壊れていてもフックが落ちない', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe.each(CASES)('$hookName', ({ key, wrongShape, readValue, expected }) => {
    it('壊れた JSON でも例外を投げず既定値になる', () => {
      localStorage.setItem(key, INVALID_JSON)
      expect(readValue).not.toThrow()
      expect(readValue()).toEqual(expected)
    })

    it('壊れた JSON は退避キーに移される', () => {
      localStorage.setItem(key, INVALID_JSON)
      readValue()
      expect(findQuarantinedValues(key)).toContain(INVALID_JSON)
    })

    it('形の違う値でも例外を投げず既定値になる', () => {
      localStorage.setItem(key, wrongShape)
      expect(readValue).not.toThrow()
      expect(readValue()).toEqual(expected)
    })

    it('形の違う値は退避キーに移される', () => {
      localStorage.setItem(key, wrongShape)
      readValue()
      expect(findQuarantinedValues(key)).toContain(wrongShape)
    })

    it('退避後は元のキーに壊れた値が残らない', () => {
      localStorage.setItem(key, INVALID_JSON)
      readValue()
      expect(localStorage.getItem(key)).not.toBe(INVALID_JSON)
    })
  })

  it('useExercises は壊れた値を退避してからデフォルト種目で始める（カスタム種目を黙って消さない）', () => {
    const customExercises = JSON.stringify([
      { id: 'custom-1', name: '自作種目', categoryId: 'その他', isCustom: true },
    ])
    // 配列の前半だけが書き込まれたような、途中で切れたデータ
    const truncated = customExercises.slice(0, 20)
    localStorage.setItem(EXERCISES_KEY, truncated)

    const { result } = renderHook(() => useExercises())

    expect(result.current.exercises).toEqual(DEFAULT_EXERCISES)
    expect(findQuarantinedValues(EXERCISES_KEY)).toContain(truncated)
  })
})
