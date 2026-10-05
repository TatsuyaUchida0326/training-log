import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { STORAGE_KEY, useContests } from './useContests'
import { CONTESTS_KEY, makeContest, readStoredContests, seedContests } from '../test/contests'

beforeEach(() => {
  localStorage.clear()
})

describe('useContests — 保存先', () => {
  it('保存キーは strength-log-contests', () => {
    expect(STORAGE_KEY).toBe('strength-log-contests')
    expect(CONTESTS_KEY).toBe('strength-log-contests')
  })
})

describe('useContests — 読み込み', () => {
  it('何も保存されていなければ空', () => {
    const { result } = renderHook(() => useContests())
    expect(result.current.contests).toEqual([])
  })

  it('保存済みの大会を読む', () => {
    const saved = [makeContest('ボディコンテスト', '2026-10-17', 'a')]
    seedContests(saved)
    const { result } = renderHook(() => useContests())
    expect(result.current.contests).toEqual(saved)
  })

  it('読み込むだけでは保存データを書き換えない', () => {
    const saved = [makeContest('ボディコンテスト', '2026-10-17', 'a')]
    seedContests(saved)
    renderHook(() => useContests())
    expect(readStoredContests()).toEqual(saved)
  })

  it('壊れた要素は捨て、正しい大会だけ読む', () => {
    const valid = makeContest('ボディコンテスト', '2026-10-17', 'a')
    seedContests([
      null,
      valid,
      { id: '', name: 'x', date: '2026-10-17' },
      { id: 'b', name: '   ', date: '2026-10-17' },
      { id: 'c', name: 'x', date: '2026-02-30' },
      'broken',
    ])
    const { result } = renderHook(() => useContests())
    expect(result.current.contests).toEqual([valid])
  })

  it('同じ id が2つあれば先の1つだけ読む', () => {
    const first = makeContest('先', '2026-10-17', 'same')
    const second = makeContest('後', '2026-11-03', 'same')
    seedContests([first, second])
    const { result } = renderHook(() => useContests())
    expect(result.current.contests).toEqual([first])
  })

  it('配列でない値が保存されていても例外を投げず、空で始める', () => {
    localStorage.setItem(CONTESTS_KEY, '{"not":"an array"}')
    const { result } = renderHook(() => useContests())
    expect(result.current.contests).toEqual([])
  })

  it('JSON として壊れた値が保存されていても例外を投げず、空で始める', () => {
    localStorage.setItem(CONTESTS_KEY, 'INVALID_JSON{{{')
    const { result } = renderHook(() => useContests())
    expect(result.current.contests).toEqual([])
  })

  it('壊れた値の後でも追加できる', () => {
    localStorage.setItem(CONTESTS_KEY, 'INVALID_JSON{{{')
    const { result } = renderHook(() => useContests())
    act(() => { result.current.addContest('ボディコンテスト', '2026-10-17') })
    expect(result.current.contests).toHaveLength(1)
    expect(readStoredContests()).toHaveLength(1)
  })

  it('localStorage を全消去（全データのリセット）したあとは空で始まる', () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17', 'a')])
    localStorage.clear()
    const { result } = renderHook(() => useContests())
    expect(result.current.contests).toEqual([])
  })
})

describe('useContests — addContest', () => {
  it('大会を追加でき、名前と日付が入る', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.addContest('ボディコンテスト', '2026-10-17') })
    expect(result.current.contests).toHaveLength(1)
    expect(result.current.contests[0]).toMatchObject({ name: 'ボディコンテスト', date: '2026-10-17' })
  })

  it('追加した大会には空でない id が付く', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.addContest('ボディコンテスト', '2026-10-17') })
    expect(typeof result.current.contests[0].id).toBe('string')
    expect(result.current.contests[0].id).not.toBe('')
  })

  it('追加した大会の id は重ならない（同じ名前・同じ日でも）', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.addContest('同じ', '2026-10-17') })
    act(() => { result.current.addContest('同じ', '2026-10-17') })
    act(() => { result.current.addContest('同じ', '2026-10-17') })
    const ids = result.current.contests.map((contest) => contest.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('名前の前後の空白は取り除く（全角空白も）', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.addContest('  ボディコンテスト  ', '2026-10-17') })
    act(() => { result.current.addContest('　秋の大会　', '2026-10-18') })
    expect(result.current.contests.map((contest) => contest.name)).toEqual([
      'ボディコンテスト',
      '秋の大会',
    ])
  })

  it('名前の途中の空白は残す', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.addContest('全日本 ボディ コンテスト', '2026-10-17') })
    expect(result.current.contests[0].name).toBe('全日本 ボディ コンテスト')
  })

  it('追加すると localStorage に保存される', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.addContest('ボディコンテスト', '2026-10-17') })
    expect(readStoredContests()).toEqual(result.current.contests)
    expect(readStoredContests()[0]).toMatchObject({ name: 'ボディコンテスト', date: '2026-10-17' })
  })

  it('保存した大会は、フックを作り直しても読める', () => {
    const { result: first } = renderHook(() => useContests())
    act(() => { first.current.addContest('ボディコンテスト', '2026-10-17') })
    const { result: second } = renderHook(() => useContests())
    expect(second.current.contests).toEqual(first.current.contests)
  })

  it('複数追加すると追加した順に並ぶ（日付順に並べ替えない）', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.addContest('あとの大会', '2026-12-01') })
    act(() => { result.current.addContest('さきの大会', '2026-10-01') })
    expect(result.current.contests.map((contest) => contest.name)).toEqual(['あとの大会', 'さきの大会'])
  })

  it('既存の大会を残したまま追加する', () => {
    seedContests([makeContest('既存', '2026-10-17', 'old')])
    const { result } = renderHook(() => useContests())
    act(() => { result.current.addContest('新規', '2026-11-03') })
    expect(result.current.contests.map((contest) => contest.name)).toEqual(['既存', '新規'])
  })

  it('過去の日付でも追加できる', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.addContest('終わった大会', '2020-01-01') })
    expect(result.current.contests).toHaveLength(1)
  })

  it.each([
    ['空の名前', '', '2026-10-17'],
    ['空白だけの名前', '   ', '2026-10-17'],
    ['全角空白だけの名前', '　　', '2026-10-17'],
    ['空の日付', 'ボディコンテスト', ''],
    ['存在しない日付', 'ボディコンテスト', '2026-02-30'],
    ['ゼロ埋めのない日付', 'ボディコンテスト', '2026-1-5'],
    ['スラッシュ区切りの日付', 'ボディコンテスト', '2026/10/17'],
  ])('%s では何もしない（状態も保存も変わらない）', (_label, name, date) => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.addContest(name, date) })
    expect(result.current.contests).toEqual([])
    expect(readStoredContests()).toEqual([])
  })

  it('不正な追加は、既にある大会を変えない', () => {
    const saved = [makeContest('既存', '2026-10-17', 'old')]
    seedContests(saved)
    const { result } = renderHook(() => useContests())
    act(() => { result.current.addContest('', '2026-11-03') })
    act(() => { result.current.addContest('新規', 'invalid') })
    expect(result.current.contests).toEqual(saved)
    expect(readStoredContests()).toEqual(saved)
  })

  it('同じ act の中で続けて追加しても両方入る', () => {
    const { result } = renderHook(() => useContests())
    act(() => {
      result.current.addContest('一つ目', '2026-10-17')
      result.current.addContest('二つ目', '2026-10-18')
    })
    expect(result.current.contests.map((contest) => contest.name)).toEqual(['一つ目', '二つ目'])
    expect(readStoredContests()).toHaveLength(2)
  })
})

