import { addDays, format, startOfDay, subDays } from 'date-fns'
import type { BodyRecord, BodySettings, Exercise, TrainingRecord, TrainingSet } from '../types'

/**
 * デモ用のサンプルデータを組み立てる。
 *
 * 「今日」を基準に直近 SAMPLE_PERIOD_DAYS 日ぶんを毎回その場で作るため、
 * 何か月後に開いても常に「直近1か月の記録」として見える（日付を埋め込まない）。
 * 乱数は固定シードの疑似乱数なので、同じ today を渡せば結果は必ず同じになる。
 */

/** 生成する期間。今日を含む直近の日数 */
export const SAMPLE_PERIOD_DAYS = 35

/** 疑似乱数の種。値そのものに意味はなく、毎回同じ結果を得るために固定する */
const TRAINING_RANDOM_SEED = 20260923
const BODY_RANDOM_SEED = 20260924

/** 1種目めだけセット数を増やし、メインセットらしく見せる */
const FIRST_EXERCISE_SET_COUNT = 4
const OTHER_EXERCISE_SET_COUNT = 3

/** 回数の下限・上限。これを外れないようにクランプする */
const MIN_REPS = 5
const MAX_REPS = 12

/** 同じ種目をこなすたびに重量が伸びる割合（漸進性過負荷） */
const WEIGHT_GROWTH_RATE_PER_SESSION = 0.025

/** メモを入れるトレーニング回の間隔。全セットには入れない */
const MEMO_SESSION_INTERVAL = 4

const SET_MEMOS = [
  'フォーム良好',
  '最後の1回がきつい',
  '前回より軽く感じた',
  '少し重すぎたので次回は据え置き',
]

/** 体組成の推移。開始値から1日あたりの変化量を足し引きして作る */
const START_WEIGHT_KG = 74.8
const WEIGHT_CHANGE_PER_DAY_KG = -0.045
const START_BODY_FAT_PERCENT = 22.4
const BODY_FAT_CHANGE_PER_DAY_PERCENT = -0.055
const START_MUSCLE_MASS_PERCENT = 33.2
const MUSCLE_MASS_CHANGE_PER_DAY_PERCENT = 0.03
const START_WAIST_CM = 82.5
const WAIST_CHANGE_PER_DAY_CM = -0.05

/** 体組成を測る間隔。3日のうち2日記録する（1日おきに近いが抜けもある形） */
const BODY_RECORD_SKIP_CYCLE = 3

interface SampleExercisePlan {
  /** 既定種目の名前で引く。id は環境によって変わるため保持しない */
  name: string
  baseWeightKg: number
  /** 重量の刻み。バーベル種目は 2.5kg、小物は 1.25kg */
  weightStepKg: number
  /** 1セットめの目安回数。後のセットほど少し落ちる */
  baseReps: number
}

/** Push / Pull / Legs の3分割。トレーニング回ごとに順番に回す */
const SPLIT_MENUS: SampleExercisePlan[][] = [
  // Push
  [
    { name: 'ベンチプレス', baseWeightKg: 60, weightStepKg: 2.5, baseReps: 10 },
    { name: 'インクラインベンチプレス', baseWeightKg: 45, weightStepKg: 2.5, baseReps: 10 },
    { name: 'ショルダープレス', baseWeightKg: 35, weightStepKg: 2.5, baseReps: 10 },
    { name: 'サイドレイズ', baseWeightKg: 10, weightStepKg: 1.25, baseReps: 12 },
  ],
  // Pull
  [
    { name: 'デッドリフト', baseWeightKg: 90, weightStepKg: 2.5, baseReps: 8 },
    { name: 'ラットプルダウン', baseWeightKg: 50, weightStepKg: 2.5, baseReps: 11 },
    { name: 'シーテッドロウ', baseWeightKg: 45, weightStepKg: 2.5, baseReps: 11 },
    { name: 'バーベルカール', baseWeightKg: 25, weightStepKg: 1.25, baseReps: 11 },
  ],
  // Legs
  [
    { name: 'スクワット', baseWeightKg: 75, weightStepKg: 2.5, baseReps: 9 },
    { name: 'レッグプレス', baseWeightKg: 110, weightStepKg: 2.5, baseReps: 11 },
    { name: 'レッグカール', baseWeightKg: 35, weightStepKg: 1.25, baseReps: 12 },
    { name: 'クランチ', baseWeightKg: 0, weightStepKg: 1.25, baseReps: 12 },
  ],
]

/**
 * 固定シードの疑似乱数（mulberry32）。
 * Math.random() を使うと生成結果が毎回変わり、テストで検証できなくなるため自前で持つ。
 */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

