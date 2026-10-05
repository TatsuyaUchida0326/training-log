import { addDays, format } from 'date-fns'
import { SAMPLE_START_VALUES, buildSampleData, samplePeriodStart } from '../data/sampleTrainingData'
import { STORAGE_KEY as BODY_RECORDS_KEY } from '../hooks/useBodyRecords'
import { STORAGE_KEY as BODY_SETTINGS_KEY } from '../hooks/useBodySettings'
import { STORAGE_KEY as CONTESTS_KEY } from '../hooks/useContests'
import { STORAGE_KEY as RECORDS_KEY } from '../hooks/useTrainingRecords'
import type { Contest, Exercise, GoalValues } from '../types'
import { writeStoredValue } from './storage'

/**
 * サンプルの大会までの日数。ホームに「あと ◯ 日」が出る。
 * カレンダーの印は、当月に入る日と翌月になる日がある。遠いと当月には一度も出ないので、近くしてある。
 */
export const SAMPLE_CONTEST_DAYS_AHEAD = 14

/**
 * サンプルの大会の目標。ふだんの目標（SAMPLE_BODY_SETTINGS）より少し手前の値にして、
 * サンプルの体組成の推移（体重・体脂肪率は減り、筋肉量は増える）に対して3項目とも向きが合い、
 * 「達成」にならずに「あと ◯」が見えるようにしてある。
 */
const SAMPLE_CONTEST_TARGETS: GoalValues = { weight: 72.5, bodyFat: 19.0, muscleMass: 26.0 }

function buildSampleContests(today: Date): Contest[] {
  // 目標を入れた・変えた日は、サンプル期間の最初の日（体組成の記録が始まる日）。値はその日の値（SAMPLE_START_VALUES）
  const originDate = format(samplePeriodStart(today), 'yyyy-MM-dd')
  return [
    {
      id: 'sample-contest',
      name: '地区ボディコンテスト',
      date: format(addDays(today, SAMPLE_CONTEST_DAYS_AHEAD), 'yyyy-MM-dd'),
      targets: SAMPLE_CONTEST_TARGETS,
      targetOrigins: {
        weight: { date: originDate, value: SAMPLE_START_VALUES.weight },
        bodyFat: { date: originDate, value: SAMPLE_START_VALUES.bodyFat },
        muscleMass: { date: originDate, value: SAMPLE_START_VALUES.muscleMass },
      },
    },
  ]
}

/**
 * デモ用のサンプルデータを localStorage に上書き保存する。
 * 既存のトレーニング記録・体組成記録・体組成の設定（身長と目標値）・大会は置き換わる。
 * 記録設定（継続の達成条件・単位）と種目一覧には触れない。
 * 元に戻したいときは設定画面の「全データをリセット」を使う。
 */
export function applySampleData(exercises: Exercise[], today: Date): void {
  const { records, bodyRecords, bodySettings } = buildSampleData(exercises, today)
  writeStoredValue(RECORDS_KEY, records)
  writeStoredValue(BODY_RECORDS_KEY, bodyRecords)
  writeStoredValue(BODY_SETTINGS_KEY, bodySettings)
  writeStoredValue(CONTESTS_KEY, buildSampleContests(today))
}
