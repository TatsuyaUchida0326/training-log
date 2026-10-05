import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format, addDays } from 'date-fns'
import { describe, it, expect, beforeEach } from 'vitest'
import { PageHeaderProvider } from '../../contexts/PageHeaderContext'
import BodyPage from './BodyPage'
import {
  makeBodyRecord,
  readStoredBodySettings,
  seedBodyRecords,
  seedBodySettings,
} from '../../test/seed'
import { BODY_SETTINGS_KEY } from '../../test/storageKeys'

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
    const weightInput = screen.getByLabelText('体重') // 計測値側の体重入力
    fireEvent.blur(weightInput, { target: { value: '70' } })
    // 体脂肪なしなので体脂肪量は計算不可
    const fatMassRow = screen.getByText('体脂肪量').closest('div')
    expect(fatMassRow?.textContent).toContain('———')
  })

  it('クリアボタンが計測値行ごとに存在する（4つ）', () => {
    renderBodyPage()
    const clearBtns = screen.getAllByRole('button', { name: /をクリア$/ })
    expect(clearBtns).toHaveLength(4)
  })

  it('メモ入力欄が表示される', () => {
    renderBodyPage()
    expect(screen.getByPlaceholderText('メモを入力')).toBeInTheDocument()
  })
})

describe('BodyPage - 日付ナビゲーション', () => {
  it('「前の日」ボタンが表示される', () => {
    renderBodyPage()
    expect(screen.getByLabelText('前の日')).toBeInTheDocument()
  })

  it('「次の日」ボタンが表示される', () => {
    renderBodyPage()
    expect(screen.getByLabelText('次の日')).toBeInTheDocument()
  })

  it('今日の日付が表示される', () => {
    renderBodyPage()
    const todayStr = format(new Date(), 'yyyy年M月d日')
    expect(screen.getByText(todayStr)).toBeInTheDocument()
  })

  it('「次の日」をクリックすると明日の日付が表示される', async () => {
    renderBodyPage()
    const tomorrowStr = format(addDays(new Date(), 1), 'yyyy年M月d日')
    await userEvent.click(screen.getByLabelText('次の日'))
    expect(screen.getByText(tomorrowStr)).toBeInTheDocument()
  })

  it('「前の日」をクリックすると昨日の日付が表示される', async () => {
    renderBodyPage()
    const yesterdayStr = format(addDays(new Date(), -1), 'yyyy年M月d日')
    await userEvent.click(screen.getByLabelText('前の日'))
    expect(screen.getByText(yesterdayStr)).toBeInTheDocument()
  })
})

describe('BodyPage - localStorage 永続化', () => {
  it('体組成データが localStorage に保存される', () => {
    renderBodyPage()
    fireEvent.blur(screen.getByLabelText('体重'), { target: { value: '72.5' } })
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
    const today = format(new Date(), 'yyyy-MM-dd')
    localStorage.setItem('strength-log-body-records', JSON.stringify([
      { date: today, weight: 68, bodyFat: null, muscleMass: null, waist: null, memo: '' }
    ]))
    renderBodyPage()
    // BMI = 68 / (1.7^2) = 23.53
    expect(screen.getByText('23.53')).toBeInTheDocument()
  })

  it('体重と体脂肪率が設定されていれば体脂肪量が計算される', () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    localStorage.setItem('strength-log-body-records', JSON.stringify([
      { date: today, weight: 80, bodyFat: 20, muscleMass: null, waist: null, memo: '' }
    ]))
    renderBodyPage()
    // 体脂肪量 = 80 * 0.20 = 16 kg
    expect(screen.getByText('16 kg')).toBeInTheDocument()
  })

  it('体重と体脂肪率が設定されていれば除脂肪体重が計算される', () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    localStorage.setItem('strength-log-body-records', JSON.stringify([
      { date: today, weight: 80, bodyFat: 20, muscleMass: null, waist: null, memo: '' }
    ]))
    renderBodyPage()
    // 除脂肪体重 = 80 - 16 = 64 kg
    expect(screen.getByText('64 kg')).toBeInTheDocument()
  })
})

