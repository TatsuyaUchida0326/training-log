import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ContestEditor from './ContestEditor'
import { CONTESTS_KEY, makeContest, readStoredContests, seedContests } from '../../test/contests'
import { setupFixedClock } from '../../test/fixedClock'

// 「終了」の判定が実時間に依存するため、今日を 2026-10-05（月）に固定する
setupFixedClock(new Date(2026, 9, 5, 12))

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const ADD_BUTTON = { name: '大会を追加' }

function nameInput(): HTMLInputElement {
  return screen.getByLabelText('大会の名前') as HTMLInputElement
}

function dateInput(): HTMLInputElement {
  return screen.getByLabelText('大会の日付') as HTMLInputElement
}

/** 追加フォームに入力する（日付欄は type="date" なので change イベントで値を入れる） */
function fillForm(name: string, date: string): void {
  if (name !== '') fireEvent.change(nameInput(), { target: { value: name } })
  if (date !== '') fireEvent.change(dateInput(), { target: { value: date } })
}

/** 登録済みの行の名前入力。追加フォームの「大会の名前」は除く */
function registeredNameInputs(): HTMLInputElement[] {
  return screen.queryAllByLabelText(/^(?!大会の名前$).+の名前$/) as HTMLInputElement[]
}

describe('ContestEditor — 表示', () => {
  it('見出し「大会・イベント」が出る', () => {
    render(<ContestEditor />)
    expect(screen.getByText('大会・イベント')).toBeInTheDocument()
  })

  it('追加フォーム（名前・日付・「大会を追加」ボタン）が出る', () => {
    render(<ContestEditor />)
    expect(nameInput()).toBeInTheDocument()
    expect(dateInput()).toBeInTheDocument()
    expect(screen.getByRole('button', ADD_BUTTON)).toBeInTheDocument()
  })

  it('名前は text で最大30文字、日付は type="date"', () => {
    render(<ContestEditor />)
    expect(nameInput()).toHaveAttribute('type', 'text')
    expect(nameInput()).toHaveAttribute('maxlength', '30')
    expect(dateInput()).toHaveAttribute('type', 'date')
  })

  it('1件も無いときは追加フォームだけ（登録済みの行も削除ボタンも無い）', () => {
    render(<ContestEditor />)
    expect(registeredNameInputs()).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /を削除$/ })).not.toBeInTheDocument()
    expect(screen.queryByText('終了')).not.toBeInTheDocument()
  })

  it('追加フォームは最初は空', () => {
    render(<ContestEditor />)
    expect(nameInput()).toHaveValue('')
    expect(dateInput()).toHaveValue('')
  })
})

describe('ContestEditor — 「大会を追加」ボタンの有効・無効', () => {
  it('最初は disabled', () => {
    render(<ContestEditor />)
    expect(screen.getByRole('button', ADD_BUTTON)).toBeDisabled()
  })

  it('名前だけでは disabled', () => {
    render(<ContestEditor />)
    fillForm('ボディコンテスト', '')
    expect(screen.getByRole('button', ADD_BUTTON)).toBeDisabled()
  })

  it('日付だけでは disabled', () => {
    render(<ContestEditor />)
    fillForm('', '2026-10-17')
    expect(screen.getByRole('button', ADD_BUTTON)).toBeDisabled()
  })

  it('名前が空白だけ（半角・全角）でも disabled', () => {
    render(<ContestEditor />)
    fillForm('   ', '2026-10-17')
    expect(screen.getByRole('button', ADD_BUTTON)).toBeDisabled()
    fireEvent.change(nameInput(), { target: { value: '　　' } })
    expect(screen.getByRole('button', ADD_BUTTON)).toBeDisabled()
  })

  it('名前と日付が入れば enabled', () => {
    render(<ContestEditor />)
    fillForm('ボディコンテスト', '2026-10-17')
    expect(screen.getByRole('button', ADD_BUTTON)).toBeEnabled()
  })

  it('入れたあとで名前を消すと、また disabled', () => {
    render(<ContestEditor />)
    fillForm('ボディコンテスト', '2026-10-17')
    fireEvent.change(nameInput(), { target: { value: '' } })
    expect(screen.getByRole('button', ADD_BUTTON)).toBeDisabled()
  })

  it('入れたあとで日付を消すと、また disabled', () => {
    render(<ContestEditor />)
    fillForm('ボディコンテスト', '2026-10-17')
    fireEvent.change(dateInput(), { target: { value: '' } })
    expect(screen.getByRole('button', ADD_BUTTON)).toBeDisabled()
  })

  it('disabled のときに押しても何も保存されない', async () => {
    render(<ContestEditor />)
    fillForm('ボディコンテスト', '')
    await userEvent.click(screen.getByRole('button', ADD_BUTTON))
    expect(readStoredContests()).toEqual([])
    expect(registeredNameInputs()).toHaveLength(0)
  })
})