function roundToStep(valueKg: number, stepKg: number): number {
  return Math.round(valueKg / stepKg) * stepKg
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

/** -amplitude 〜 +amplitude のばらつき。直線的すぎるグラフを避けるために足す */
function jitter(random: () => number, amplitude: number): number {
  return (random() * 2 - 1) * amplitude
}

/** その種目を何回目にこなすかで重量を決める。刻み幅に丸めるので同じ重量が続く週もある */
function progressedWeightKg(plan: SampleExercisePlan, occurrenceIndex: number): number {
  if (plan.baseWeightKg === 0) return 0
  const grown = plan.baseWeightKg * (1 + WEIGHT_GROWTH_RATE_PER_SESSION * occurrenceIndex)
  return roundToStep(grown, plan.weightStepKg)
}

/** 後のセットほど1回ずつ落ち、さらに 0〜1回ぶんのばらつきが乗る */
function progressedReps(baseReps: number, setIndex: number, random: () => number): number {
  const fatigueDrop = setIndex + Math.round(random())
  return Math.min(MAX_REPS, Math.max(MIN_REPS, baseReps - fatigueDrop))
}

/** トレーニング回の先頭セットにだけ、数回に1度メモを添える */
function memoForSet(sessionIndex: number, exerciseIndex: number, setIndex: number): string {
  const isMemoTarget =
    sessionIndex % MEMO_SESSION_INTERVAL === 1 && exerciseIndex === 0 && setIndex === 0
  if (!isMemoTarget) return ''
  const memoIndex = Math.floor(sessionIndex / MEMO_SESSION_INTERVAL) % SET_MEMOS.length
  return SET_MEMOS[memoIndex]
}

/** 月・水・金＋隔週の土曜をトレーニング日にする */
function collectSessionDates(startDate: Date): Date[] {
  const WEEKDAY_SESSION_DAYS = [1, 3, 5] // 月・水・金
  const SATURDAY = 6
  const DAYS_PER_WEEK = 7

  const sessionDates: Date[] = []
  for (let dayOffset = 0; dayOffset < SAMPLE_PERIOD_DAYS; dayOffset += 1) {
    const date = addDays(startDate, dayOffset)
    const weekday = date.getDay()
    const weekIndex = Math.floor(dayOffset / DAYS_PER_WEEK)
    const isWeekdaySession = WEEKDAY_SESSION_DAYS.includes(weekday)
    const isBiweeklySaturday = weekday === SATURDAY && weekIndex % 2 === 1
    if (isWeekdaySession || isBiweeklySaturday) sessionDates.push(date)
  }
  return sessionDates
}

function buildTrainingRecords(
  exercises: Exercise[],
  startDate: Date,
  random: () => number,
): TrainingRecord[] {
  const exerciseIdByName = new Map(exercises.map((exercise) => [exercise.name, exercise.id]))
  const occurrenceCountByName = new Map<string, number>()
  const records: TrainingRecord[] = []

  collectSessionDates(startDate).forEach((sessionDate, sessionIndex) => {
    const dateString = format(sessionDate, 'yyyy-MM-dd')
    const menu = SPLIT_MENUS[sessionIndex % SPLIT_MENUS.length]

    menu.forEach((plan, exerciseIndex) => {
      const exerciseId = exerciseIdByName.get(plan.name)
      if (exerciseId === undefined) return // 種目一覧から消えている場合は飛ばす

      const occurrenceIndex = occurrenceCountByName.get(plan.name) ?? 0
      occurrenceCountByName.set(plan.name, occurrenceIndex + 1)

      const recordId = `sample-${dateString}-${exerciseId}`
      const setCount =
        exerciseIndex === 0 ? FIRST_EXERCISE_SET_COUNT : OTHER_EXERCISE_SET_COUNT
      const weightKg = progressedWeightKg(plan, occurrenceIndex)

      const sets: TrainingSet[] = Array.from({ length: setCount }, (_, setIndex) => ({
        id: `${recordId}-set-${setIndex}`,
        weight: weightKg,
        reps: progressedReps(plan.baseReps, setIndex, random),
        memo: memoForSet(sessionIndex, exerciseIndex, setIndex),
      }))

      records.push({ id: recordId, date: dateString, exerciseId, sets })
    })
  })

  return records
}

function buildBodyRecords(startDate: Date, random: () => number): BodyRecord[] {
  const bodyRecords: BodyRecord[] = []

  for (let dayOffset = 0; dayOffset < SAMPLE_PERIOD_DAYS; dayOffset += 1) {
    // 3日に1日は測り忘れた体にして、実際の記録らしい歯抜けを作る
    if (dayOffset % BODY_RECORD_SKIP_CYCLE === BODY_RECORD_SKIP_CYCLE - 1) continue

    bodyRecords.push({
      date: format(addDays(startDate, dayOffset), 'yyyy-MM-dd'),
      weight: roundToOneDecimal(
        START_WEIGHT_KG + WEIGHT_CHANGE_PER_DAY_KG * dayOffset + jitter(random, 0.2),
      ),
      bodyFat: roundToOneDecimal(
        START_BODY_FAT_PERCENT + BODY_FAT_CHANGE_PER_DAY_PERCENT * dayOffset + jitter(random, 0.15),
      ),
      muscleMass: roundToOneDecimal(
        START_MUSCLE_MASS_PERCENT +
          MUSCLE_MASS_CHANGE_PER_DAY_PERCENT * dayOffset +
          jitter(random, 0.1),
      ),
      waist: roundToOneDecimal(
        START_WAIST_CM + WAIST_CHANGE_PER_DAY_CM * dayOffset + jitter(random, 0.15),
      ),
      memo: '',
    })
  }

  return bodyRecords
}

/**
 * 体組成の設定。身長が未設定だと BMI や除脂肪体重が出ないため、
 * サンプルデータでは目標値まで含めて「一通り埋まった状態」を作る。
 */
const SAMPLE_BODY_SETTINGS: BodySettings = {
  height: 172,
  targetWeight: 72,
  muscleMassUnit: '%',
  targetBodyFat: 18,
}

/**
 * 今日を基準に直近 35 日ぶんのトレーニング記録と体組成記録を作る。
 * 種目は名前で引き、見つからないものは飛ばすので、空の種目一覧を渡しても落ちない。
 */
export function buildSampleData(
  exercises: Exercise[],
  today: Date,
): { records: TrainingRecord[]; bodyRecords: BodyRecord[]; bodySettings: BodySettings } {
  const startDate = subDays(startOfDay(today), SAMPLE_PERIOD_DAYS - 1)

  return {
    records: buildTrainingRecords(exercises, startDate, createSeededRandom(TRAINING_RANDOM_SEED)),
    bodyRecords: buildBodyRecords(startDate, createSeededRandom(BODY_RANDOM_SEED)),
    bodySettings: SAMPLE_BODY_SETTINGS,
  }
}
