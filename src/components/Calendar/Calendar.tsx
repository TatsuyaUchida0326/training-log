import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isSameMonth,
  subDays,
  addDays,
} from 'date-fns'
import { between } from '@holiday-jp/holiday_jp'
import type { CalendarProps } from '../../types'
import styles from './Calendar.module.css'

function isSameYearMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function Calendar({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  selectedDate,
  onDateSelect,
  markedDates = [],
  achievedDates = [],
  markIcon,
}: CalendarProps) {
  const today = new Date()
  const isCurrentMonth = isSameYearMonth(currentDate, today)
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)

  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = getDay(monthStart)

  const prevMonthDays = Array.from({ length: startDayOfWeek }, (_, i) =>
    subDays(monthStart, startDayOfWeek - i)
  )

  const totalCells = Math.ceil((startDayOfWeek + daysInMonth.length) / 7) * 7
  const remaining = totalCells - startDayOfWeek - daysInMonth.length
  const nextMonthDays = Array.from({ length: remaining }, (_, i) =>
    addDays(monthEnd, i + 1)
  )

  const allDays = [...prevMonthDays, ...daysInMonth, ...nextMonthDays]

  const markedSet = useMemo(() => new Set(markedDates), [markedDates])
  const achievedSet = useMemo(() => new Set(achievedDates), [achievedDates])
  const isMarked = (date: Date): boolean => markedSet.has(format(date, 'yyyy-MM-dd'))
  const isAchieved = (date: Date): boolean => achievedSet.has(format(date, 'yyyy-MM-dd'))

  // 当月の祝日をMapに変換（'yyyy-MM-dd' → 祝日名）
  const holidayMap = useMemo(() => {
    const holidays = between(monthStart, monthEnd)
    const map = new Map<string, string>()
    holidays.forEach((h) => {
      map.set(format(new Date(h.date), 'yyyy-MM-dd'), h.name)
    })
    return map
  }, [monthStart, monthEnd])

  return (
    <div className={styles.calendar}>
      {/* ヘッダー */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <button
            className={styles.navButton}
            aria-label="前の月"
            onClick={onPrevMonth}
          >
            <ChevronLeft size={18} />
          </button>
          <span className={styles.monthTitle}>
            {format(currentDate, 'yyyy年M月')}
          </span>
          <button
            className={styles.navButton}
            aria-label="次の月"
            onClick={onNextMonth}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        {!isCurrentMonth && (
          <button
            className={styles.todayButton}
            onClick={onToday}
          >
            今日
          </button>
        )}
      </div>

      {/* 曜日ヘッダー */}
      <div className={styles.weekdays}>
        {WEEKDAYS.map((day) => (
          <div key={day} className={styles.weekday}>
            {day}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className={styles.grid}>
        {allDays.map((date) => {
          const isCurrentMonth = isSameMonth(date, currentDate)
          const isToday = isSameDay(date, today)
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
          const marked = isMarked(date)
          const achieved = isAchieved(date)
          const dayOfWeek = getDay(date)
          const isSunday = dayOfWeek === 0
          const isSaturday = dayOfWeek === 6
          const holidayName = isCurrentMonth
            ? holidayMap.get(format(date, 'yyyy-MM-dd'))
            : undefined
          const isHoliday = !!holidayName
          const hasRecord = marked || achieved

          // アクセシブルネームは表示物と独立に組み立てる（絵文字や祝日名を個別に読み上げさせないため）
          const ariaLabel =
            `${format(date, 'M月d日')}（${WEEKDAYS[dayOfWeek]}）` +
            (holidayName ? `、${holidayName}` : '') +
            (hasRecord ? '、記録あり' : '')

          return (
            <button
              key={format(date, 'yyyy-MM-dd')}
              type="button"
              className={[
                styles.cell,
                !isCurrentMonth ? styles.otherMonth : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={ariaLabel}
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={isSelected ? true : undefined}
              onClick={() => onDateSelect(date)}
            >
              <span
                className={[
                  styles.dayCircle,
                  isToday ? styles.today : '',
                  isSelected && !isToday ? styles.selected : '',
                  !isToday && (isSunday || isHoliday) ? styles.sunday : '',
                  !isToday && isSaturday && !isHoliday ? styles.saturday : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {format(date, 'd')}
              </span>
              {holidayName && (
                <span className={styles.holidayName}>{holidayName}</span>
              )}
              {hasRecord && (
                <span
                  data-testid="marked-dot"
                  aria-hidden="true"
                  className={achieved ? styles.muscleIcon : styles.muscleIconGray}
                >
                  {markIcon ?? '💪'}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
