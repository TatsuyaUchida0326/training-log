import { screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FIVE_COUNTDOWNS, countdown, nestedGoalRows, queryNestedGoalList } from '../../test/contests'
import { setupFixedClock } from '../../test/fixedClock'
import { renderGoalCard as renderCard } from '../../test/renderGoalCard'
import type { GoalProgress } from '../../utils/goals'

/**
 * 大会の目標（source: 'contest'）があるとき、目標の行は、その大会（contestId が一致する行）の中に入れ子で出る。
 * 一致する行が表示されていないとき、それ以外（全部 'base'・countdowns が空）は今までと完全に同じ DOM（独立した「目標までの残り」リスト）。
 */

setupFixedClock(new Date(2026, 9, 5, 12))

const CONTEST_LIST = { name: '大会までの残り日数' }
const STANDALONE_GOAL_LIST = { name: '目標までの残り' }
/** 「{大会名}の目標までの残り」。独立リストの「目標までの残り」には当たらない（前に大会名が要る） */
const ANY_NESTED_GOAL_LIST = { name: /.+の目標までの残り$/ }

const WEIGHT_CONTEST: GoalProgress = {
  metric: 'weight',
  current: 68.2,
  target: 65,
  remaining: 3.2,
  status: 'decrease',
  source: 'contest',
  contestId: 'c1',
}

const BODY_FAT_BASE: GoalProgress = {
  metric: 'bodyFat',
  current: 20,
  target: 15,
  remaining: 5,
  status: 'decrease',
  source: 'base',
}

const MUSCLE_CONTEST: GoalProgress = {
  metric: 'muscleMass',
  current: 38.5,
  target: 39.5,
  remaining: 1,
  status: 'increase',
  source: 'contest',
  contestId: 'c1',
}

const WEIGHT_BASE: GoalProgress = { ...WEIGHT_CONTEST, source: 'base', contestId: undefined }

const BODY_CONTEST = countdown('c1', 'ボディコンテスト', '2026-10-17', 12)
const AUTUMN_CONTEST = countdown('c2', '秋の大会', '2026-11-03', 29)

/** 大会のリストの直下の行だけ（入れ子の目標の行は含まない） */
function topLevelContestRows(): HTMLElement[] {
  const list = screen.getByRole('list', CONTEST_LIST)
  return Array.from(list.children).filter((child): child is HTMLElement => child.tagName === 'LI')
}

