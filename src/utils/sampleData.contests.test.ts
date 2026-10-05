import { addDays, format } from 'date-fns'
import { beforeEach, describe, expect, it } from 'vitest'
import { SAMPLE_CONTEST_DAYS_AHEAD, applySampleData } from './sampleData'
import { isValidContestDate, upcomingContests } from './contests'
import { DEFAULT_EXERCISES } from '../data/defaultExercises'
import { makeContest, readStoredContests, seedContests } from '../test/contests'

const TODAY = new Date(2026, 8, 23)

beforeEach(() => {
  localStorage.clear()
})

describe('applySampleData — 大会', () => {
  it('大会を1件保存する', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    expect(readStoredContests()).toHaveLength(1)
  })

  it('名前は空でなく、日付は実在する日付', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const [contest] = readStoredContests()
    expect(typeof contest.name).toBe('string')
    expect(contest.name.trim()).not.toBe('')
    expect(typeof contest.id).toBe('string')
    expect(contest.id).not.toBe('')
    expect(isValidContestDate(contest.date)).toBe(true)
  })

  it('日数の定数 SAMPLE_CONTEST_DAYS_AHEAD は正の整数として export されている', () => {
    expect(Number.isInteger(SAMPLE_CONTEST_DAYS_AHEAD)).toBe(true)
    expect(SAMPLE_CONTEST_DAYS_AHEAD).toBeGreaterThan(0)
  })

  it('今日の SAMPLE_CONTEST_DAYS_AHEAD 日後（upcomingContests に通すと daysLeft がその日数）', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const upcoming = upcomingContests(readStoredContests(), TODAY)
    expect(upcoming).toHaveLength(1)
    expect(upcoming[0].daysLeft).toBe(SAMPLE_CONTEST_DAYS_AHEAD)
    expect(readStoredContests()[0].date).toBe(
      format(addDays(TODAY, SAMPLE_CONTEST_DAYS_AHEAD), 'yyyy-MM-dd'),
    )
  })

  it('今日がいつでも SAMPLE_CONTEST_DAYS_AHEAD 日後になる（年またぎ・うるう日をまたぐ日付でも）', () => {
    for (const today of [new Date(2026, 11, 31), new Date(2028, 1, 20), new Date(2027, 11, 25, 23, 59)]) {
      localStorage.clear()
      applySampleData(DEFAULT_EXERCISES, today)
      expect(upcomingContests(readStoredContests(), today)[0].daysLeft).toBe(SAMPLE_CONTEST_DAYS_AHEAD)
    }
  })

  it('既存の大会は置き換わる（追記しない）', () => {
    seedContests([makeContest('前からある大会', '2027-05-05', 'old')])
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const stored = readStoredContests()
    expect(stored).toHaveLength(1)
    expect(stored.some((contest) => contest.id === 'old')).toBe(false)
  })

  it('2回続けて適用しても大会は1件のまま', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    applySampleData(DEFAULT_EXERCISES, TODAY)
    expect(readStoredContests()).toHaveLength(1)
  })
})
