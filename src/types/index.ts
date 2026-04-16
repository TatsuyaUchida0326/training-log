export type TabName = 'home' | 'history' | 'body' | 'settings'

export interface Settings {
  defaultSets: number          // 継続達成セット数（ContinuityGauge）
  trainingDefaultSets: number  // トレーニング記録のデフォルトセット数
  weightUnit: 'kg' | 'lbs'
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