describe('ContestEditor — 追加', () => {
  it('追加すると localStorage に保存される', async () => {
    render(<ContestEditor />)
    fillForm('ボディコンテスト', '2026-10-17')
    await userEvent.click(screen.getByRole('button', ADD_BUTTON))

    const stored = readStoredContests()
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ name: 'ボディコンテスト', date: '2026-10-17' })
    expect(stored[0].id).not.toBe('')
  })

  it('追加すると登録済みの行が出る（名前・日付の入力欄と削除ボタン）', async () => {
    render(<ContestEditor />)
    fillForm('ボディコンテスト', '2026-10-17')
    await userEvent.click(screen.getByRole('button', ADD_BUTTON))

    expect(screen.getByLabelText('ボディコンテストの名前')).toHaveValue('ボディコンテスト')
    expect(screen.getByLabelText('ボディコンテストの日付')).toHaveValue('2026-10-17')
    expect(screen.getByRole('button', { name: 'ボディコンテストを削除' })).toBeInTheDocument()
  })

  it('追加するとフォームは空に戻り、ボタンは disabled に戻る', async () => {
    render(<ContestEditor />)
    fillForm('ボディコンテスト', '2026-10-17')
    await userEvent.click(screen.getByRole('button', ADD_BUTTON))

    expect(nameInput()).toHaveValue('')
    expect(dateInput()).toHaveValue('')
    expect(screen.getByRole('button', ADD_BUTTON)).toBeDisabled()
  })

  it('名前の前後の空白は取り除いて保存する', async () => {
    render(<ContestEditor />)
    fillForm('  ボディコンテスト  ', '2026-10-17')
    await userEvent.click(screen.getByRole('button', ADD_BUTTON))

    expect(readStoredContests()[0].name).toBe('ボディコンテスト')
    expect(screen.getByLabelText('ボディコンテストの名前')).toHaveValue('ボディコンテスト')
  })

  it('続けて2件追加できる（同じ名前でも id は別）', async () => {
    render(<ContestEditor />)
    fillForm('予選会', '2026-10-17')
    await userEvent.click(screen.getByRole('button', ADD_BUTTON))
    fillForm('予選会', '2026-10-24')
    await userEvent.click(screen.getByRole('button', ADD_BUTTON))

    const stored = readStoredContests()
    expect(stored).toHaveLength(2)
    expect(stored[0].id).not.toBe(stored[1].id)
    expect(registeredNameInputs()).toHaveLength(2)
  })

  it('過ぎた日付でも追加できる', async () => {
    render(<ContestEditor />)
    fillForm('終わった大会', '2026-01-01')
    await userEvent.click(screen.getByRole('button', ADD_BUTTON))
    expect(readStoredContests()).toHaveLength(1)
  })

  it('既存の大会を残したまま追加する', async () => {
    seedContests([makeContest('既存の大会', '2026-10-17', 'old')])
    render(<ContestEditor />)
    fillForm('新しい大会', '2026-11-03')
    await userEvent.click(screen.getByRole('button', ADD_BUTTON))
    expect(readStoredContests().map((contest) => contest.name)).toEqual(['既存の大会', '新しい大会'])
  })

  it('名前は30文字までしか入らない（maxLength）', async () => {
    render(<ContestEditor />)
    await userEvent.type(nameInput(), 'あ'.repeat(40))
    expect(nameInput().value).toHaveLength(30)
  })
})