describe('BodyPage - アクセシビリティ（ラベル関連付け）', () => {
  it('身長・目標体重・目標体脂肪率の入力欄が getByLabelText で取得できる', () => {
    renderBodyPage()
    expect(screen.getByLabelText('身長')).toBeInTheDocument()
    expect(screen.getByLabelText('目標体重')).toBeInTheDocument()
    expect(screen.getByLabelText('目標体脂肪率')).toBeInTheDocument()
  })

  it('体重・体脂肪・筋肉量・ウエストの入力欄が getByLabelText で取得できる', () => {
    renderBodyPage()
    expect(screen.getByLabelText('体重')).toBeInTheDocument()
    expect(screen.getByLabelText('体脂肪')).toBeInTheDocument()
    expect(screen.getByLabelText('筋肉量')).toBeInTheDocument()
    expect(screen.getByLabelText('ウエスト')).toBeInTheDocument()
  })

  it('メモの入力欄が getByLabelText で取得できる', () => {
    renderBodyPage()
    expect(screen.getByLabelText('メモ')).toBeInTheDocument()
  })

  it('各入力欄のラベルは対応する input と関連付いている（同一要素であること）', () => {
    renderBodyPage()
    const byLabel = screen.getByLabelText('体重')
    const byPlaceholder = screen.getAllByPlaceholderText('———').at(-4) // 計測値の4欄（体重・体脂肪・筋肉量・ウエスト）の先頭
    expect(byLabel).toBe(byPlaceholder)
  })

  it('体重・体脂肪・筋肉量・ウエストそれぞれに「◯◯をクリア」という名前のクリアボタンがある', () => {
    renderBodyPage()
    expect(screen.getByRole('button', { name: '体重をクリア' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '体脂肪をクリア' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '筋肉量をクリア' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ウエストをクリア' })).toBeInTheDocument()
  })

  it('「体重をクリア」ボタンを押すと体重の値がクリアされる', async () => {
    const user = userEvent.setup()
    renderBodyPage()
    const weightInput = screen.getByLabelText('体重') as HTMLInputElement
    fireEvent.blur(weightInput, { target: { value: '70' } })
    await user.click(screen.getByRole('button', { name: '体重をクリア' }))
    const stored = JSON.parse(localStorage.getItem('strength-log-body-records') ?? '[]')
    expect(
      stored.find((record: { weight: number | null }) => 'weight' in record)?.weight ?? null
    ).toBeNull()
  })
})

/* ── 目標筋肉量の入力欄と、目標の向き（baseline）の保存 ── */

/** 目標の入力欄に値を入れて blur する（保存のきっかけ）。blur のたびに入力欄は作り直されるので毎回取り直す */
function blurInput(label: string, value: string): void {
  fireEvent.blur(screen.getByLabelText(label), { target: { value } })
}

describe('BodyPage - 目標筋肉量の入力欄', () => {
  it('「目標筋肉量」の入力欄が getByLabelText で取得できる', () => {
    renderBodyPage()
    expect(screen.getByLabelText('目標筋肉量')).toBeInTheDocument()
  })

  it('単位は kg で表示される（記録の単位が % でも）', () => {
    seedBodySettings({ muscleMassUnit: '%' })
    renderBodyPage()
    expect(screen.getByLabelText('目標筋肉量').parentElement).toHaveTextContent('kg')
  })

  it('「目標体脂肪率」の次、計測値の「体重」より前にある', () => {
    renderBodyPage()
    const bodyFatTarget = screen.getByLabelText('目標体脂肪率')
    const muscleTarget = screen.getByLabelText('目標筋肉量')
    const weight = screen.getByLabelText('体重')
    expect(bodyFatTarget.compareDocumentPosition(muscleTarget) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(muscleTarget.compareDocumentPosition(weight) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('未設定のときは空欄', () => {
    renderBodyPage()
    expect(screen.getByLabelText('目標筋肉量')).toHaveValue(null)
  })

  it('保存済みの目標筋肉量が入力欄に入る', () => {
    seedBodySettings({ targetMuscleMassKg: 45 })
    renderBodyPage()
    expect(screen.getByLabelText('目標筋肉量')).toHaveValue(45)
  })

  it('blur すると targetMuscleMassKg が localStorage に保存される', () => {
    renderBodyPage()
    blurInput('目標筋肉量', '45.5')
    expect(readStoredBodySettings().targetMuscleMassKg).toBe(45.5)
  })

  it('既存の目標（体重・体脂肪率）を保存しても目標筋肉量は変わらない', () => {
    seedBodySettings({ targetMuscleMassKg: 45 })
    renderBodyPage()
    blurInput('目標体重', '65')
    expect(readStoredBodySettings().targetMuscleMassKg).toBe(45)
    expect(readStoredBodySettings().targetWeight).toBe(65)
  })
})

describe('BodyPage - 目標を変えたときの baseline 保存', () => {
  it('目標体重を入れると、その時点の最新の体重が baseline になる', () => {
    seedBodyRecords([
      makeBodyRecord('2026-09-01', { weight: 70 }),
      makeBodyRecord('2026-09-02', { weight: 68.2 }),
    ])
    renderBodyPage()
    blurInput('目標体重', '65')
    const stored = readStoredBodySettings()
    expect(stored.targetWeight).toBe(65)
    expect(stored.goalBaselines).toEqual({ weight: 68.2 })
  })

  it('最新の体重が入っていない日があっても、体重が入っている直近の日の値を使う', () => {
    seedBodyRecords([
      makeBodyRecord('2026-09-01', { weight: 70 }),
      makeBodyRecord('2026-09-02', { bodyFat: 19 }),
    ])
    renderBodyPage()
    blurInput('目標体重', '65')
    expect(readStoredBodySettings().goalBaselines).toEqual({ weight: 70 })
  })

  it('目標体脂肪率を入れると、最新の体脂肪率が baseline になる', () => {
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 70, bodyFat: 22 })])
    renderBodyPage()
    blurInput('目標体脂肪率', '15')
    expect(readStoredBodySettings().goalBaselines).toEqual({ bodyFat: 22 })
  })

  it('目標筋肉量を入れると、最新の筋肉量（kg）が baseline になる', () => {
    seedBodySettings({ muscleMassUnit: 'kg' })
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 70, muscleMass: 36 })])
    renderBodyPage()
    blurInput('目標筋肉量', '40')
    expect(readStoredBodySettings().goalBaselines).toEqual({ muscleMass: 36 })
  })

  it('記録の単位が % のときは、体重 × 筋肉量% の kg が baseline になる', () => {
    seedBodySettings({ muscleMassUnit: '%' })
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 70, muscleMass: 40 })])
    renderBodyPage()
    blurInput('目標筋肉量', '30')
    expect(readStoredBodySettings().goalBaselines).toEqual({ muscleMass: 28 })
  })

  it('目標を変えると baseline も新しい現在値に更新される', () => {
    seedBodySettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 68.2 })])
    renderBodyPage()
    blurInput('目標体重', '63')
    const stored = readStoredBodySettings()
    expect(stored.targetWeight).toBe(63)
    expect(stored.goalBaselines.weight).toBe(68.2)
  })

  it('同じ値で blur し直しても baseline は変えない', () => {
    seedBodySettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 68.2 })])
    renderBodyPage()
    blurInput('目標体重', '65')
    expect(readStoredBodySettings().goalBaselines).toEqual({ weight: 70 })
  })

  it('目標を入れたあと体重を記録し、同じ目標で blur し直しても baseline は初回の値のまま', () => {
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 70 })])
    renderBodyPage()
    blurInput('目標体重', '65')
    blurInput('体重', '66') // 今日の体重として保存される（最新の体重は 66 になる）
    blurInput('目標体重', '65')
    expect(readStoredBodySettings().goalBaselines).toEqual({ weight: 70 })
  })

  it('空にすると target は 0 になり、その項目の baseline が消える', () => {
    seedBodySettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 68.2 })])
    renderBodyPage()
    blurInput('目標体重', '')
    const stored = readStoredBodySettings()
    expect(stored.targetWeight).toBe(0)
    expect(stored.goalBaselines).not.toHaveProperty('weight')
  })

  it('空にしたとき、他の項目の baseline は残る', () => {
    seedBodySettings({
      targetWeight: 65,
      targetBodyFat: 15,
      goalBaselines: { weight: 70, bodyFat: 22 },
    })
    renderBodyPage()
    blurInput('目標体重', '')
    expect(readStoredBodySettings().goalBaselines).toEqual({ bodyFat: 22 })
  })

  it('別の項目の目標を入れても、既にある baseline は変わらない', () => {
    seedBodySettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 68.2, bodyFat: 22 })])
    renderBodyPage()
    blurInput('目標体脂肪率', '15')
    expect(readStoredBodySettings().goalBaselines).toEqual({ weight: 70, bodyFat: 22 })
  })

  it('記録が1件も無いときに目標を入れても baseline は作らない', () => {
    renderBodyPage()
    blurInput('目標体重', '65')
    const stored = readStoredBodySettings()
    expect(stored.targetWeight).toBe(65)
    expect(stored.goalBaselines).toEqual({})
  })

  it('記録が無い状態で目標を変えたとき、古い baseline は引きずらない', () => {
    seedBodySettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    renderBodyPage()
    blurInput('目標体重', '60')
    expect(readStoredBodySettings().goalBaselines).not.toHaveProperty('weight')
  })

  it('身長を保存しても baseline は作られない', () => {
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 70 })])
    renderBodyPage()
    blurInput('身長', '175')
    const stored = readStoredBodySettings()
    expect(stored.height).toBe(175)
    expect(stored.goalBaselines).toEqual({})
  })

  it('goalBaselines の無い旧データでも、目標を入れると baseline が保存される', () => {
    localStorage.setItem(
      BODY_SETTINGS_KEY,
      JSON.stringify({ height: 170, targetWeight: 0, muscleMassUnit: '%', targetBodyFat: 0 }),
    )
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 70 })])
    renderBodyPage()
    blurInput('目標体重', '65')
    const stored = readStoredBodySettings()
    expect(stored.height).toBe(170)
    expect(stored.goalBaselines).toEqual({ weight: 70 })
  })
})