describe('useContests — updateContest', () => {
  const A = makeContest('A大会', '2026-10-17', 'a')
  const B = makeContest('B大会', '2026-11-03', 'b')

  beforeEach(() => {
    seedContests([A, B])
  })

  it('名前を更新できる（他の大会・id・日付は変わらない）', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.updateContest('a', { name: '新しい名前' }) })
    expect(result.current.contests).toEqual([{ ...A, name: '新しい名前' }, B])
  })

  it('日付を更新できる（名前は変わらない）', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.updateContest('b', { date: '2026-12-24' }) })
    expect(result.current.contests).toEqual([A, { ...B, date: '2026-12-24' }])
  })

  it('名前と日付を同時に更新できる', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.updateContest('a', { name: '新しい名前', date: '2027-01-10' }) })
    expect(result.current.contests[0]).toEqual({ id: 'a', name: '新しい名前', date: '2027-01-10' })
  })

  it('更新すると localStorage にも保存される', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.updateContest('a', { name: '新しい名前' }) })
    expect(readStoredContests()).toEqual([{ ...A, name: '新しい名前' }, B])
  })

  it('更新しても並び（配列の順）は変わらない', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.updateContest('a', { date: '2030-01-01' }) })
    expect(result.current.contests.map((contest) => contest.id)).toEqual(['a', 'b'])
  })

  it('空の名前への更新は無視する', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.updateContest('a', { name: '' }) })
    expect(result.current.contests).toEqual([A, B])
    expect(readStoredContests()).toEqual([A, B])
  })

  it('空白だけの名前への更新も無視する（読み込み時に捨てられる値を作らない）', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.updateContest('a', { name: '   ' }) })
    expect(result.current.contests).toEqual([A, B])
    expect(readStoredContests()).toEqual([A, B])
  })

  it.each([
    ['空の日付', ''],
    ['存在しない日付', '2026-02-30'],
    ['ゼロ埋めのない日付', '2026-1-5'],
  ])('%s への更新は無視する', (_label, date) => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.updateContest('a', { date }) })
    expect(result.current.contests).toEqual([A, B])
    expect(readStoredContests()).toEqual([A, B])
  })

  it('存在しない id の更新は何もしない', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.updateContest('unknown', { name: '新しい名前' }) })
    expect(result.current.contests).toEqual([A, B])
  })

  it('空の更新（{}）では何も変わらない', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.updateContest('a', {}) })
    expect(result.current.contests).toEqual([A, B])
  })
})

describe('useContests — removeContest', () => {
  const A = makeContest('A大会', '2026-10-17', 'a')
  const B = makeContest('B大会', '2026-11-03', 'b')
  const C = makeContest('C大会', '2026-12-24', 'c')

  beforeEach(() => {
    seedContests([A, B, C])
  })

  it('指定した大会だけを削除する', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.removeContest('b') })
    expect(result.current.contests).toEqual([A, C])
  })

  it('削除すると localStorage からも消える', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.removeContest('b') })
    expect(readStoredContests()).toEqual([A, C])
  })

  it('最後の1件を削除すると空になる', () => {
    const { result } = renderHook(() => useContests())
    act(() => {
      result.current.removeContest('a')
      result.current.removeContest('b')
      result.current.removeContest('c')
    })
    expect(result.current.contests).toEqual([])
    expect(readStoredContests()).toEqual([])
  })

  it('存在しない id の削除は何もしない', () => {
    const { result } = renderHook(() => useContests())
    act(() => { result.current.removeContest('unknown') })
    expect(result.current.contests).toEqual([A, B, C])
    expect(readStoredContests()).toEqual([A, B, C])
  })
})