describe('GoalCard — 大会の目標があるとき（入れ子）', () => {
  it('一番近い大会の行の中に「{大会名}の目標までの残り」のリストが出る', () => {
    renderCard({ goals: [WEIGHT_CONTEST], countdowns: [BODY_CONTEST] })
    expect(screen.getByRole('list', { name: 'ボディコンテストの目標までの残り' })).toBeInTheDocument()
  })

  it('そのリストは大会のリストの先頭の listitem の中にある', () => {
    renderCard({ goals: [WEIGHT_CONTEST], countdowns: [BODY_CONTEST, AUTUMN_CONTEST] })
    const [first, second] = topLevelContestRows()
    const nested = screen.getByRole('list', { name: 'ボディコンテストの目標までの残り' })
    expect(first).toContainElement(nested)
    expect(second).not.toContainElement(nested)
    expect(nested.closest('li')).toBe(first)
  })

  it('入れ子のリストは大会のリストの外には無い（大会のリストの子孫になる）', () => {
    renderCard({ goals: [WEIGHT_CONTEST], countdowns: [BODY_CONTEST] })
    const contestList = screen.getByRole('list', CONTEST_LIST)
    expect(contestList).toContainElement(screen.getByRole('list', { name: 'ボディコンテストの目標までの残り' }))
  })

  it('独立した「目標までの残り」リストは出ない', () => {
    renderCard({ goals: [WEIGHT_CONTEST], countdowns: [BODY_CONTEST] })
    expect(screen.queryByRole('list', STANDALONE_GOAL_LIST)).not.toBeInTheDocument()
  })

  it('入れ子のリストは role="list" を明示している（Safari 対策。独立リストと同じ）', () => {
    renderCard({ goals: [WEIGHT_CONTEST], countdowns: [BODY_CONTEST] })
    const nested = screen.getByRole('list', { name: 'ボディコンテストの目標までの残り' })
    expect(nested).toHaveAttribute('role', 'list')
    expect(nested.tagName).toBe('UL')
  })

  it('aria-label は先頭の大会の名前になる（2件目の大会の名前ではない）', () => {
    renderCard({ goals: [WEIGHT_CONTEST], countdowns: [BODY_CONTEST, AUTUMN_CONTEST] })
    expect(queryNestedGoalList('ボディコンテスト')).toBeInTheDocument()
    expect(queryNestedGoalList('秋の大会')).not.toBeInTheDocument()
  })

  it('大会の行そのもの（名前・日付・あと ◯ 日）は今までどおり出る', () => {
    renderCard({ goals: [WEIGHT_CONTEST], countdowns: [BODY_CONTEST] })
    const [row] = topLevelContestRows()
    expect(row).toHaveTextContent('ボディコンテスト')
    expect(row).toHaveTextContent('10月17日（土）')
    expect(row).toHaveTextContent(/あと\s*12\s*日/)
  })

  it('入れ子の行の文言は今までと同じ（68.2 → 目標 65.0 kg ／ あと 3.2 kg 減）', () => {
    renderCard({ goals: [WEIGHT_CONTEST], countdowns: [BODY_CONTEST] })
    const [row] = nestedGoalRows('ボディコンテスト')
    expect(row).toHaveTextContent('体重')
    expect(row).toHaveTextContent('68.2 → 目標 65.0 kg')
    expect(row).toHaveTextContent(/あと\s*3\.2\s*kg\s*減/)
  })

  it('増やす目標は「あと ◯ kg 増」、体脂肪率の単位は %', () => {
    renderCard({ goals: [MUSCLE_CONTEST, { ...BODY_FAT_BASE, source: 'contest', contestId: 'c1' }], countdowns: [BODY_CONTEST] })
    const rows = nestedGoalRows('ボディコンテスト')
    expect(rows[0]).toHaveTextContent('38.5 → 目標 39.5 kg')
    expect(rows[0]).toHaveTextContent(/あと\s*1\.0\s*kg\s*増/)
    expect(rows[1]).toHaveTextContent('20.0 → 目標 15.0 %')
  })

  it('達成は「達成」と出て、「あと」は出ない', () => {
    const achieved: GoalProgress = { ...WEIGHT_CONTEST, current: 64.5, remaining: 0, status: 'achieved' }
    renderCard({ goals: [achieved], countdowns: [BODY_CONTEST] })
    const [row] = nestedGoalRows('ボディコンテスト')
    expect(row).toHaveTextContent('達成')
    expect(row).not.toHaveTextContent('あと')
  })

  it("'base' の項目も同じ入れ子の中に、今までと同じ順で並ぶ", () => {
    renderCard({
      goals: [WEIGHT_CONTEST, BODY_FAT_BASE, MUSCLE_CONTEST],
      countdowns: [BODY_CONTEST],
    })
    const rows = nestedGoalRows('ボディコンテスト')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('体重')
    expect(rows[1]).toHaveTextContent('体脂肪率')
    expect(rows[2]).toHaveTextContent('筋肉量')
    expect(screen.queryByRole('list', STANDALONE_GOAL_LIST)).not.toBeInTheDocument()
  })

  it("大会の目標が1つでもあれば、'base' だけの項目が先頭に来る並びでも全部が入れ子に入る", () => {
    renderCard({ goals: [WEIGHT_BASE, MUSCLE_CONTEST], countdowns: [BODY_CONTEST] })
    const rows = nestedGoalRows('ボディコンテスト')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('体重')
    expect(rows[1]).toHaveTextContent('筋肉量')
    expect(screen.queryByRole('list', STANDALONE_GOAL_LIST)).not.toBeInTheDocument()
  })

  it('行の数は項目の数と同じ（大会の行の入れ子の中の listitem だけを数える）', () => {
    renderCard({ goals: [WEIGHT_CONTEST, BODY_FAT_BASE], countdowns: [BODY_CONTEST, AUTUMN_CONTEST] })
    expect(nestedGoalRows('ボディコンテスト')).toHaveLength(2)
    expect(topLevelContestRows()).toHaveLength(2)
  })

  it('2件目以降の大会の行には、目標の入れ子は付かない', () => {
    renderCard({ goals: [WEIGHT_CONTEST], countdowns: [BODY_CONTEST, AUTUMN_CONTEST] })
    const second = topLevelContestRows()[1]
    expect(within(second).queryByRole('list')).not.toBeInTheDocument()
    expect(second).toHaveTextContent('秋の大会')
  })

  it('大会の当日（今日）の行にも入れ子で出る', () => {
    renderCard({
      goals: [WEIGHT_CONTEST],
      countdowns: [countdown('c1', '今日の大会', '2026-10-05', 0)],
    })
    const [row] = topLevelContestRows()
    expect(row).toHaveTextContent('今日')
    expect(within(row).getByRole('list', { name: '今日の大会の目標までの残り' })).toBeInTheDocument()
  })

  it('カードの外側は div 1枚のまま、リストは大会のリスト1つだけ（入れ子を除く）', () => {
    const { container } = renderCard({ goals: [WEIGHT_CONTEST], countdowns: [BODY_CONTEST], className: 'spacing' })
    const card = container.firstElementChild as HTMLElement
    expect(card.tagName).toBe('DIV')
    expect(card).toHaveClass('spacing')
    expect(container.children).toHaveLength(1)
    expect(screen.getAllByRole('list')).toHaveLength(2) // 大会のリスト + 入れ子の目標のリスト
  })

  it('大会名に HTML 風の文字があっても aria-label と表示は文字として扱う', () => {
    renderCard({
      goals: [WEIGHT_CONTEST],
      countdowns: [countdown('c1', '<b>強調</b>大会', '2026-10-17', 12)],
    })
    expect(screen.getByRole('list', { name: '<b>強調</b>大会の目標までの残り' })).toBeInTheDocument()
  })

  it('30文字の大会名でも aria-label に全文が入る', () => {
    const longName = '全日本ボディビル選手権大会ジュニア部門の予選会兼選考会の最終日です'.slice(0, 30)
    renderCard({ goals: [WEIGHT_CONTEST], countdowns: [countdown('c1', longName, '2026-10-17', 12)] })
    expect(screen.getByRole('list', { name: `${longName}の目標までの残り` })).toBeInTheDocument()
  })
})

