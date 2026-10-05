import type React from 'react'

export type TabName = 'home' | 'history' | 'body' | 'settings'

/** 重量の表示単位。保存は常に kg で、表示・入力のときだけ換算する */
export type WeightUnit = 'kg' | 'lbs'

export interface TrainingSet {
  id: string
  weight: number   // 常にkg単位で保存
  reps: number
  memo: string
}

export interface TrainingRecord {
  id: string
  date: string         // 'YYYY-MM-DD'
  exerciseId: string
  sets: TrainingSet[]
}

export interface Settings {
  requiredSets: number       // 継続達成に必要なセット数（ContinuityGauge）
  defaultSets: number        // トレーニング記録画面の初期セット数
  weightUnit: WeightUnit
  requiredExercises: number  // 継続達成に必要な種目数（ContinuityGauge）
}

export type CategoryId = string

export interface Exercise {
  id: string
  name: string
  categoryId: CategoryId
  isCustom: boolean
  // 以下3フィールドはカスタム種目追加時に任意入力。デフォルト種目は exerciseMuscleMap.ts で管理
  muscles?: string[]          // 対象筋肉（主動筋）
  musclesSecondary?: string[] // 補助筋（協働筋）
  description?: string        // 種目の説明文
}

export interface BodyRecord {
  date: string           // 'YYYY-MM-DD'
  weight: number | null  // kg
  bodyFat: number | null // %
  muscleMass: number | null // % または kg（BodySettings.muscleMassUnit による）
  waist: number | null   // cm
  memo: string
}

/** 目標を持てる体組成の項目 */
export type GoalMetric = 'weight' | 'bodyFat' | 'muscleMass'

/** 項目ごとの値（体重 kg・体脂肪率 %・筋肉量 kg）。入っていない項目は持たない */
export type GoalValues = Partial<Record<GoalMetric, number>>

/** 目標を入れた時点の値（項目ごと）。減らす目標か増やす目標かの判定に使う */
export type GoalBaselines = GoalValues

export interface BodySettings {
  height: number        // cm（0 = 未設定）
  targetWeight: number  // kg（0 = 未設定）
  muscleMassUnit: '%' | 'kg'
  targetBodyFat: number // %（0 = 未設定）
  targetMuscleMassKg: number // kg（0 = 未設定）。記録の単位が % でも kg で持ち、筋重量 kg と比べる
  goalBaselines: GoalBaselines
}

/** 大会（コンテスト・受験など、日付の決まった予定） */
export interface Contest {
  id: string
  name: string
  date: string  // 'YYYY-MM-DD'
  targets?: GoalValues  // この大会の目標。無い項目はふだんの目標（BodySettings）を使う
  targetsSetOn?: Partial<Record<GoalMetric, string>>  // 項目ごとに目標を最後に変えた日（'YYYY-MM-DD'）。向き（減らす・増やす）の起点に使う
}

/** 「あと何日」を添えた、これからの大会 */
export interface ContestCountdown {
  contest: Contest
  daysLeft: number // 0 = 今日
}

export interface CalendarProps {
  currentDate: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  markedDates?: string[]          // 記録あり日（条件未達含む）'YYYY-MM-DD' 形式
  achievedDates?: string[]        // 条件達成日（フルカラー表示）'YYYY-MM-DD' 形式
  markIcon?: React.ReactNode      // マークアイコンの上書き（デフォルト 💪）
  contests?: Contest[]            // 大会のある日に印と名前を出す
  countdown?: ContestCountdown    // 一番近い大会までの残り日数
}

export interface SidebarProps {
  activeTab: TabName
}
