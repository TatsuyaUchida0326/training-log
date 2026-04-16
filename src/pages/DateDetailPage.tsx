import { useParams, useNavigate } from 'react-router-dom'
import { parseISO, isValid, format } from 'date-fns'
import styles from './DateDetailPage.module.css'

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土']

function formatDateJa(date: Date): string {
  const weekday = WEEKDAYS_JA[date.getDay()]
  return `${format(date, 'yyyy年M月d日')}（${weekday}）`
}

// TODO: 記録機能実装後に実データに置き換える
const EMPTY_STATS = {
  exercises: 0,
  sets: 0,
  reps: 0,
  volume: 0,
}

export default function DateDetailPage() {
  const { dateStr } = useParams<{ dateStr: string }>()
  const navigate = useNavigate()

  const date = dateStr ? parseISO(dateStr) : null
  const isValidDate = date && isValid(date)

  if (!isValidDate) {
    return (
      <div className={styles.page}>
        <p className={styles.errorText}>日付が正しくありません</p>
      </div>
    )
  }

  const stats = EMPTY_STATS

  return (
    <div className={styles.page}>
      {/* 日付バー */}
      <div className={styles.dateBar}>
        <button
          className={styles.backButton}
          onClick={() => navigate('/')}
          aria-label="戻る"
        >
          ＜
        </button>
        <span className={styles.dateTitle}>{formatDateJa(date)}</span>
      </div>

      {/* 統計バー */}
      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>合計{'\n'}種目数</div>
          <div className={styles.statValue}>{stats.exercises}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>合計{'\n'}セット数</div>
          <div className={styles.statValue}>{stats.sets}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>合計{'\n'}レップ数</div>
          <div className={styles.statValue}>{stats.reps}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>合計{'\n'}負荷量</div>
          <div className={styles.statValue}>{stats.volume}</div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className={styles.content}>
        {stats.exercises === 0 && (
          <div className={styles.emptyCard}>
            <div className={styles.emptyIcon}>🏋️</div>
            <p className={styles.emptyText}>
              種目を追加してトレーニングを記録しましょう
            </p>
          </div>
        )}
      </div>

      {/* FAB（種目追加 - 記録機能実装後に接続） */}
      <button className={styles.fab} aria-label="種目を追加">
        ＋
      </button>
    </div>
  )
}
