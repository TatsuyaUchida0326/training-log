import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ContestEditor from './ContestEditor'
import { makeContest, readStoredContests, seedContests } from '../../test/contests'
import { CONTESTS_KEY } from '../../test/storageKeys'
import { setupFixedClock } from '../../test/fixedClock'
import { MAX_CONTEST_NAME_LENGTH } from '../../utils/contests'

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
  return screen.getByLabelText('追加する大会の名前') as HTMLInputElement
}

function dateInput(): HTMLInputElement {
  return screen.getByLabelText('追加する大会の日付') as HTMLInputElement
}

/** 追加フォームに入力する（日付欄は type="date" なので change イベントで値を入れる） */
function fillForm(name: string, date: string): void {
  if (name !== '') fireEvent.change(nameInput(), { target: { value: name } })
  if (date !== '') fireEvent.change(dateInput(), { target: { value: date } })
}

/** 登録済みの行の名前入力。追加フォームの「追加する大会の名前」は除く */
function registeredNameInputs(): HTMLInputElement[] {
  return screen.queryAllByLabelText(/^(?!追加する大会の名前$).+の名前$/) as HTMLInputElement[]
}

describe('ContestEditor — 表示', () => {
  it('カードの枠と見出し「大会・イベント」は描かない（中身だけ。枠と見出しは BodyPage の役目）', () => {
    render(<ContestEditor />)
    expect(screen.queryByText('大会・イベント')).not.toBeInTheDocument()
  })

  it('追加フォーム（名前・日付・「大会を追加」ボタン）が出る', () => {
    render(<ContestEditor />)
    expect(nameInput()).toBeInTheDocument()
    expect(dateInput()).toBeInTheDocument()
    expect(screen.getByRole('button', ADD_BUTTON)).toBeInTheDocument()
  })

  it('名前は text で最大文字数つき、日付は type="date"', () => {
    render(<ContestEditor />)
    expect(nameInput()).toHaveAttribute('type', 'text')
    expect(nameInput()).toHaveAttribute('maxlength', String(MAX_CONTEST_NAME_LENGTH))
    expect(dateInput()).toHaveAttribute('type', 'date')
  })

  it('追加フォームの日付欄は min="2000-01-01" / max="2999-12-31"', () => {
    render(<ContestEditor />)
    expect(dateInput()).toHaveAttribute('min', '2000-01-01')
    expect(dateInput()).toHaveAttribute('max', '2999-12-31')
  })

  it('登録済みの行の日付欄も min="2000-01-01" / max="2999-12-31"', () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17')])
    render(<ContestEditor />)
    const input = screen.getByLabelText('ボディコンテストの日付')
    expect(input).toHaveAttribute('min', '2000-01-01')
    expect(input).toHaveAttribute('max', '2999-12-31')
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

  it.each([
    ['年が途中の値（0002-10-17）', '0002-10-17'],
    ['2000 年より前', '1999-12-31'],
    ['2999 年より後', '3000-01-01'],
  ])('名前があっても、日付が %s なら disabled', (_label, date) => {
    render(<ContestEditor />)
    fillForm('ボディコンテスト', date)
    expect(screen.getByRole('button', ADD_BUTTON)).toBeDisabled()
  })

  it('年が 2000・2999 ちょうどの日付は enabled', () => {
    render(<ContestEditor />)
    fillForm('ボディコンテスト', '2000-01-01')
    expect(screen.getByRole('button', ADD_BUTTON)).toBeEnabled()
    fireEvent.change(dateInput(), { target: { value: '2999-12-31' } })
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

  it('名前は最大文字数までしか入らない（maxLength）', async () => {
    render(<ContestEditor />)
    await userEvent.type(nameInput(), 'あ'.repeat(MAX_CONTEST_NAME_LENGTH + 10))
    expect(nameInput().value).toHaveLength(MAX_CONTEST_NAME_LENGTH)
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

describe('ContestEditor — 名前が「大会」の大会（追加フォームとのラベル衝突）', () => {
  it('名前が「大会」の大会を登録しても、「大会の名前」は登録済みの行の入力1つだけを指す', () => {
    seedContests([makeContest('大会', '2026-10-17')])
    render(<ContestEditor />)

    const row = screen.getByLabelText('大会の名前') as HTMLInputElement // 複数該当すれば例外になる
    expect(row).toHaveValue('大会')
    expect(screen.getByLabelText('大会の日付')).toHaveValue('2026-10-17')
    expect(screen.getByRole('button', { name: '大会を削除' })).toBeInTheDocument()
    // 追加フォームは別のラベルで取れ、空のまま
    expect(nameInput()).toHaveValue('')
    expect(nameInput()).not.toBe(row)
    expect(registeredNameInputs()).toEqual([row])
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

describe('ContestEditor — 日付の編集（有効な日付になったときだけ change で保存）', () => {
  beforeEach(() => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17', 'c1')])
  })

  function rowDateInput(): HTMLInputElement {
    return screen.getByLabelText('ボディコンテストの日付') as HTMLInputElement
  }

  it('有効な日付に変えると、blur を待たずに保存される', () => {
    render(<ContestEditor />)
    fireEvent.change(rowDateInput(), { target: { value: '2026-11-03' } })

    expect(readStoredContests()).toEqual([{ id: 'c1', name: 'ボディコンテスト', date: '2026-11-03' }])
    expect(rowDateInput()).toHaveValue('2026-11-03')
  })

  it('日付を空にされても保存データは元の日付のまま。欄は入力中の空のままで、blur すると元の日付に戻る', () => {
    render(<ContestEditor />)
    fireEvent.change(rowDateInput(), { target: { value: '' } })

    expect(readStoredContests()[0].date).toBe('2026-10-17')
    expect(rowDateInput()).toHaveValue('')

    act(() => { rowDateInput().focus() })
    act(() => { rowDateInput().blur() })
    expect(rowDateInput()).toHaveValue('2026-10-17')
    expect(readStoredContests()[0].date).toBe('2026-10-17')
  })

  it('年を打っている途中の値（0002 → 0020 → 0202）は保存されず、欄には打った値が残る。2027 になったときだけ保存される', () => {
    render(<ContestEditor />)

    for (const partial of ['0002-10-17', '0020-10-17', '0202-10-17']) {
      fireEvent.change(rowDateInput(), { target: { value: partial } })
      expect(readStoredContests()[0].date, `${partial} を入れた時点の保存データ`).toBe('2026-10-17')
      expect(rowDateInput(), `${partial} を入れた時点の欄`).toHaveValue(partial)
    }

    fireEvent.change(rowDateInput(), { target: { value: '2027-10-17' } })
    expect(readStoredContests()[0].date).toBe('2027-10-17')
    expect(rowDateInput()).toHaveValue('2027-10-17')
  })

  it('途中の値の間は「終了」が付かない（0002 年の大会として過去扱いにならない）', () => {
    render(<ContestEditor />)
    fireEvent.change(rowDateInput(), { target: { value: '0002-10-17' } })
    expect(screen.queryByText('終了')).not.toBeInTheDocument()
  })

  it('2000 年より前・2999 年より後の値も保存されない', () => {
    render(<ContestEditor />)
    fireEvent.change(rowDateInput(), { target: { value: '1999-12-31' } })
    fireEvent.change(rowDateInput(), { target: { value: '3000-01-01' } })
    expect(readStoredContests()[0].date).toBe('2026-10-17')
  })

  it('途中の値のまま欄を離れる（blur）と、元の日付に戻る', () => {
    render(<ContestEditor />)
    act(() => { rowDateInput().focus() })
    fireEvent.change(rowDateInput(), { target: { value: '0002-10-17' } })
    act(() => { rowDateInput().blur() })

    expect(rowDateInput()).toHaveValue('2026-10-17')
    expect(readStoredContests()[0].date).toBe('2026-10-17')
  })

  it('有効な日付にしてから blur しても、その日付のまま', () => {
    render(<ContestEditor />)
    act(() => { rowDateInput().focus() })
    fireEvent.change(rowDateInput(), { target: { value: '2027-10-17' } })
    act(() => { rowDateInput().blur() })

    expect(rowDateInput()).toHaveValue('2027-10-17')
    expect(readStoredContests()[0].date).toBe('2027-10-17')
  })

  it('途中の値を入れて blur したあと、同じ欄でもう一度入力すると保存できる', () => {
    render(<ContestEditor />)
    act(() => { rowDateInput().focus() })
    fireEvent.change(rowDateInput(), { target: { value: '0002-10-17' } })
    act(() => { rowDateInput().blur() })

    act(() => { rowDateInput().focus() })
    fireEvent.change(rowDateInput(), { target: { value: '2026-12-24' } })
    expect(readStoredContests()[0].date).toBe('2026-12-24')
  })

  it('日付を変えても名前は変わらない', () => {
    render(<ContestEditor />)
    fireEvent.change(rowDateInput(), { target: { value: '2026-11-03' } })
    expect(screen.getByLabelText('ボディコンテストの名前')).toHaveValue('ボディコンテスト')
  })

  it('途中の値の編集が、ほかの大会の日付に影響しない', () => {
    seedContests([
      makeContest('ボディコンテスト', '2026-10-17', 'c1'),
      makeContest('秋の大会', '2026-11-03', 'c2'),
    ])
    render(<ContestEditor />)
    fireEvent.change(screen.getByLabelText('ボディコンテストの日付'), { target: { value: '0002-10-17' } })
    expect(screen.getByLabelText('秋の大会の日付')).toHaveValue('2026-11-03')
    expect(readStoredContests().map((contest) => contest.date)).toEqual(['2026-10-17', '2026-11-03'])
  })
})

describe('ContestEditor — 日付欄にフォーカスがある間は行の並びを固定する', () => {
  // A=10/17, B=11/03, C=翌年。A の日付を B より後ろにしても、触っている間は A が動かない
  beforeEach(() => {
    seedContests([
      makeContest('A大会', '2026-10-17', 'a'),
      makeContest('B大会', '2026-11-03', 'b'),
      makeContest('C大会', '2027-01-10', 'c'),
    ])
  })

  function order(): string[] {
    return registeredNameInputs().map((input) => input.value)
  }

  it('フォーカス中に日付を B より後ろへ変えても、DOM の並びは A, B, C のまま', () => {
    render(<ContestEditor />)
    const input = screen.getByLabelText('A大会の日付') as HTMLInputElement
    act(() => { input.focus() })
    fireEvent.change(input, { target: { value: '2026-11-17' } })

    expect(order()).toEqual(['A大会', 'B大会', 'C大会'])
    // 保存はすでにされている（並びだけが固定される）
    expect(readStoredContests().find((contest) => contest.id === 'a')?.date).toBe('2026-11-17')
  })

  it('並びを固定しても、触っている欄そのもの（同じ DOM 要素）にフォーカスが残る', () => {
    render(<ContestEditor />)
    const input = screen.getByLabelText('A大会の日付') as HTMLInputElement
    act(() => { input.focus() })
    fireEvent.change(input, { target: { value: '2026-11-17' } })

    expect(screen.getByLabelText('A大会の日付')).toBe(input)
    expect(input).toHaveFocus()
  })

  it('続けて月を進めても（10/17 → 11/17 → 12/17）、欄は同じままで、並びは固定のまま', () => {
    render(<ContestEditor />)
    const input = screen.getByLabelText('A大会の日付') as HTMLInputElement
    act(() => { input.focus() })

    fireEvent.change(input, { target: { value: '2026-11-17' } })
    fireEvent.change(input, { target: { value: '2026-12-17' } })

    expect(screen.getByLabelText('A大会の日付')).toBe(input)
    expect(input).toHaveFocus()
    expect(order()).toEqual(['A大会', 'B大会', 'C大会'])
    expect(input).toHaveValue('2026-12-17')
    expect(readStoredContests().find((contest) => contest.id === 'a')?.date).toBe('2026-12-17')
  })

  it('blur したあとに並びが日付の昇順（B, A, C）になる', () => {
    render(<ContestEditor />)
    const input = screen.getByLabelText('A大会の日付') as HTMLInputElement
    act(() => { input.focus() })
    fireEvent.change(input, { target: { value: '2026-11-17' } })
    act(() => { input.blur() })

    expect(order()).toEqual(['B大会', 'A大会', 'C大会'])
  })

  it('途中の値を入れて blur して戻した場合は、並びは変わらない', () => {
    render(<ContestEditor />)
    const input = screen.getByLabelText('A大会の日付') as HTMLInputElement
    act(() => { input.focus() })
    fireEvent.change(input, { target: { value: '0002-10-17' } })
    act(() => { input.blur() })

    expect(order()).toEqual(['A大会', 'B大会', 'C大会'])
  })

  it('フォーカスしていない欄を変えたとき（プログラムからの変更）は、すぐ並び直る', () => {
    render(<ContestEditor />)
    fireEvent.change(screen.getByLabelText('A大会の日付'), { target: { value: '2026-11-17' } })
    expect(order()).toEqual(['B大会', 'A大会', 'C大会'])
  })

  it('日付欄を触っていない間（名前欄の編集など）は、これまで通り昇順', () => {
    render(<ContestEditor />)
    expect(order()).toEqual(['A大会', 'B大会', 'C大会'])
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

describe('ContestEditor — 読み上げ（role="status"）', () => {
  it('role="status" の領域が、大会が無いときから常にあり、最初は空', () => {
    render(<ContestEditor />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('登録済みの大会があるときも、最初は空', () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17')])
    render(<ContestEditor />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('追加すると「「名前」を追加しました」が入る', async () => {
    render(<ContestEditor />)
    fillForm('ボディコンテスト', '2026-10-17')
    await userEvent.click(screen.getByRole('button', ADD_BUTTON))
    expect(screen.getByRole('status')).toHaveTextContent('「ボディコンテスト」を追加しました')
  })

  it('続けて別の大会を追加すると、新しい名前のメッセージに替わる', async () => {
    render(<ContestEditor />)
    fillForm('一つ目の大会', '2026-10-17')
    await userEvent.click(screen.getByRole('button', ADD_BUTTON))
    fillForm('二つ目の大会', '2026-10-24')
    await userEvent.click(screen.getByRole('button', ADD_BUTTON))

    expect(screen.getByRole('status')).toHaveTextContent('「二つ目の大会」を追加しました')
    expect(screen.getByRole('status')).not.toHaveTextContent('一つ目の大会')
  })

  it('削除（確認で OK）すると「「名前」を削除しました」が入る', async () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17', 'c1')])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ContestEditor />)
    await userEvent.click(screen.getByRole('button', { name: 'ボディコンテストを削除' }))
    expect(screen.getByRole('status')).toHaveTextContent('「ボディコンテスト」を削除しました')
  })

  it('削除をキャンセルしたら、メッセージは変わらない（空のまま）', async () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17', 'c1')])
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ContestEditor />)
    await userEvent.click(screen.getByRole('button', { name: 'ボディコンテストを削除' }))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('追加のあとで削除をキャンセルしても、追加のメッセージのまま', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ContestEditor />)
    fillForm('ボディコンテスト', '2026-10-17')
    await userEvent.click(screen.getByRole('button', ADD_BUTTON))
    await userEvent.click(screen.getByRole('button', { name: 'ボディコンテストを削除' }))
    expect(screen.getByRole('status')).toHaveTextContent('「ボディコンテスト」を追加しました')
  })

  it('最後の1件を削除して行が無くなっても、status の領域は残ってメッセージが入る', async () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17', 'c1')])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ContestEditor />)
    await userEvent.click(screen.getByRole('button', { name: 'ボディコンテストを削除' }))
    expect(screen.getByRole('status')).toHaveTextContent('「ボディコンテスト」を削除しました')
  })

  it('不正な追加（disabled のボタン）ではメッセージは出ない', async () => {
    render(<ContestEditor />)
    fillForm('ボディコンテスト', '0002-10-17')
    await userEvent.click(screen.getByRole('button', ADD_BUTTON))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})

describe('ContestEditor — フォーカスの行き先', () => {
  it('追加したあと、フォーカスは追加フォームの名前欄に戻る', async () => {
    render(<ContestEditor />)
    fillForm('ボディコンテスト', '2026-10-17')
    await userEvent.click(screen.getByRole('button', ADD_BUTTON))
    expect(nameInput()).toHaveFocus()
  })

  it('Enter キーで追加したときも、フォーカスは名前欄にある', async () => {
    render(<ContestEditor />)
    fillForm('ボディコンテスト', '2026-10-17')
    nameInput().focus()
    await userEvent.keyboard('{Enter}')
    expect(readStoredContests()).toHaveLength(1)
    expect(nameInput()).toHaveFocus()
  })

  it('削除（確認で OK）したあと、フォーカスは追加フォームの名前欄へ移る（押したボタンが消えて body に落ちない）', async () => {
    seedContests([
      makeContest('ボディコンテスト', '2026-10-17', 'c1'),
      makeContest('秋の大会', '2026-11-03', 'c2'),
    ])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ContestEditor />)
    await userEvent.click(screen.getByRole('button', { name: 'ボディコンテストを削除' }))

    expect(screen.queryByLabelText('ボディコンテストの名前')).not.toBeInTheDocument()
    expect(nameInput()).toHaveFocus()
    expect(document.body).not.toHaveFocus()
  })

  it('最後の1件を削除したあとも、フォーカスは名前欄にある', async () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17', 'c1')])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ContestEditor />)
    await userEvent.click(screen.getByRole('button', { name: 'ボディコンテストを削除' }))
    expect(nameInput()).toHaveFocus()
  })

  it('削除をキャンセルしたときは、フォーカスを動かさない（押したボタンのまま）', async () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17', 'c1')])
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ContestEditor />)
    const remove = screen.getByRole('button', { name: 'ボディコンテストを削除' })
    await userEvent.click(remove)
    expect(remove).toHaveFocus()
  })
})
