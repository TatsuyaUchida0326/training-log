import type { BodyRecord, BodySettings, GoalMetric, GoalValues } from '../types'
import { calcBody } from './body'
import { GOAL_METRICS } from './goalMetrics'
import { isUsableNumber } from './number'

/**
 * 体組成の記録から、項目ごとの値を読む部分。目標（goals.ts）と大会の目標（contestGoals.ts）が共有する。
 * 値は体重 kg・体脂肪率 %・筋肉量 kg。丸めない（起点の値に生の値を残すため）。
 */

/** 1日の記録から、その項目の値を読む。入っていなければ null */
export type MetricReader = (record: BodyRecord) => number | null

function usableOrNull(value: unknown): number | null {
  return isUsableNumber(value) ? value : null
}

export function metricReaders(settings: BodySettings): Record<GoalMetric, MetricReader> {
  return {
    weight: (record) => usableOrNull(record.weight),
    bodyFat: (record) => usableOrNull(record.bodyFat),
    muscleMass: (record) =>
      calcBody(
        { ...record, weight: usableOrNull(record.weight), muscleMass: usableOrNull(record.muscleMass) },
        settings,
      ).muscleMassKg,
  }
}

/** 日付は 'YYYY-MM-DD' なので文字列比較で新しい順になる。元の配列は並べ替えない */
function recordsNewestFirst(records: BodyRecord[]): BodyRecord[] {
  return [...records].sort((a, b) => b.date.localeCompare(a.date))
}

/** 並びの先頭から探して、その項目が入っている最初の記録の値。無ければ null */
function firstValue(records: BodyRecord[], read: MetricReader): number | null {
  for (const record of records) {
    const value = read(record)
    if (value !== null) return value
  }
  return null
}

/**
 * 項目ごとの現在値。その項目が入っている一番新しい日付の記録から取る（配列の並びには依存しない）。
 * 一度も記録していない項目、数値でない値の日は「値なし」として古い日へ遡る。
 */
export function latestMeasuredValues(records: BodyRecord[], settings: BodySettings): GoalValues {
  const sorted = recordsNewestFirst(records)
  const readers = metricReaders(settings)

  const values: GoalValues = {}
  for (const metric of GOAL_METRICS) {
    const value = firstValue(sorted, readers[metric])
    if (value !== null) values[metric] = value
  }
  return values
}

/**
 * 指定した日の時点の値。その日以前でその項目が入っている一番新しい記録を優先し、
 * 無いときだけ、その日より後で一番古い記録を使う。どちらも無ければ undefined。
 * 記録を始める前の日付を指定されても、始めたあとの最初の値で代用できるようにする。
 */
export function baselineAsOf(
  records: BodyRecord[],
  read: MetricReader,
  asOfDate: string,
): number | undefined {
  const sorted = recordsNewestFirst(records)
  const onOrBefore = firstValue(sorted.filter((record) => record.date <= asOfDate), read)
  if (onOrBefore !== null) return onOrBefore
  const after = firstValue(sorted.filter((record) => record.date > asOfDate).reverse(), read)
  return after ?? undefined
}