describe('GoalCard — 入れ子の置き場所は contestId が一致する行（先頭という位置では決めない）', () => {
  const SECOND_CONTEST_GOAL: GoalProgress = { ...WEIGHT_CONTEST, contestId: 'c2' }

  it('contestId が2件目の大会と一致すれば、2件目の行の中に入れ子で出る（先頭の行には出ない）', () => {
    renderCard({ goals: [SECOND_CONTEST_GOAL], countdowns: [BODY_CONTEST, AUTUMN_CONTEST] })
    const [first, second] = topLevelContestRows()
    const nested = screen.getByRole('list', { name: '秋の大会の目標までの残り' })
    expect(second).toContainElement(nested)
    expect(first).not.toContainElement(nested)
    expect(queryNestedGoalList('ボディコンテスト')).not.toBeInTheDocument()
    expect(screen.queryByRole('list', STANDALONE_GOAL_LIST)).not.toBeInTheDocument()
  })

  it('入れ子の中の行（ふだんの目標も同じ並び）は、置き場所が変わっても同じ文言', () => {
    renderCard({ goals: [SECOND_CONTEST_GOAL, BODY_FAT_BASE], countdowns: [BODY_CONTEST, AUTUMN_CONTEST] })
    const rows = nestedGoalRows('秋の大会')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('68.2 → 目標 65.0 kg')
    expect(rows[1]).toHaveTextContent('体脂肪率')
  })

  it('contestId が countdowns のどの大会とも一致しなければ、独立した「目標までの残り」リストで出す', () => {
    renderCard({ goals: [{ ...WEIGHT_CONTEST, contestId: 'unknown' }, BODY_FAT_BASE], countdowns: [BODY_CONTEST] })
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
    const goalList = screen.getByRole('list', STANDALONE_GOAL_LIST)
    expect(within(goalList).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('list', CONTEST_LIST)).not.toContainElement(goalList)
  })

  it('contestId が無い contest の目標は、一致する行が無いので独立リスト', () => {
    renderCard({ goals: [{ ...WEIGHT_CONTEST, contestId: undefined }], countdowns: [BODY_CONTEST] })
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
    expect(screen.getByRole('list', STANDALONE_GOAL_LIST)).toBeInTheDocument()
  })

  it('contestId の大会が3件の外（4件目以降で行に出ていない）なら、独立リスト。「ほか N 件」も出る', () => {
    renderCard({ goals: [{ ...WEIGHT_CONTEST, contestId: 'c4' }], countdowns: FIVE_COUNTDOWNS })
    expect(topLevelContestRows()).toHaveLength(3)
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
    expect(screen.getByRole('list', STANDALONE_GOAL_LIST)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ほか\s*2\s*件/ })).toBeInTheDocument()
  })

  it('contestId の大会が3件目なら、3件目の行に入れ子で出る', () => {
    renderCard({ goals: [{ ...WEIGHT_CONTEST, contestId: 'c3' }], countdowns: FIVE_COUNTDOWNS })
    expect(screen.getByRole('list', { name: '大会さんの目標までの残り' })).toBeInTheDocument()
    expect(topLevelContestRows()[2]).toContainElement(screen.getByRole('list', { name: '大会さんの目標までの残り' }))
  })

  it('入れ子は1か所だけ（大会の行の中の目標のリストは1つ）', () => {
    renderCard({ goals: [SECOND_CONTEST_GOAL, BODY_FAT_BASE], countdowns: [BODY_CONTEST, AUTUMN_CONTEST] })
    expect(screen.getAllByRole('list', ANY_NESTED_GOAL_LIST)).toHaveLength(1)
  })
})

