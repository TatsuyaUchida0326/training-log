export type TabName = 'home' | 'history' | 'body' | 'settings'

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
  defaultSets: number          // 継続達成セット数（ContinuityGauge）
  trainingDefaultSets: number  // トレーニング記録のデフォルトセット数
  weightUnit: 'kg' | 'lbs'
}

export type CategoryId = string

export interface Exercise {
  id: string
  name: string
  categoryId: CategoryId
  isCustom: boolean
}

export interface BodyRecord {
  date: string           // 'YYYY-MM-DD'
  weight: number | null  // kg
  bodyFat: number | null // %
  muscleMass: number | null // % または kg（BodySettings.muscleMassUnit による）
  waist: number | null   // cm
  memo: string
}

export interface BodySettings {
  height: number        // cm（0 = 未設定）
  targetWeight: number  // kg（0 = 未設定）
  muscleMassUnit: '%' | 'kg'
}

export interface CalendarProps {
  currentDate: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  markedDates?: string[] // 'YYYY-MM-DD' 形式
}

export interface BottomNavProps {
  activeTab: TabName
}
