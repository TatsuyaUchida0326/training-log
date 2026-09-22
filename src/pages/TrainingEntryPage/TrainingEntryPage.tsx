import { useEffect, useRef, useState, useMemo } from 'react'
import { ChevronLeft, X, Plus } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useTrainingRecords } from '../../hooks/useTrainingRecords'
import { useExercises } from '../../hooks/useExercises'
import { useSettings } from '../../hooks/useSettings'
import { usePageHeader } from '../../contexts/PageHeaderContext'
import { calcRM, displayWeight, filledSets, inputToKg } from '../../utils/training'
import type { TrainingSet } from '../../types'
import styles from './TrainingEntryPage.module.css'

function newSetId(): string {
  return `set-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function newEmptySet(): TrainingSet {
  return { id: newSetId(), weight: 0, reps: 0, memo: '' }
}

function newEmptySets(count: number): TrainingSet[] {
  return Array.from({ length: count }, newEmptySet)
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
    setHeader({
      // 日付詳細と同じ文言にすると2画面が区別できないため分ける
      title: 'セットを記録',
      centered: true,
      // navigate(-1) だと直接URLを開いたときアプリ外へ戻るため、遷移先を明示する
      leftElement: (
        <button
          className="header-icon-btn"
          aria-label="戻る"
          onClick={() => navigate(`/date/${dateStr}`)}
        >
          <ChevronLeft size={24} />
        </button>
      ),
    })
  }, [setHeader, navigate, dateStr])

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

  // 現在の記録。無ければ画面ローカルの下書きを表示する
  const record = exerciseId ? getRecord(exerciseId, date) : null
  const lastRecord = exerciseId ? getLastRecord(exerciseId, date) : null
  const lastRecordSets = lastRecord ? filledSets(lastRecord) : []

  const [draftSets, setDraftSets] = useState<TrainingSet[]>(() =>
    newEmptySets(settings.trainingDefaultSets),
  )

  const sets = record ? record.sets : draftSets

  const unit = settings.weightUnit

  /** 記録があれば該当セットを更新し、無ければ下書き全体を記録として作る */
  function saveSetUpdate(setId: string, updates: Partial<TrainingSet>) {
    if (record) {
      updateSet(record.id, setId, updates)
      return
    }
    if (!exerciseId || !date) return
    upsertRecord({
      id: newRecordId(exerciseId, date),
      date,
      exerciseId,
      sets: draftSets.map((set) => (set.id === setId ? { ...set, ...updates } : set)),
    })
  }

  function handleWeightChange(setId: string, raw: string) {
    const currentSet = sets.find((set) => set.id === setId)
    if (!currentSet) return
    const trimmed = raw.trim()
    const inputValue = trimmed === '' ? 0 : parseFloat(trimmed)
    if (isNaN(inputValue)) return
    // 値が変わらなければ保存しない。空欄で欄を離れただけで記録を作らないためと、
    // lbs 表示値の往復丸めで保存値が動くのを防ぐため
    if (inputValue === displayWeight(currentSet.weight, unit)) return

    const weightKg = inputToKg(inputValue, unit)
    saveSetUpdate(setId, { weight: weightKg })
    // repsが入力済みならRM更新チェック
    if (currentSet.reps > 0) {
      const newRM = calcRM(weightKg, currentSet.reps)
      if (newRM > historicalBestRM) showRMToast(newRM)
    }
  }

  function handleRepsChange(setId: string, raw: string) {
    const currentSet = sets.find((set) => set.id === setId)
    if (!currentSet) return
    const trimmed = raw.trim()
    const reps = trimmed === '' ? 0 : parseInt(trimmed, 10)
    if (isNaN(reps)) return
    // 値が変わらなければ保存しない（空欄で欄を離れただけで記録を作らない）
    if (reps === currentSet.reps) return

    saveSetUpdate(setId, { reps })
    // weightが入力済みならRM更新チェック
    if (currentSet.weight > 0 && reps > 0) {
      const newRM = calcRM(currentSet.weight, reps)
      if (newRM > historicalBestRM) showRMToast(newRM)
    }
  }

  function handleMemoChange(setId: string, memo: string) {
    if (record) {
      updateSet(record.id, setId, { memo })
      return
    }
    // 記録が無いあいだはメモだけで記録を作らず、下書きに保持する
    setDraftSets((prev) => prev.map((set) => (set.id === setId ? { ...set, memo } : set)))
  }

  function handleAddSet() {
    if (record) {
      addSet(record.id, newEmptySet())
      return
    }
    setDraftSets((prev) => [...prev, newEmptySet()])
  }

  function handleDeleteSet(setId: string) {
    if (record) {
      deleteSet(record.id, setId)
      return
    }
    setDraftSets((prev) => prev.filter((set) => set.id !== setId))
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
        {lastRecord && (
          <div className={styles.lastRecord}>
            <div className={styles.lastRecordTitle}>
              Last Record : {format(new Date(lastRecord.date), 'yyyy/MM/dd')}
            </div>
            <div className={styles.lastRecordSets}>
              {lastRecordSets.map((set, index) => (
                <div key={set.id} className={styles.lastRecordRow}>
                  <span className={styles.lastSetNum}>{index + 1}</span>
                  <span className={styles.lastSetDetail}>
                    {displayWeight(set.weight, unit)}&nbsp;{unit} × {set.reps}&nbsp;reps
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* セット入力エリア */}
        {sets.length > 0 && (
          <div className={styles.setsCard}>
            {/* テーブルヘッダー */}
            <div className={styles.tableHeader}>
              <span className={styles.colSet}>セット</span>
              <span className={styles.colWeight}>重さ</span>
              <span className={styles.colReps}>回数</span>
              {/* RM はセット行の2段目に移したため、見出しは置かない */}
              <span className={styles.colAction} />
            </div>

            {sets.map((set, index) => {
              const rm = calcRM(set.weight, set.reps)
              const dispWeight = displayWeight(set.weight, unit)
              return (
                <div key={set.id} className={styles.setBlock}>
                  <div className={styles.setRow}>
                    <span className={styles.colSet}>{index + 1}</span>
                    <div className={styles.colWeight}>
                      <input
                        className={styles.numInput}
                        type="text"
                        inputMode="decimal"
                        aria-label={`${index + 1}セット目の重さ`}
                        defaultValue={dispWeight > 0 ? dispWeight : ''}
                        placeholder="0"
                        onInput={filterToDecimal}
                        onBlur={(e) => handleWeightChange(set.id, e.target.value)}
                        key={`w-${set.id}-${unit}`}
                      />
                      <span className={styles.unitLabel}>{unit}</span>
                    </div>
                    <div className={styles.colReps}>
                      <input
                        className={styles.numInput}
                        type="text"
                        inputMode="numeric"
                        aria-label={`${index + 1}セット目の回数`}
                        defaultValue={set.reps > 0 ? set.reps : ''}
                        placeholder="0"
                        onInput={filterToInteger}
                        onBlur={(e) => handleRepsChange(set.id, e.target.value)}
                        key={`r-${set.id}`}
                      />
                      <span className={styles.unitLabel}>回</span>
                    </div>
                    <span className={styles.colRm}>
                      {rm > 0 ? `${displayWeight(rm, unit)} ${unit}` : '—'}
                    </span>
                    <button
                      className={styles.colAction}
                      aria-label="セット削除"
                      onClick={() => handleDeleteSet(set.id)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className={styles.memoRow}>
                    <input
                      className={styles.memoInput}
                      type="text"
                      placeholder="メモ"
                      defaultValue={set.memo}
                      onBlur={(e) => handleMemoChange(set.id, e.target.value)}
                      key={`m-${set.id}`}
                    />
                  </div>
                  {index < sets.length - 1 && <hr className={styles.setDivider} />}
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