describe('GoalCard — 「ほか N 件」リンクは今までどおり', () => {
  const FIVE = FIVE_COUNTDOWNS

  it('5件のとき、先頭3件の行（先頭の行に入れ子）と、リストの外に「ほか 2 件」のリンク', () => {
    renderCard({ goals: [WEIGHT_CONTEST], countdowns: FIVE })
    expect(topLevelContestRows()).toHaveLength(3)
    expect(screen.getByRole('list', { name: '大会いちの目標までの残り' })).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /ほか\s*2\s*件/ })
    expect(link).toHaveAttribute('href', '/body')
    expect(screen.getByRole('list', CONTEST_LIST)).not.toContainElement(link)
  })

  it('リンクは1つだけで、入れ子の中には入らない', () => {
    renderCard({ goals: [WEIGHT_CONTEST, BODY_FAT_BASE], countdowns: FIVE })
    expect(screen.getAllByRole('link')).toHaveLength(1)
    const nested = screen.getByRole('list', { name: '大会いちの目標までの残り' })
    expect(nested).not.toContainElement(screen.getByRole('link'))
  })

  it('3件以下ならリンクは出ない', () => {
    renderCard({ goals: [WEIGHT_CONTEST], countdowns: FIVE.slice(0, 3) })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

describe("GoalCard — 全部 'base' のときは今までと完全に同じ DOM", () => {
  it('入れ子は出ず、独立した「目標までの残り」リストが大会のリストの後に出る', () => {
    renderCard({ goals: [WEIGHT_BASE, BODY_FAT_BASE], countdowns: [BODY_CONTEST] })
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
    const contestList = screen.getByRole('list', CONTEST_LIST)
    const goalList = screen.getByRole('list', STANDALONE_GOAL_LIST)
    expect(contestList).not.toContainElement(goalList)
    expect(contestList.compareDocumentPosition(goalList) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(goalList).getAllByRole('listitem')).toHaveLength(2)
  })

  it('大会の行の中には list が無い', () => {
    renderCard({ goals: [WEIGHT_BASE], countdowns: [BODY_CONTEST] })
    expect(within(topLevelContestRows()[0]).queryByRole('list')).not.toBeInTheDocument()
  })

  it('大会が無く目標だけ（base）でも、今までと同じ独立リスト', () => {
    renderCard({ goals: [WEIGHT_BASE] })
    expect(screen.getByRole('list', STANDALONE_GOAL_LIST)).toBeInTheDocument()
    expect(screen.queryByRole('list', CONTEST_LIST)).not.toBeInTheDocument()
  })

  it('大会が無く goals も空なら何も描画しない', () => {
    const { container } = renderCard({ goals: [], countdowns: [] })
    expect(container).toBeEmptyDOMElement()
  })
})

describe("GoalCard — source: 'contest' があっても countdowns が空なら独立リスト（今までと同じ DOM）", () => {
  it('countdowns が空配列', () => {
    renderCard({ goals: [WEIGHT_CONTEST, BODY_FAT_BASE], countdowns: [] })
    expect(screen.getByRole('list', STANDALONE_GOAL_LIST)).toBeInTheDocument()
    expect(screen.queryByRole('list', CONTEST_LIST)).not.toBeInTheDocument()
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
    expect(within(screen.getByRole('list', STANDALONE_GOAL_LIST)).getAllByRole('listitem')).toHaveLength(2)
  })

  it('countdowns を渡さない', () => {
    renderCard({ goals: [WEIGHT_CONTEST] })
    expect(screen.getByRole('list', STANDALONE_GOAL_LIST)).toBeInTheDocument()
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
  })

  it('独立リストの行の文言も今までと同じ', () => {
    renderCard({ goals: [WEIGHT_CONTEST] })
    const [row] = within(screen.getByRole('list', STANDALONE_GOAL_LIST)).getAllByRole('listitem')
    expect(row).toHaveTextContent('68.2 → 目標 65.0 kg')
    expect(row).toHaveTextContent(/あと\s*3\.2\s*kg\s*減/)
  })
})

describe('GoalCard — 目標が無い（goals が空）とき', () => {
  it('大会だけが出て、入れ子も目標のリストも出ない', () => {
    renderCard({ goals: [], countdowns: [BODY_CONTEST] })
    expect(screen.getByRole('list', CONTEST_LIST)).toBeInTheDocument()
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
    expect(screen.queryByRole('list', STANDALONE_GOAL_LIST)).not.toBeInTheDocument()
    expect(within(topLevelContestRows()[0]).queryByRole('list')).not.toBeInTheDocument()
  })
})
