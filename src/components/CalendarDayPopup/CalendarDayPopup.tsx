import { getDay, parseISO } from 'date-fns'
import type { TrainingRecord, Exercise } from '../../types'
import styles from './CalendarDayPopup.module.css'

interface CalendarDayPopupProps {
  date: string              // 'YYYY-MM-DD'
  records: TrainingRecord[] // その日のレコード（全種目）
  exercises: Exercise[]     // 全種目マスター（name/category取得用）
  onClose: () => void
  onNavigate: (date: string) => void
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

function formatDate(dateStr: string): string {
  const date = parseISO(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekday = WEEKDAYS[getDay(date)]
  return `${month}月${day}日（${weekday}）`
}

interface GroupedExercise {
  categoryId: string
  items: { name: string; setCount: number }[]
}

function groupByCategory(
  records: TrainingRecord[],
  exercises: Exercise[]
): GroupedExercise[] {
  const exerciseMap = new Map(exercises.map((e) => [e.id, e]))
  const categoryOrder: string[] = []
  const categoryMap = new Map<string, { name: string; setCount: number }[]>()

  for (const record of records) {
    const exercise = exerciseMap.get(record.exerciseId)
    if (!exercise) continue

    const { categoryId, name } = exercise

    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, [])
      categoryOrder.push(categoryId)
    }

    const items = categoryMap.get(categoryId) ?? []
    const existing = items.find((item) => item.name === name)
    if (existing) {
      existing.setCount += record.sets.length
    } else {
      items.push({ name, setCount: record.sets.length })
    }
  }

  return categoryOrder.map((categoryId) => ({
    categoryId,
    items: categoryMap.get(categoryId) ?? [],
  }))
}

export default function CalendarDayPopup({
  date,
  records,
  exercises,
  onClose,
  onNavigate,
}: CalendarDayPopupProps) {
  const displayDate = formatDate(date)
  const grouped = groupByCategory(records, exercises)

  return (
    <div
      className={styles.overlay}
      data-testid="popup-overlay"
      onClick={onClose}
    >
      <div
        className={styles.card}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className={styles.header}>
          <span className={styles.dateText}>{displayDate}</span>
          <button
            className={styles.closeButton}
            aria-label="close"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M12 4L4 12M4 4l8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* ボディ */}
        <div className={styles.body}>
          {grouped.map((group, groupIndex) => (
            <div key={group.categoryId}>
              <div
                className={`${styles.categoryLabel} ${groupIndex === 0 ? styles.categoryLabelFirst : ''}`}
              >
                {group.categoryId}
              </div>
              {group.items.map((item) => (
                <div key={item.name} className={styles.exerciseRow}>
                  <span className={styles.exerciseName}>{item.name}</span>
                  <span className={styles.setCount}>{`${item.setCount}set`}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* フッター */}
        <div className={styles.footer}>
          <button
            className={styles.navigateButton}
            onClick={() => onNavigate(date)}
          >
            詳細を見る
          </button>
        </div>
      </div>
    </div>
  )
}
