import { useEffect, useRef } from 'react'
import { ChevronLeft, X, Plus } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useTrainingRecords } from '../hooks/useTrainingRecords'
import { useExercises } from '../hooks/useExercises'
import { useSettings } from '../hooks/useSettings'
import { calcRM, displayWeight, inputToKg } from '../utils/training'
import type { TrainingRecord, TrainingSet } from '../types'
import styles from './TrainingEntryPage.module.css'

function newSetId(): string {
  return `set-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function newRecordId(exerciseId: string, date: string): string {
  return `rec-${exerciseId}-${date}`
}

export default function TrainingEntryPage() {
  const { dateStr, exerciseId } = useParams<{ dateStr: string; exerciseId: string }>()
  const navigate = useNavigate()

  const { settings } = useSettings()
  const { exercises } = useExercises()
  const {
    getRecord,
    getLastRecord,
    upsertRecord,
    addSet,
    updateSet,
    deleteSet,
  } = useTrainingRecords()

  const exercise = exercises.find((e) => e.id === exerciseId)
  const date = dateStr ?? ''

  // 現在の記録を取得（なければ新規作成）
  const existingRecord = exerciseId ? getRecord(exerciseId, date) : null
  const lastRecord = exerciseId ? getLastRecord(exerciseId, date) : null

  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    if (!exerciseId || !date) return
    if (!existingRecord) {
      // 新規: デフォルトセット数分の空セットを作成
      const defaultCount = settings.trainingDefaultSets ?? 3
      const sets: TrainingSet[] = Array.from({ length: defaultCount }, () => ({
        id: newSetId(),
        weight: 0,
        reps: 0,
        memo: '',
      }))
      const newRecord: TrainingRecord = {
        id: newRecordId(exerciseId, date),
        date,
        exerciseId,
        sets,
      }
      upsertRecord(newRecord)
    }
    initializedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId, date])

  const record = exerciseId ? getRecord(exerciseId, date) : null

  const unit = settings.weightUnit

  function handleWeightChange(setId: string, raw: string) {
    if (!record) return
    const val = parseFloat(raw)
    if (isNaN(val)) return
    updateSet(record.id, setId, { weight: inputToKg(val, unit) })
  }

  function handleRepsChange(setId: string, raw: string) {
    if (!record) return
    const val = parseInt(raw, 10)
    if (isNaN(val)) return
    updateSet(record.id, setId, { reps: val })
  }

  function handleMemoChange(setId: string, memo: string) {
    if (!record) return
    updateSet(record.id, setId, { memo })
  }

  function handleAddSet() {
    if (!record) return
    addSet(record.id, { id: newSetId(), weight: 0, reps: 0, memo: '' })
  }

  function handleDeleteSet(setId: string) {
    if (!record) return
    deleteSet(record.id, setId)
  }

  if (!exercise || !dateStr) {
    return (
      <div className={styles.page}>
        <p className={styles.errorText}>種目が見つかりません</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* ヘッダーバー */}
      <div className={styles.bar}>
        <button
          className={styles.backButton}
          onClick={() => navigate(`/date/${dateStr}`)}
          aria-label="戻る"
        >
          <ChevronLeft size={20} />
        </button>
        <span className={styles.barTitle}>{exercise.name}</span>
        <div className={styles.unitToggle}>
          <span
            className={`${styles.unitOption} ${unit === 'kg' ? styles.unitActive : ''}`}
          >
            kg
          </span>
          <span className={styles.unitSep}>/</span>
          <span
            className={`${styles.unitOption} ${unit === 'lbs' ? styles.unitActive : ''}`}
          >
            lbs
          </span>
        </div>
      </div>

      <div className={styles.scrollArea}>
        {/* Last Record */}
        {lastRecord && lastRecord.sets.length > 0 && (
          <div className={styles.lastRecord}>
            <div className={styles.lastRecordTitle}>
              Last Record : {format(new Date(lastRecord.date), 'yyyy/MM/dd')}
            </div>
            <div className={styles.lastRecordSets}>
              {lastRecord.sets.map((s, i) => (
                <div key={s.id} className={styles.lastRecordRow}>
                  <span className={styles.lastSetNum}>{i + 1}</span>
                  <span className={styles.lastSetDetail}>
                    {displayWeight(s.weight, unit)}&nbsp;{unit} × {s.reps}&nbsp;reps
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* セット入力エリア */}
        {record && record.sets.length > 0 && (
          <div className={styles.setsCard}>
            {/* テーブルヘッダー */}
            <div className={styles.tableHeader}>
              <span className={styles.colSet}>セット</span>
              <span className={styles.colWeight}>重さ</span>
              <span className={styles.colReps}>回数</span>
              <span className={styles.colRm}>RM</span>
              <span className={styles.colAction} />
            </div>

            {record.sets.map((s, idx) => {
              const rm = calcRM(s.weight, s.reps)
              const dispWeight = displayWeight(s.weight, unit)
              return (
                <div key={s.id} className={styles.setBlock}>
                  <div className={styles.setRow}>
                    <span className={styles.colSet}>{idx + 1}</span>
                    <div className={styles.colWeight}>
                      <input
                        className={styles.numInput}
                        type="number"
                        min="0"
                        step="0.5"
                        defaultValue={dispWeight > 0 ? dispWeight : ''}
                        placeholder="0"
                        onBlur={(e) => handleWeightChange(s.id, e.target.value)}
                        key={`w-${s.id}-${unit}`}
                      />
                      <span className={styles.unitLabel}>{unit}</span>
                    </div>
                    <div className={styles.colReps}>
                      <input
                        className={styles.numInput}
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={s.reps > 0 ? s.reps : ''}
                        placeholder="0"
                        onBlur={(e) => handleRepsChange(s.id, e.target.value)}
                        key={`r-${s.id}`}
                      />
                      <span className={styles.unitLabel}>回</span>
                    </div>
                    <span className={styles.colRm}>
                      {rm > 0 ? `${rm} ${unit}` : '—'}
                    </span>
                    <button
                      className={styles.colAction}
                      aria-label="セット削除"
                      onClick={() => handleDeleteSet(s.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className={styles.memoRow}>
                    <input
                      className={styles.memoInput}
                      type="text"
                      placeholder="メモ"
                      defaultValue={s.memo}
                      onBlur={(e) => handleMemoChange(s.id, e.target.value)}
                      key={`m-${s.id}`}
                    />
                  </div>
                  {idx < record.sets.length - 1 && <hr className={styles.setDivider} />}
                </div>
              )
            })}
          </div>
        )}

        {/* ＋ セットを追加 */}
        <button className={styles.addSetButton} onClick={handleAddSet}>
          <Plus size={16} /> セットを追加
        </button>
      </div>
    </div>
  )
}
