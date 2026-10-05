import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react'
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
import { groupContestsByDate } from '../../utils/contests'
import { WEEKDAYS, formatDateWithWeekday } from '../../utils/date'
import type { CalendarProps } from '../../types'
import styles from './Calendar.module.css'

function isSameYearMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

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
  contests = [],
  countdown,
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

  // 日付ごとの大会（前後の月のセルにも印を出すので、表示月では絞らない）
  const contestsByDate = useMemo(() => groupContestsByDate(contests), [contests])

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
      {/* 一番近い大会までの残り日数。月の見出しより上に、右寄せの1行で出す */}
      {countdown && (
        <div data-testid="calendar-countdown" className={styles.countdown}>
          <Flag size={14} aria-hidden="true" className={styles.countdownIcon} />
          {countdown.daysLeft === 0 ? (
            <>
              <span className={styles.countdownFixed}>今日は</span>
              <span className={styles.countdownName}>{countdown.contest.name}</span>
            </>
          ) : (
            <>
              <span className={styles.countdownName}>{countdown.contest.name}</span>
              <span className={styles.countdownFixed}>
                まで あと <strong>{countdown.daysLeft}</strong> 日
              </span>
            </>
          )}
        </div>
      )}

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
      <div className={contests.length > 0 ? `${styles.grid} ${styles.gridWithContests}` : styles.grid}>
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
          const dayContests = contestsByDate.get(format(date, 'yyyy-MM-dd')) ?? []

          // アクセシブルネームは表示物と独立に組み立てる（絵文字や祝日名を個別に読み上げさせないため）
          const ariaLabel =
            formatDateWithWeekday(date) +
            (holidayName ? `、${holidayName}` : '') +
            (hasRecord ? '、記録あり' : '') +
            (dayContests.length > 0 ? `、大会: ${dayContests.map((c) => c.name).join('、')}` : '')

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
              aria-pressed={isSelected}
              onClick={() => onDateSelect(date)}
            >
              <span
                className={[
                  styles.dayCircle,
                  isToday ? styles.today : '',
                  isSelected && !isToday ? styles.selected : '',
                  dayContests.length > 0 ? styles.contestDay : '',
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
              {dayContests.length > 0 && (
                <>
                  <span data-testid="contest-name" className={styles.contestName}>
                    {dayContests[0].name}
                  </span>
                  {dayContests.length > 1 && (
                    <span className={styles.contestName}>他{dayContests.length - 1}件</span>
                  )}
                </>
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
