import { buildSampleData } from '../data/sampleTrainingData'
import { STORAGE_KEY as BODY_RECORDS_KEY } from '../hooks/useBodyRecords'
import { STORAGE_KEY as BODY_SETTINGS_KEY } from '../hooks/useBodySettings'
import { STORAGE_KEY as RECORDS_KEY } from '../hooks/useTrainingRecords'
import type { Exercise } from '../types'

/**
 * デモ用のサンプルデータを localStorage に上書き保存する。
 * 既存のトレーニング記録・体組成記録・体組成の設定（身長と目標値）は置き換わる。
 * 記録設定（継続の達成条件・単位）と種目一覧には触れない。
 * 元に戻したいときは設定画面の「全データをリセット」を使う。
 */
export function applySampleData(exercises: Exercise[], today: Date): void {
  const { records, bodyRecords, bodySettings } = buildSampleData(exercises, today)
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
  localStorage.setItem(BODY_RECORDS_KEY, JSON.stringify(bodyRecords))
  localStorage.setItem(BODY_SETTINGS_KEY, JSON.stringify(bodySettings))
}
