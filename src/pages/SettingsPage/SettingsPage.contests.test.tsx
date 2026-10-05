import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import SettingsPage from './SettingsPage'
import { makeContest, seedContests } from '../../test/contests'
import { seedRecords } from '../../test/seed'
import type { TrainingRecord } from '../../types'

/**
 * サンプルデータは大会を置き換える。登録した大会が一瞬で消えないよう、
 * 記録が0件でも「大会が1件でもあれば」サンプルデータの項目を出さない。
 * （SettingsPage.test.tsx は useSettings をモックしているため、実物のフックで描画できるよう別ファイルにしている）
 */
function renderSettingsPage() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const RECORD: TrainingRecord = {
  id: 'r1',
  date: '2026-09-20',
  exerciseId: 'bench-press',
  sets: [{ id: 's1', weight: 60, reps: 10, memo: '' }],
}

const NOTE =
  'アプリの動きを試すための約1か月分の記録を入れます。元に戻すには「全データをリセット」を使ってください。'

beforeEach(() => {
  localStorage.clear()
})

describe('SettingsPage — サンプルデータは大会を登録している人には見せない', () => {
  it('記録も大会も無ければ、従来どおり「入れる」ボタン・ラベル・説明が出る', () => {
    renderSettingsPage()
    expect(screen.getByText('サンプルデータを入れる')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '入れる' })).toBeInTheDocument()
    expect(screen.getByText(NOTE)).toBeInTheDocument()
  })

  it('大会の保存データが空配列でも、従来どおり出る', () => {
    seedContests([])
    renderSettingsPage()
    expect(screen.getByRole('button', { name: '入れる' })).toBeInTheDocument()
  })

  it('記録が0件でも、大会が1件あれば「入れる」ボタンは出ない', () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17')])
    renderSettingsPage()
    expect(screen.queryByRole('button', { name: '入れる' })).not.toBeInTheDocument()
  })

  it('大会が1件あれば、ラベルと説明文も出ない', () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17')])
    renderSettingsPage()
    expect(screen.queryByText('サンプルデータを入れる')).not.toBeInTheDocument()
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument()
  })

  it('大会が複数あっても出ない', () => {
    seedContests([makeContest('A大会', '2026-10-17'), makeContest('B大会', '2026-11-03')])
    renderSettingsPage()
    expect(screen.queryByRole('button', { name: '入れる' })).not.toBeInTheDocument()
  })

  it('過ぎた大会だけでも、登録がある以上は出ない', () => {
    seedContests([makeContest('終わった大会', '2020-01-01')])
    renderSettingsPage()
    expect(screen.queryByRole('button', { name: '入れる' })).not.toBeInTheDocument()
  })

  it('記録だけがある人にも、従来どおり出ない', () => {
    seedRecords([RECORD])
    renderSettingsPage()
    expect(screen.queryByRole('button', { name: '入れる' })).not.toBeInTheDocument()
  })

  it('記録と大会の両方がある人にも出ない', () => {
    seedRecords([RECORD])
    seedContests([makeContest('ボディコンテスト', '2026-10-17')])
    renderSettingsPage()
    expect(screen.queryByRole('button', { name: '入れる' })).not.toBeInTheDocument()
  })

  it('大会があっても、書き出し・復元・リセットの行は残る', () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17')])
    renderSettingsPage()
    expect(screen.getByRole('button', { name: '書き出す' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ファイルを選ぶ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '全データをリセット' })).toBeInTheDocument()
  })
})
