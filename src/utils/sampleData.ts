import { addDays, format } from 'date-fns'
import { buildSampleData } from '../data/sampleTrainingData'
import { STORAGE_KEY as BODY_RECORDS_KEY } from '../hooks/useBodyRecords'
import { STORAGE_KEY as BODY_SETTINGS_KEY } from '../hooks/useBodySettings'
import { STORAGE_KEY as CONTESTS_KEY } from '../hooks/useContests'
import { STORAGE_KEY as RECORDS_KEY } from '../hooks/useTrainingRecords'
import type { Contest, Exercise } from '../types'
import { writeStoredValue } from './storage'

/** サンプルの大会までの日数。ホームの「あと 42 日」とカレンダーの印が見える程度に先にする */
const SAMPLE_CONTEST_DAYS_AHEAD = 42

function buildSampleContests(today: Date): Contest[] {
  return [
    {
      id: 'sample-contest',
      name: '地区ボディコンテスト',
      date: format(addDays(today, SAMPLE_CONTEST_DAYS_AHEAD), 'yyyy-MM-dd'),
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
