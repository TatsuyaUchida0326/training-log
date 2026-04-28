import { useEffect, useRef, useState, useMemo } from 'react'
import { X, Plus } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useTrainingRecords } from '../../hooks/useTrainingRecords'
import { useExercises } from '../../hooks/useExercises'
import { useSettings } from '../../hooks/useSettings'
import { usePageHeader } from '../../contexts/PageHeaderContext'
import { calcRM, displayWeight, inputToKg } from '../../utils/training'
import type { TrainingRecord, TrainingSet } from '../../types'
import styles from './TrainingEntryPage.module.css'

function newSetId(): string {
  return `set-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// 入力を半角数字のみに即時フィルタリング（IME・全角をブロック）
function filterToDecimal(e: React.FormEvent<HTMLInputElement>) {
  const input = e.currentTarget
  const half = input.value
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/．/g, '.')
  const filtered = half
    .replace(/[^0-9.]/g, '')
    .replace(/^(\d*\.?\d*).*$/, '$1') // 小数点は1つまで
  if (input.value !== filtered) input.value = filtered
}

function filterToInteger(e: React.FormEvent<HTMLInputElement>) {
  const input = e.currentTarget
  const half = input.value.replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  )
  const filtered = half.replace(/[^0-9]/g, '')
  if (input.value !== filtered) input.value = filtered
}

function newRecordId(exerciseId: string, date: string): string {
  return `rec-${exerciseId}-${date}`
}

export default function TrainingEntryPage() {
  const { dateStr, exerciseId } = useParams<{ dateStr: string; exerciseId: string }>()
  const navigate = useNavigate()

  const { settings } = useSettings()
  const { exercises } = useExercises()
  const { setHeader } = usePageHeader()

  useEffect(() => {
    setHeader({ title: 'トレーニング記録画面', centered: true })
  }, [setHeader])

  const {
    records,
    getRecord,
    getLastRecord,
    upsertRecord,
    addSet,
    updateSet,
    deleteSet,
  } = useTrainingRecords()

  const exercise = exercises.find((e) => e.id === exerciseId)
  const date = dateStr ?? ''

  // 歴代最高RM（当日を含む全記録）
  const historicalBestRM = useMemo(() => {
    if (!exerciseId) return 0
    return records
      .filter((r) => r.exerciseId === exerciseId)
      .flatMap((r) => r.sets.map((s) => calcRM(s.weight, s.reps)))
      .reduce((max, rm) => Math.max(max, rm), 0)
  }, [records, exerciseId])

  // 1RM更新トースト通知
  const [rmToast, setRmToast] = useState<{ rm: number; key: number } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showRMToast(rm: number) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setRmToast({ rm, key: Date.now() })
    toastTimerRef.current = setTimeout(() => setRmToast(null), 4000)
  }

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

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
    // upsertRecord を deps に含めると再レンダーのたびに実行されるため、初回マウント時のみ実行するよう意図的に除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId, date])

  const record = exerciseId ? getRecord(exerciseId, date) : null

  const unit = settings.weightUnit

  function handleWeightChange(setId: string, raw: string) {
    if (!record) return
    const val = parseFloat(raw)
    if (isNaN(val)) return
    const weightKg = inputToKg(val, unit)
    updateSet(record.id, setId, { weight: weightKg })
    // repsが入力済みならRM更新チェック
    const currentSet = record.sets.find((s) => s.id === setId)
    if (currentSet && currentSet.reps > 0) {
      const newRM = calcRM(weightKg, currentSet.reps)
      if (newRM > historicalBestRM) showRMToast(newRM)
    }
  }

  function handleRepsChange(setId: string, raw: string) {
    if (!record) return
    const val = parseInt(raw, 10)
    if (isNaN(val)) return
    updateSet(record.id, setId, { reps: val })
    // weightが入力済みならRM更新チェック
    const currentSet = record.sets.find((s) => s.id === setId)
    if (currentSet && currentSet.weight > 0 && val > 0) {
      const newRM = calcRM(currentSet.weight, val)
      if (newRM > historicalBestRM) showRMToast(newRM)
    }
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
      {/* 1RM更新アニメーション */}
      {rmToast && (
        <>
          <div key={`overlay-${rmToast.key}`} className={styles.rmOverlay} />
          <div key={`popup-${rmToast.key}`} className={styles.rmPopup}>
            <span className={styles.rmPopupIcon}>🏆</span>
            <div className={styles.rmPopupLabel}>1RM 更新！</div>
            <div>
              <span className={styles.rmPopupValue}>{displayWeight(rmToast.rm, unit)}</span>
              <span className={styles.rmPopupUnit}>{unit}</span>
            </div>
            <div className={styles.rmPopupSub}>NEW PERSONAL RECORD</div>
          </div>
        </>
      )}

      {/* ヘッダーバー */}
      <div className={styles.bar}>
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
                        type="text"
                        inputMode="decimal"
                        defaultValue={dispWeight > 0 ? dispWeight : ''}
                        placeholder="0"
                        onInput={filterToDecimal}
                        onBlur={(e) => handleWeightChange(s.id, e.target.value)}
                        key={`w-${s.id}-${unit}`}
                      />
                      <span className={styles.unitLabel}>{unit}</span>
                    </div>
                    <div className={styles.colReps}>
                      <input
                        className={styles.numInput}
                        type="text"
                        inputMode="numeric"
                        defaultValue={s.reps > 0 ? s.reps : ''}
                        placeholder="0"
                        onInput={filterToInteger}
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
      {/* FAB: 左下の戻るボタン */}
      <button
        className={styles.fabBack}
        onClick={() => navigate(-1)}
        aria-label="戻る"
      >
        戻る
      </button>
    </div>
  )
}
