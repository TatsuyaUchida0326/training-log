import { format, getDay } from 'date-fns'

/** 曜日ヘッダー・日付表記で共有する曜日名（date-fns の getDay の並びと揃える） */
export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

/** 「M月d日（曜）」形式の日付表記。Calendar の日付セルと CalendarDayPopup の見出しで共有する */
export function formatDateWithWeekday(date: Date): string {
  return `${format(date, 'M月d日')}（${WEEKDAYS[getDay(date)]}）`
}
