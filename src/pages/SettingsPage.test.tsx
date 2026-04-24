import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SettingsPage from './SettingsPage'

const mockUpdateDefaultSets = vi.fn()
const mockUpdateTrainingDefaultSets = vi.fn()
const mockUpdateRequiredExercises = vi.fn()
const mockUpdateWeightUnit = vi.fn()

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({
    settings: { defaultSets: 3, trainingDefaultSets: 3, weightUnit: 'kg', requiredExercises: 3 },
    updateDefaultSets: mockUpdateDefaultSets,
    updateTrainingDefaultSets: mockUpdateTrainingDefaultSets,
    updateRequiredExercises: mockUpdateRequiredExercises,
    updateWeightUnit: mockUpdateWeightUnit,
  }),
}))

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('「継続達成種目数」ラベルが表示される', () => {
    render(<SettingsPage />)
    expect(screen.getByText('継続達成種目数')).toBeInTheDocument()
  })

  it('「継続達成セット数」ラベルが表示される', () => {
    render(<SettingsPage />)
    expect(screen.getByText('継続達成セット数')).toBeInTheDocument()
  })

  it('「デフォルトセット数」ラベルが表示される', () => {
    render(<SettingsPage />)
    expect(screen.getByText('デフォルトセット数')).toBeInTheDocument()
  })

  it('「重量単位」ラベルが表示される', () => {
    render(<SettingsPage />)
    expect(screen.getByText('重量単位')).toBeInTheDocument()
  })

  it('selectが3つ表示される', () => {
    render(<SettingsPage />)
    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(3)
  })

  it('継続達成種目数selectが1〜10の選択肢を持つ', () => {
    render(<SettingsPage />)
    const selects = screen.getAllByRole('combobox')
    const options = Array.from((selects[0] as HTMLSelectElement).options).map(
      (o) => Number(o.value)
    )
    expect(options).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('継続達成セット数selectが3〜10の選択肢を持つ', () => {
    render(<SettingsPage />)
    const selects = screen.getAllByRole('combobox')
    const options = Array.from((selects[1] as HTMLSelectElement).options).map(
      (o) => Number(o.value)
    )
    expect(options).toEqual([3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('デフォルトセット数selectが1〜10の選択肢を持つ', () => {
    render(<SettingsPage />)
    const selects = screen.getAllByRole('combobox')
    const options = Array.from((selects[2] as HTMLSelectElement).options).map(
      (o) => Number(o.value)
    )
    expect(options).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('継続達成種目数selectの変更でupdateRequiredExercisesが呼ばれる', async () => {
    render(<SettingsPage />)
    const selects = screen.getAllByRole('combobox')
    await userEvent.selectOptions(selects[0], '5')
    expect(mockUpdateRequiredExercises).toHaveBeenCalledWith(5)
  })

  it('継続達成セット数selectの変更でupdateDefaultSetsが呼ばれる', async () => {
    render(<SettingsPage />)
    const selects = screen.getAllByRole('combobox')
    await userEvent.selectOptions(selects[1], '5')
    expect(mockUpdateDefaultSets).toHaveBeenCalledWith(5)
  })

  it('デフォルトセット数selectの変更でupdateTrainingDefaultSetsが呼ばれる', async () => {
    render(<SettingsPage />)
    const selects = screen.getAllByRole('combobox')
    await userEvent.selectOptions(selects[2], '4')
    expect(mockUpdateTrainingDefaultSets).toHaveBeenCalledWith(4)
  })

  it('kg・lbsボタンが表示される', () => {
    render(<SettingsPage />)
    expect(screen.getByRole('button', { name: 'kg' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'lbs' })).toBeInTheDocument()
  })

  it('kgボタンクリックでupdateWeightUnit("kg")が呼ばれる', async () => {
    render(<SettingsPage />)
    await userEvent.click(screen.getByRole('button', { name: 'kg' }))
    expect(mockUpdateWeightUnit).toHaveBeenCalledWith('kg')
  })

  it('lbsボタンクリックでupdateWeightUnit("lbs")が呼ばれる', async () => {
    render(<SettingsPage />)
    await userEvent.click(screen.getByRole('button', { name: 'lbs' }))
    expect(mockUpdateWeightUnit).toHaveBeenCalledWith('lbs')
  })

  it('継続達成種目数を変更すると更新関数が呼ばれる', async () => {
    render(<SettingsPage />)
    const selects = screen.getAllByRole('combobox')
    await userEvent.selectOptions(selects[0], '7')
    expect(mockUpdateRequiredExercises).toHaveBeenCalledWith(7)
  })

  it('デフォルトセット数を変更すると更新関数が呼ばれる', async () => {
    render(<SettingsPage />)
    const selects = screen.getAllByRole('combobox')
    await userEvent.selectOptions(selects[2], '5')
    expect(mockUpdateTrainingDefaultSets).toHaveBeenCalledWith(5)
  })
})
