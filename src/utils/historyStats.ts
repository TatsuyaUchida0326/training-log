import type { TrainingRecord } from '../types'
import { calcRM } from './training'

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

  // 日付ごとに集計
  const byDate = new Map<string, TrainingRecord[]>()
  sorted.forEach((r) => {
    if (r.sets.length === 0) return
    if (!byDate.has(r.date)) byDate.set(r.date, [])
    byDate.get(r.date)!.push(r)
  })

  const trainedDates: string[] = []
  const maxWeight: GraphPoint[] = []
  const maxRM: GraphPoint[] = []
  const totalSets: GraphPoint[] = []
  const totalVolume: GraphPoint[] = []

  byDate.forEach((dayRecords, date) => {
    trainedDates.push(date)

    let dayMaxWeight = 0
    let dayMaxRM = 0
    let daySets = 0
    let dayVolume = 0

    dayRecords.forEach((record) => {
      record.sets.forEach((s) => {
        dayMaxWeight = Math.max(dayMaxWeight, s.weight)
        dayMaxRM = Math.max(dayMaxRM, calcRM(s.weight, s.reps))
        daySets += 1
        dayVolume += s.weight * s.reps
      })
    })

    maxWeight.push({ date, value: Math.round(dayMaxWeight * 10) / 10 })
    maxRM.push({ date, value: Math.round(dayMaxRM * 10) / 10 })
    totalSets.push({ date, value: daySets })
    totalVolume.push({ date, value: Math.round(dayVolume) })
  })

  return { trainedDates, maxWeight, maxRM, totalSets, totalVolume }
}