describe('BodyPage - 目標が先・記録が後のとき baseline を埋める', () => {
  it('記録ゼロで目標体重を入れた時点では baseline は無い', () => {
    renderBodyPage()
    blurInput('目標体重', '65')
    expect(readStoredBodySettings().goalBaselines).toEqual({})
  })

  it('そのあと体重を記録すると、記録した体重が baseline として保存される', () => {
    renderBodyPage()
    blurInput('目標体重', '65')
    blurInput('体重', '68.2')
    expect(readStoredBodySettings().goalBaselines).toEqual({ weight: 68.2 })
  })

  it('baseline を埋めたあとに体重を記録し直しても、baseline は最初の記録のまま', () => {
    renderBodyPage()
    blurInput('目標体重', '65')
    blurInput('体重', '68.2')
    blurInput('体重', '64.5')
    expect(readStoredBodySettings().goalBaselines).toEqual({ weight: 68.2 })
  })

  it('体脂肪率と筋肉量(kg)の目標も、あとから記録すれば埋まる', () => {
    seedBodySettings({ muscleMassUnit: 'kg' })
    renderBodyPage()
    blurInput('目標体脂肪率', '15')
    blurInput('目標筋肉量', '40')
    blurInput('体脂肪', '22')
    blurInput('筋肉量', '36')
    expect(readStoredBodySettings().goalBaselines).toEqual({ bodyFat: 22, muscleMass: 36 })
  })

  it('目標を設定していない項目は、記録しても baseline を作らない', () => {
    renderBodyPage()
    blurInput('目標体重', '65')
    blurInput('体重', '68.2')
    blurInput('体脂肪', '22')
    expect(readStoredBodySettings().goalBaselines).toEqual({ weight: 68.2 })
  })

  it('旧データ（目標あり・goalBaselines 無し・記録あり）で開くと baseline が埋まる', () => {
    localStorage.setItem(
      BODY_SETTINGS_KEY,
      JSON.stringify({ height: 170, targetWeight: 65, muscleMassUnit: '%', targetBodyFat: 0 }),
    )
    seedBodyRecords([
      makeBodyRecord('2026-09-01', { weight: 70 }),
      makeBodyRecord('2026-09-02', { weight: 68.2 }),
    ])
    renderBodyPage()
    const stored = readStoredBodySettings()
    expect(stored.goalBaselines).toEqual({ weight: 68.2 })
    expect(stored.height).toBe(170)
    expect(stored.targetWeight).toBe(65)
  })

  it('旧データで目標があっても記録が無ければ、開いても baseline は作らない', () => {
    seedBodySettings({ targetWeight: 65 })
    renderBodyPage()
    expect(readStoredBodySettings().goalBaselines).toEqual({})
  })

  it('既に baseline がある項目は、開いても記録を足しても変わらない', () => {
    seedBodySettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 68.2 })])
    renderBodyPage()
    blurInput('体重', '66')
    expect(readStoredBodySettings().goalBaselines).toEqual({ weight: 70 })
  })

  it('一部の項目だけ baseline がある旧データでは、無い項目だけ埋める', () => {
    seedBodySettings({ targetWeight: 65, targetBodyFat: 15, goalBaselines: { weight: 70 } })
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 68.2, bodyFat: 20 })])
    renderBodyPage()
    expect(readStoredBodySettings().goalBaselines).toEqual({ weight: 70, bodyFat: 20 })
  })
})
