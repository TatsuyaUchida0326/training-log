import type { TrainingRecord, TrainingSet } from '../types'
import { calcRM, filledSets } from './training'

export interface GraphPoint {
  date: string   // 'YYYY-MM-DD'
  value: number
}

export interface HistoryStats {
  trainedDates: string[]    // カレンダー用マーク
  maxWeight: GraphPoint[]   // 最大重量
  maxRM: GraphPoint[]       // 最大RM
  totalSets: GraphPoint[]   // セット数
  totalVolume: GraphPoint[] // 総負荷量
}

/**
 * 対象レコード群から履歴統計を計算する
 * @param records - フィルタ済みのレコード配列
 */
export function calcHistoryStats(records: TrainingRecord[]): HistoryStats {
  // 日付順にソート
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date))

  // 日付ごとに集計（中身のあるセットだけを対象にする）
  const byDate = new Map<string, TrainingSet[]>()
  sorted.forEach((record) => {
    const sets = filledSets(record)
    if (sets.length === 0) return
    if (!byDate.has(record.date)) byDate.set(record.date, [])
    byDate.get(record.date)!.push(...sets)
  })

  const trainedDates: string[] = []
  const maxWeight: GraphPoint[] = []
  const maxRM: GraphPoint[] = []
  const totalSets: GraphPoint[] = []
  const totalVolume: GraphPoint[] = []

  byDate.forEach((daySets, date) => {
    trainedDates.push(date)

    let dayMaxWeight = 0
    let dayMaxRM = 0
    let dayVolume = 0

    daySets.forEach((set) => {
      dayMaxWeight = Math.max(dayMaxWeight, set.weight)
      dayMaxRM = Math.max(dayMaxRM, calcRM(set.weight, set.reps))
      dayVolume += set.weight * set.reps
    })

    // kg の生値で返す。ここで丸めると lbs 換算時に二段丸めになり、
    // 日付詳細画面（換算してから1回だけ丸める）と表示値がずれる。
    maxWeight.push({ date, value: dayMaxWeight })
    // dayMaxRM は calcRM が 0.1 単位に丸めた値の最大なので、ここでの丸めは不要
    maxRM.push({ date, value: dayMaxRM })
    totalSets.push({ date, value: daySets.length })
    totalVolume.push({ date, value: dayVolume })
  })

  return { trainedDates, maxWeight, maxRM, totalSets, totalVolume }
}
