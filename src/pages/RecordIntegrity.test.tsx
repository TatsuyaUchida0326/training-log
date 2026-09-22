/**
 * システムテスト: 記録画面 → ホーム画面の一連の流れで「記録の実体」が一致することを確認する。
 *
 * 記録画面を開いただけで空セットが保存されていたため、
 * 「何も入力していないのに継続力ゲージが伸び、カレンダーにマークが付く」状態になっていた。
 * ページ単体のテストでは localStorage の中身までしか見えないため、
 * ここでは画面遷移をまたいでユーザーが目にする表示までを検証する。
 *
 * 達成条件は「1種目・3セット」に設定し、1種目の入力だけで判定できるようにしている。
 */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { PageHeaderProvider } from '../contexts/PageHeaderContext'
import { HeaderSpy } from '../test/HeaderSpy'
import HomePage from './HomePage'
import DateDetailPage from './DateDetailPage'
import TrainingEntryRoute from './TrainingEntryPage'
import { readStoredRecords, seedExercises, seedSettings, todayStr } from '../test/seed'
import { repsInputs, weightInputs } from '../test/inputs'

const EXERCISE_ID = 'ex-bench'
const EXERCISE_NAME = 'ベンチプレス'
const OTHER_EXERCISE_ID = 'ex-squat'
const OTHER_EXERCISE_NAME = 'スクワット'

function renderFromEntryPage() {
  return render(
    <PageHeaderProvider>
      <HeaderSpy />
      <MemoryRouter
        initialEntries={['/', `/date/${todayStr()}/exercises/${EXERCISE_ID}`]}
        initialIndex={1}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/date/:dateStr" element={<DateDetailPage />} />
          <Route
            path="/date/:dateStr/exercises/:exerciseId"
            element={<TrainingEntryRoute />}
          />
        </Routes>
      </MemoryRouter>
    </PageHeaderProvider>
  )
}

/** 記録画面にいる状態から、別の種目の記録画面へ移るためのボタン */
function NavigateToOtherExerciseButton() {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate(`/date/${todayStr()}/exercises/${OTHER_EXERCISE_ID}`)}>
      別の種目へ
    </button>
  )
}

function renderEntryPageWithExerciseSwitch() {
  return render(
    <PageHeaderProvider>
      <MemoryRouter initialEntries={[`/date/${todayStr()}/exercises/${EXERCISE_ID}`]}>
        <NavigateToOtherExerciseButton />
        <Routes>
          <Route
            path="/date/:dateStr/exercises/:exerciseId"
            element={<TrainingEntryRoute />}
          />
        </Routes>
      </MemoryRouter>
    </PageHeaderProvider>
  )
}

/** 「今日のトレーニング」セクション。種目名はトロフィー欄にも出るため範囲を絞る */
function todaySummarySection(): HTMLElement {
  const heading = screen.getByText('今日のトレーニング')
  return heading.closest('div')!.parentElement as HTMLElement
}

function fillSet(index: number, weight: string, reps: string): void {
  fireEvent.blur(weightInputs()[index], { target: { value: weight } })
  fireEvent.blur(repsInputs()[index], { target: { value: reps } })
}

/**
 * ヘッダー左の「戻る」を辿ってホームまで戻る。
 * 戻り先は navigate(-1) ではなく画面ごとに固定されているため、
 * 記録画面 → 日付詳細 → ホーム の2段階になる。
 */
async function goBackToHome(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: '戻る' }))
  await screen.findByText('合計種目数')
  await userEvent.click(screen.getByRole('button', { name: '戻る' }))
  await screen.findByText('今日のトレーニング')
}

beforeEach(() => {
  localStorage.clear()
  seedExercises([
    { id: EXERCISE_ID, name: EXERCISE_NAME, categoryId: '胸', isCustom: false },
    { id: OTHER_EXERCISE_ID, name: OTHER_EXERCISE_NAME, categoryId: '脚', isCustom: false },
  ])
  seedSettings({ requiredExercises: 1 })
})

describe('記録画面を開いただけでホームに影響しない', () => {
  it('何も入力せずに戻るとホームは「まだ記録がありません」のまま', async () => {
    renderFromEntryPage()
    await waitFor(() => {
      expect(screen.getAllByLabelText('セット削除')).toHaveLength(3)
    })
    await goBackToHome()
    expect(screen.getByText('まだ記録がありません')).toBeInTheDocument()
  })

  it('何も入力せずに戻るとカレンダーに記録マークが付かない', async () => {
    renderFromEntryPage()
    await waitFor(() => {
      expect(screen.getAllByLabelText('セット削除')).toHaveLength(3)
    })
    await goBackToHome()
    expect(screen.queryAllByTestId('marked-dot')).toHaveLength(0)
  })

  it('何も入力せずに戻ると継続力ゲージが 0 のまま', async () => {
    renderFromEntryPage()
    await waitFor(() => {
      expect(screen.getAllByLabelText('セット削除')).toHaveLength(3)
    })
    await goBackToHome()
    expect(screen.getByText('0 / 90')).toBeInTheDocument()
  })

  it('セットを追加してから何も入力せずに戻っても記録は残らない', async () => {
    renderFromEntryPage()
    await waitFor(() => {
      expect(screen.getAllByLabelText('セット削除')).toHaveLength(3)
    })
    await userEvent.click(screen.getByText('セットを追加'))
    await waitFor(() => {
      expect(screen.getAllByLabelText('セット削除')).toHaveLength(4)
    })
    await goBackToHome()
    expect(readStoredRecords()).toEqual([])
    expect(screen.getByText('まだ記録がありません')).toBeInTheDocument()
  })
})

describe('入力した記録はホームに反映される', () => {
  it('1セットだけ入力して戻るとホームに種目と記録マークが出る', async () => {
    renderFromEntryPage()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    fillSet(0, '60', '10')
    await waitFor(() => {
      expect(readStoredRecords()).toHaveLength(1)
    })
    await goBackToHome()
    expect(within(todaySummarySection()).getByText(EXERCISE_NAME)).toBeInTheDocument()
    expect(screen.queryAllByTestId('marked-dot')).toHaveLength(1)
  })

  it('1セットだけでは達成条件に届かず継続力ゲージは 0 のまま', async () => {
    renderFromEntryPage()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    fillSet(0, '60', '10')
    await waitFor(() => {
      expect(readStoredRecords()).toHaveLength(1)
    })
    await goBackToHome()
    expect(screen.getByText('0 / 90')).toBeInTheDocument()
  })

  it('3セット入力して戻ると継続力ゲージが 1 になる', async () => {
    renderFromEntryPage()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    fillSet(0, '60', '10')
    fillSet(1, '60', '10')
    fillSet(2, '60', '10')
    await waitFor(() => {
      expect(readStoredRecords()[0].sets.filter((set) => set.reps > 0)).toHaveLength(3)
    })
    await goBackToHome()
    expect(screen.getByText('1 / 90')).toBeInTheDocument()
  })
})

describe('下書きは種目ごとに分かれている', () => {
  it('別の種目へ遷移すると前の種目の下書き（メモ）が持ち越されない', async () => {
    renderEntryPageWithExerciseSwitch()
    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('メモ')).toHaveLength(3)
    })
    fireEvent.blur(screen.getAllByPlaceholderText('メモ')[0], {
      target: { value: 'ベンチのメモ' },
    })

    await userEvent.click(screen.getByRole('button', { name: '別の種目へ' }))

    await screen.findByText(OTHER_EXERCISE_NAME)
    expect(screen.getAllByPlaceholderText('メモ')[0]).toHaveValue('')
  })
})