describe('ContestEditor — 登録済みの行', () => {
  it('保存済みの大会が、名前・日付つきで出る', () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17')])
    render(<ContestEditor />)
    expect(screen.getByLabelText('ボディコンテストの名前')).toHaveValue('ボディコンテスト')
    expect(screen.getByLabelText('ボディコンテストの日付')).toHaveValue('2026-10-17')
  })

  it('日付の昇順に並ぶ（保存順ではない）', () => {
    seedContests([
      makeContest('十二月の大会', '2026-12-01'),
      makeContest('十月の大会', '2026-10-17'),
      makeContest('十一月の大会', '2026-11-03'),
    ])
    render(<ContestEditor />)
    expect(registeredNameInputs().map((input) => input.value)).toEqual([
      '十月の大会',
      '十一月の大会',
      '十二月の大会',
    ])
  })

  it('同じ日は登録順', () => {
    seedContests([
      makeContest('登録一番目', '2026-10-17'),
      makeContest('先の日付', '2026-10-01'),
      makeContest('登録二番目', '2026-10-17'),
      makeContest('登録三番目', '2026-10-17'),
    ])
    render(<ContestEditor />)
    expect(registeredNameInputs().map((input) => input.value)).toEqual([
      '先の日付',
      '登録一番目',
      '登録二番目',
      '登録三番目',
    ])
  })

  it('「日付の近い順」ではなく日付の昇順（過ぎた大会が先頭に来る）', () => {
    seedContests([
      makeContest('これからの大会', '2026-10-17'),
      makeContest('終わった大会', '2026-09-01'),
    ])
    render(<ContestEditor />)
    expect(registeredNameInputs().map((input) => input.value)).toEqual([
      '終わった大会',
      'これからの大会',
    ])
  })

  it('壊れた保存データの要素は出ない', () => {
    seedContests([null, makeContest('正しい大会', '2026-10-17'), { id: 'x', name: '', date: '2026-10-17' }])
    render(<ContestEditor />)
    expect(registeredNameInputs().map((input) => input.value)).toEqual(['正しい大会'])
  })

  it('JSON として壊れた保存データでも落ちず、追加フォームだけ出る', () => {
    localStorage.setItem(CONTESTS_KEY, 'INVALID_JSON{{{')
    expect(() => render(<ContestEditor />)).not.toThrow()
    expect(registeredNameInputs()).toHaveLength(0)
    expect(nameInput()).toBeInTheDocument()
  })

  it('画面を作り直しても、追加した大会が残っている', async () => {
    const first = render(<ContestEditor />)
    fillForm('ボディコンテスト', '2026-10-17')
    await userEvent.click(screen.getByRole('button', ADD_BUTTON))
    first.unmount()

    render(<ContestEditor />)
    expect(screen.getByLabelText('ボディコンテストの名前')).toHaveValue('ボディコンテスト')
  })
})

