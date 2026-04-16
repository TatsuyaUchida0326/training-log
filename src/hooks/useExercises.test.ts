import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useExercises } from './useExercises'

describe('useExercises', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('初回ロードでデフォルト種目が返る', () => {
    const { result } = renderHook(() => useExercises())
    expect(result.current.exercises.length).toBeGreaterThan(0)
  })

  it('デフォルト種目に「ベンチプレス」が含まれる', () => {
    const { result } = renderHook(() => useExercises())
    const names = result.current.exercises.map((e) => e.name)
    expect(names).toContain('ベンチプレス')
  })

  it('addExercise でカスタム種目を追加できる', () => {
    const { result } = renderHook(() => useExercises())
    act(() => {
      result.current.addExercise({ name: 'テスト種目', categoryId: 'その他' })
    })
    const names = result.current.exercises.map((e) => e.name)
    expect(names).toContain('テスト種目')
  })

  it('追加した種目は isCustom=true になる', () => {
    const { result } = renderHook(() => useExercises())
    act(() => {
      result.current.addExercise({ name: 'カスタム種目', categoryId: 'その他' })
    })
    const added = result.current.exercises.find((e) => e.name === 'カスタム種目')
    expect(added?.isCustom).toBe(true)
  })

  it('deleteExercise で種目を削除できる', () => {
    const { result } = renderHook(() => useExercises())
    const target = result.current.exercises.find((e) => e.name === 'ベンチプレス')!
    act(() => {
      result.current.deleteExercise(target.id)
    })
    const names = result.current.exercises.map((e) => e.name)
    expect(names).not.toContain('ベンチプレス')
  })

  it('localStorage に種目リストが保存される', () => {
    const { result } = renderHook(() => useExercises())
    act(() => {
      result.current.addExercise({ name: '保存テスト', categoryId: 'その他' })
    })
    const stored = localStorage.getItem('strength-log-exercises')
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!).some((e: { name: string }) => e.name === '保存テスト')).toBe(true)
  })

  it('getCategoryExercises でカテゴリー別に絞り込める', () => {
    const { result } = renderHook(() => useExercises())
    const chestExercises = result.current.getCategoryExercises('胸')
    expect(chestExercises.length).toBeGreaterThan(0)
    chestExercises.forEach((e) => expect(e.categoryId).toBe('胸'))
  })
})
