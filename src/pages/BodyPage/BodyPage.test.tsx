import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { PageHeaderProvider } from '../../contexts/PageHeaderContext'
import BodyPage from './BodyPage'

function renderBodyPage() {
  return render(
    <PageHeaderProvider>
      <BodyPage />
    </PageHeaderProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('BodyPage - 表示', () => {
  it('「基本情報」カードが表示される', () => {
    renderBodyPage()
    expect(screen.getByText('基本情報')).toBeInTheDocument()
  })

  it('「計測値」カードが表示される', () => {
    renderBodyPage()
    expect(screen.getByText('計測値')).toBeInTheDocument()
  })

  it('「計算値」カードが表示される', () => {
    renderBodyPage()
    expect(screen.getByText('計算値')).toBeInTheDocument()
  })

  it('身長・目標体重・目標体脂肪率の入力欄が表示される', () => {
    renderBodyPage()
    expect(screen.getByText('身長')).toBeInTheDocument()
    expect(screen.getByText('目標体重')).toBeInTheDocument()
    expect(screen.getByText('目標体脂肪率')).toBeInTheDocument()
  })

  it('体重・体脂肪・筋肉量・ウエストの入力欄が表示される', () => {
    renderBodyPage()
    expect(screen.getByText('体重')).toBeInTheDocument()
    expect(screen.getByText('体脂肪')).toBeInTheDocument()
    expect(screen.getByText('筋肉量')).toBeInTheDocument()
    expect(screen.getByText('ウエスト')).toBeInTheDocument()
  })

  it('BMI・体脂肪量・除脂肪体重・筋重量の計算値ラベルが表示される', () => {
    renderBodyPage()
    expect(screen.getByText('BMI')).toBeInTheDocument()
    expect(screen.getByText('体脂肪量')).toBeInTheDocument()
    expect(screen.getByText('除脂肪体重')).toBeInTheDocument()
    expect(screen.getByText('筋重量')).toBeInTheDocument()
  })

  it('記録なしのとき計算値は「———」が表示される', () => {
    renderBodyPage()
    const dashes = screen.getAllByText('———')
    expect(dashes.length).toBeGreaterThanOrEqual(4)
  })
})

describe('BodyPage - 入力と自動計算', () => {
  it('身長が未設定のとき BMI は「———」', () => {
    renderBodyPage()
    const bmiRow = screen.getByText('BMI').closest('div')
    expect(bmiRow?.textContent).toContain('———')
  })

  it('体重のみ入力 → 体脂肪量・除脂肪体重は「———」のまま', () => {
    renderBodyPage()
    const weightInput = screen.getAllByRole('spinbutton')[3] // 計測値側の体重入力
    fireEvent.blur(weightInput, { target: { value: '70' } })
    // 体脂肪なしなので体脂肪量は計算不可
    const fatMassRow = screen.getByText('体脂肪量').closest('div')
    expect(fatMassRow?.textContent).toContain('———')
  })

  it('クリアボタンが計測値行ごとに存在する（4つ）', () => {
    renderBodyPage()
    const clearBtns = screen.getAllByLabelText('クリア')
    expect(clearBtns).toHaveLength(4)
  })

  it('メモ入力欄が表示される', () => {
    renderBodyPage()
    expect(screen.getByPlaceholderText('メモを入力')).toBeInTheDocument()
  })
})

describe('BodyPage - localStorage 永続化', () => {
  it('体組成データが localStorage に保存される', () => {
    renderBodyPage()
    const inputs = screen.getAllByRole('spinbutton')
    // 計測値の体重入力（インデックス3: 身長・目標体重・目標体脂肪 の後）
    fireEvent.blur(inputs[3], { target: { value: '72.5' } })
    const stored = JSON.parse(localStorage.getItem('strength-log-body-records') ?? '[]')
    expect(stored.some((r: { weight: number }) => r.weight === 72.5)).toBe(true)
  })

  it('身長設定が localStorage に保存される', () => {
    renderBodyPage()
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.blur(inputs[0], { target: { value: '175' } })
    const stored = JSON.parse(localStorage.getItem('strength-log-body-settings') ?? '{}')
    expect(stored.height).toBe(175)
  })
})

describe('BodyPage - calcBody 計算値', () => {
  it('身長・体重が設定されていれば BMI が計算される', () => {
    // localStorage に設定を直接セット
    localStorage.setItem('strength-log-body-settings', JSON.stringify({ height: 170, targetWeight: 0, muscleMassUnit: '%', targetBodyFat: 0 }))
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem('strength-log-body-records', JSON.stringify([
      { date: today, weight: 68, bodyFat: null, muscleMass: null, waist: null, memo: '' }
    ]))
    renderBodyPage()
    // BMI = 68 / (1.7^2) = 23.53
    expect(screen.getByText('23.53')).toBeInTheDocument()
  })

  it('体重と体脂肪率が設定されていれば体脂肪量が計算される', () => {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem('strength-log-body-records', JSON.stringify([
      { date: today, weight: 80, bodyFat: 20, muscleMass: null, waist: null, memo: '' }
    ]))
    renderBodyPage()
    // 体脂肪量 = 80 * 0.20 = 16 kg
    expect(screen.getByText('16 kg')).toBeInTheDocument()
  })

  it('体重と体脂肪率が設定されていれば除脂肪体重が計算される', () => {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem('strength-log-body-records', JSON.stringify([
      { date: today, weight: 80, bodyFat: 20, muscleMass: null, waist: null, memo: '' }
    ]))
    renderBodyPage()
    // 除脂肪体重 = 80 - 16 = 64 kg
    expect(screen.getByText('64 kg')).toBeInTheDocument()
  })
})