describe('ContestEditor — 「終了」の表示', () => {
  it('過ぎた大会の行には「終了」と出る', () => {
    seedContests([makeContest('終わった大会', '2026-10-04')])
    render(<ContestEditor />)
    expect(screen.getByText('終了')).toBeInTheDocument()
  })

  it('今日の大会には出ない', () => {
    seedContests([makeContest('今日の大会', '2026-10-05')])
    render(<ContestEditor />)
    expect(screen.queryByText('終了')).not.toBeInTheDocument()
  })

  it('これからの大会には出ない', () => {
    seedContests([makeContest('明日の大会', '2026-10-06')])
    render(<ContestEditor />)
    expect(screen.queryByText('終了')).not.toBeInTheDocument()
  })

  it('過ぎた大会の数だけ出る（2件過ぎて1件これから → 2つ）', () => {
    seedContests([
      makeContest('一つ目', '2026-01-01'),
      makeContest('二つ目', '2026-10-04'),
      makeContest('これから', '2026-10-17'),
    ])
    render(<ContestEditor />)
    expect(screen.getAllByText('終了')).toHaveLength(2)
  })

  it('今日の時刻が 23:59 でも、今日の大会は「終了」にならない', () => {
    vi.setSystemTime(new Date(2026, 9, 5, 23, 59, 59))
    seedContests([makeContest('今日の大会', '2026-10-05')])
    render(<ContestEditor />)
    expect(screen.queryByText('終了')).not.toBeInTheDocument()
  })

  it('日付を過去に変えると「終了」が付き、未来に変えると消える', () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17')])
    render(<ContestEditor />)
    expect(screen.queryByText('終了')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('ボディコンテストの日付'), { target: { value: '2026-09-01' } })
    expect(screen.getByText('終了')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('ボディコンテストの日付'), { target: { value: '2026-11-01' } })
    expect(screen.queryByText('終了')).not.toBeInTheDocument()
  })
})

describe('ContestEditor — 名前の編集（blur で保存）', () => {
  beforeEach(() => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17', 'c1')])
  })

  it('名前を書き換えて blur すると保存される', () => {
    render(<ContestEditor />)
    fireEvent.change(screen.getByLabelText('ボディコンテストの名前'), { target: { value: '全日本大会' } })
    fireEvent.blur(screen.getByLabelText('ボディコンテストの名前'))

    expect(readStoredContests()).toEqual([{ id: 'c1', name: '全日本大会', date: '2026-10-17' }])
  })

  it('書き換えただけ（blur 前）では保存されない', () => {
    render(<ContestEditor />)
    fireEvent.change(screen.getByLabelText('ボディコンテストの名前'), { target: { value: '全日本大会' } })
    expect(readStoredContests()[0].name).toBe('ボディコンテスト')
  })

  it('保存後は新しい名前が行の名前になる（ラベルも新しい名前になる）', () => {
    render(<ContestEditor />)
    fireEvent.change(screen.getByLabelText('ボディコンテストの名前'), { target: { value: '全日本大会' } })
    fireEvent.blur(screen.getByLabelText('ボディコンテストの名前'))

    expect(screen.getByLabelText('全日本大会の名前')).toHaveValue('全日本大会')
    expect(screen.getByRole('button', { name: '全日本大会を削除' })).toBeInTheDocument()
    expect(screen.queryByLabelText('ボディコンテストの名前')).not.toBeInTheDocument()
  })

  it('名前を空にして blur すると、元の名前に戻る（保存も変わらない）', () => {
    render(<ContestEditor />)
    const input = screen.getByLabelText('ボディコンテストの名前')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)

    expect(screen.getByLabelText('ボディコンテストの名前')).toHaveValue('ボディコンテスト')
    expect(readStoredContests()[0].name).toBe('ボディコンテスト')
  })

  it('名前を空白だけにして blur しても、元の名前に戻る', () => {
    render(<ContestEditor />)
    const input = screen.getByLabelText('ボディコンテストの名前')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.blur(input)

    expect(screen.getByLabelText('ボディコンテストの名前')).toHaveValue('ボディコンテスト')
    expect(readStoredContests()[0].name).toBe('ボディコンテスト')
  })

  it('名前を変えても日付は変わらない', () => {
    render(<ContestEditor />)
    fireEvent.change(screen.getByLabelText('ボディコンテストの名前'), { target: { value: '全日本大会' } })
    fireEvent.blur(screen.getByLabelText('ボディコンテストの名前'))
    expect(screen.getByLabelText('全日本大会の日付')).toHaveValue('2026-10-17')
  })
})

describe('ContestEditor — 日付の編集（change で保存）', () => {
  beforeEach(() => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17', 'c1')])
  })

  it('日付を変えると、blur を待たずに保存される', () => {
    render(<ContestEditor />)
    fireEvent.change(screen.getByLabelText('ボディコンテストの日付'), { target: { value: '2026-11-03' } })

    expect(readStoredContests()).toEqual([{ id: 'c1', name: 'ボディコンテスト', date: '2026-11-03' }])
    expect(screen.getByLabelText('ボディコンテストの日付')).toHaveValue('2026-11-03')
  })

  it('日付を空にされたら、元の日付のまま（保存も変わらない）', () => {
    render(<ContestEditor />)
    fireEvent.change(screen.getByLabelText('ボディコンテストの日付'), { target: { value: '' } })

    expect(screen.getByLabelText('ボディコンテストの日付')).toHaveValue('2026-10-17')
    expect(readStoredContests()[0].date).toBe('2026-10-17')
  })

  it('日付を変えると並び（日付の昇順）も入れ替わる', () => {
    seedContests([
      makeContest('先の大会', '2026-10-17', 'a'),
      makeContest('後の大会', '2026-11-03', 'b'),
    ])
    render(<ContestEditor />)
    expect(registeredNameInputs().map((input) => input.value)).toEqual(['先の大会', '後の大会'])

    fireEvent.change(screen.getByLabelText('先の大会の日付'), { target: { value: '2026-12-24' } })

    expect(registeredNameInputs().map((input) => input.value)).toEqual(['後の大会', '先の大会'])
  })

  it('日付を変えても名前は変わらない', () => {
    render(<ContestEditor />)
    fireEvent.change(screen.getByLabelText('ボディコンテストの日付'), { target: { value: '2026-11-03' } })
    expect(screen.getByLabelText('ボディコンテストの名前')).toHaveValue('ボディコンテスト')
  })
})

describe('ContestEditor — 削除', () => {
  beforeEach(() => {
    seedContests([
      makeContest('ボディコンテスト', '2026-10-17', 'c1'),
      makeContest('秋の大会', '2026-11-03', 'c2'),
    ])
  })

  it('確認ダイアログの文言に大会名が入る', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ContestEditor />)
    await userEvent.click(screen.getByRole('button', { name: 'ボディコンテストを削除' }))

    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('ボディコンテスト'))
  })

  it('OK なら削除され、保存データからも消える（他の大会は残る）', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ContestEditor />)
    await userEvent.click(screen.getByRole('button', { name: 'ボディコンテストを削除' }))

    expect(screen.queryByLabelText('ボディコンテストの名前')).not.toBeInTheDocument()
    expect(screen.getByLabelText('秋の大会の名前')).toBeInTheDocument()
    expect(readStoredContests().map((contest) => contest.id)).toEqual(['c2'])
  })

  it('キャンセルなら消さない', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ContestEditor />)
    await userEvent.click(screen.getByRole('button', { name: 'ボディコンテストを削除' }))

    expect(screen.getByLabelText('ボディコンテストの名前')).toBeInTheDocument()
    expect(readStoredContests()).toHaveLength(2)
  })

  it('最後の1件を削除すると追加フォームだけになる', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ContestEditor />)
    await userEvent.click(screen.getByRole('button', { name: 'ボディコンテストを削除' }))
    await userEvent.click(screen.getByRole('button', { name: '秋の大会を削除' }))

    expect(registeredNameInputs()).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /を削除$/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', ADD_BUTTON)).toBeInTheDocument()
    expect(readStoredContests()).toEqual([])
  })

  it('削除しても追加フォームの入力途中の内容は消えない', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ContestEditor />)
    fillForm('入力途中の大会', '2026-12-01')
    await userEvent.click(screen.getByRole('button', { name: 'ボディコンテストを削除' }))

    expect(nameInput()).toHaveValue('入力途中の大会')
    expect(dateInput()).toHaveValue('2026-12-01')
  })
})
