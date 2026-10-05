import { useState, useEffect, useId } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import type { GoalMetric } from '../../types'
import ContestEditor from '../../components/ContestEditor/ContestEditor'
import { useBodyRecords } from '../../hooks/useBodyRecords'
import { useBodySettings } from '../../hooks/useBodySettings'
import { usePageHeader } from '../../contexts/PageHeaderContext'
import { calcBody } from '../../utils/body'
import {
  GOAL_TARGET_FIELDS,
  fillMissingGoalBaselines,
  latestMeasuredValues,
  withGoalBaseline,
} from '../../utils/goals'
import styles from './BodyPage.module.css'

/** 入力欄の文字を正の数にする。空欄・0 以下・数値でないものは 0（未設定・未入力）として扱う */
function parsePositiveNumber(raw: string): number {
  const val = parseFloat(raw)
  return !isNaN(val) && val > 0 ? val : 0
}

function toDateStr(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** 0（未設定）は空欄として見せるため null にする */
function positiveOrNull(value: number): number | null {
  return value > 0 ? value : null
}

function formatDisplay(date: Date): string {
  return format(date, 'yyyy年M月d日')
}

export default function BodyPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const dateStr = toDateStr(currentDate)

  const { records, getRecord, updateField, clearField } = useBodyRecords()
  const { settings, updateSettings } = useBodySettings()
  const { setHeader } = usePageHeader()

  const record = getRecord(dateStr)
  const calc = calcBody(record, settings)
  const muscleMassUnitLabel = settings.muscleMassUnit

  const memoInputId = useId()

  useEffect(() => {
    setHeader({ title: '体組成', centered: true })
  }, [setHeader])

  // 目標はあるのに向きの基準（baseline）が無い項目を、記録が入ったときに埋める。
  // 画面は上から「目標 → 計測値」の順なので、目標を先に入れる人が多い。この機能より前に目標を入れていた人も同じ。
  // 埋めたあとは null になるので、設定の更新で再実行されても繰り返さない
  useEffect(() => {
    const filled = fillMissingGoalBaselines(settings, latestMeasuredValues(records, settings))
    if (filled) updateSettings({ goalBaselines: filled })
    // updateSettings は毎回作り直される関数なので依存に入れない（入れると毎回再実行される）
  }, [records, settings])

  function handleNumBlur(
    field: 'weight' | 'bodyFat' | 'muscleMass' | 'waist',
    raw: string
  ) {
    const val = parsePositiveNumber(raw)
    if (val > 0) updateField(dateStr, field, val)
  }

  function handleClear(field: 'weight' | 'bodyFat' | 'muscleMass' | 'waist') {
    clearField(dateStr, field)
  }

  function handleMemoBlur(memo: string) {
    updateField(dateStr, 'memo', memo)
  }

  function handleHeightBlur(raw: string) {
    updateSettings({ height: parsePositiveNumber(raw) })
  }

  // 目標を変えたときだけ、目標を入れた時点の値（baseline）も一緒に保存する。
  // 同じ値で blur し直しただけで baseline を上書きすると、減らす・増やすの向きが狂うため
  function handleGoalBlur(metric: GoalMetric, raw: string) {
    const field = GOAL_TARGET_FIELDS[metric]
    const target = parsePositiveNumber(raw)
    if (target === settings[field]) return

    const current = latestMeasuredValues(records, settings)[metric]
    updateSettings({
      [field]: target,
      goalBaselines: withGoalBaseline(settings.goalBaselines, metric, target, current),
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.scrollArea}>
        {/* 日付ナビゲーション */}
        <div className={styles.dateNavRow}>
          <button
            className={styles.dateNavBtn}
            onClick={() => setCurrentDate((d) => subDays(d, 1))}
            aria-label="前の日"
          >
            <ChevronLeft size={18} />
          </button>
          <span className={styles.dateNavTitle}>{formatDisplay(currentDate)}</span>
          <button
            className={styles.dateNavBtn}
            onClick={() => setCurrentDate((d) => addDays(d, 1))}
            aria-label="次の日"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* 基本情報カード */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>基本情報</div>
          <InputRow label="身長" unit="cm" value={positiveOrNull(settings.height)}
            onBlur={handleHeightBlur} />
          <InputRow label="目標体重" unit="kg" value={positiveOrNull(settings.targetWeight)}
            onBlur={(v) => handleGoalBlur('weight', v)} />
          <InputRow label="目標体脂肪率" unit="%" value={positiveOrNull(settings.targetBodyFat)}
            onBlur={(v) => handleGoalBlur('bodyFat', v)} />
          <InputRow label="目標筋肉量" unit="kg" value={positiveOrNull(settings.targetMuscleMassKg)}
            onBlur={(v) => handleGoalBlur('muscleMass', v)} />
        </div>

        {/* 大会・イベントカード */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>大会・イベント</div>
          <ContestEditor />
        </div>

        {/* 計測値入力カード */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>計測値</div>
          <InputRow label="体重" unit="kg" value={record.weight}
            onBlur={(v) => handleNumBlur('weight', v)} onClear={() => handleClear('weight')} />
          <InputRow label="体脂肪" unit="%" value={record.bodyFat}
            onBlur={(v) => handleNumBlur('bodyFat', v)} onClear={() => handleClear('bodyFat')} />
          <InputRow label="筋肉量" unit={muscleMassUnitLabel} value={record.muscleMass}
            onBlur={(v) => handleNumBlur('muscleMass', v)} onClear={() => handleClear('muscleMass')} />
          <InputRow label="ウエスト" unit="cm" value={record.waist}
            onBlur={(v) => handleNumBlur('waist', v)} onClear={() => handleClear('waist')} />
          <div className={styles.memoRow}>
            <label className={styles.memoLabel} htmlFor={memoInputId}>メモ</label>
            <input id={memoInputId} className={styles.memoInput} type="text" placeholder="メモを入力"
              defaultValue={record.memo} onBlur={(e) => handleMemoBlur(e.target.value)}
              key={`memo-${dateStr}`} />
          </div>
        </div>

        {/* 計算値カード */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>計算値</div>
          <CalcRow label="BMI" value={calc.bmi !== null ? String(calc.bmi) : null} />
          <CalcRow label="体脂肪量" value={calc.bodyFatMass !== null ? `${calc.bodyFatMass} kg` : null} />
          <CalcRow label="除脂肪体重" value={calc.leanBodyMass !== null ? `${calc.leanBodyMass} kg` : null} />
          <CalcRow label="筋重量" value={calc.muscleMassKg !== null ? `${calc.muscleMassKg} kg` : null} />
        </div>

      </div>
    </div>
  )
}

interface InputRowProps {
  label: string; unit: string; value: number | null
  onBlur: (raw: string) => void
  onClear?: () => void // 省略するとクリアボタンを描かない（基本情報の欄は空にして保存する）
}

function InputRow({ label, unit, value, onBlur, onClear }: InputRowProps) {
  const valueInputId = useId()
  return (
    <div className={styles.inputRow}>
      <label className={styles.inputLabel} htmlFor={valueInputId}>{label}</label>
      <div className={styles.inputRight}>
        <input id={valueInputId} className={styles.numInput} type="number" min="0" step="0.1"
          defaultValue={value !== null ? value : ''} placeholder="———"
          onBlur={(e) => onBlur(e.target.value)} key={`${label}-${value}`} />
        <span className={styles.unitLabel}>{unit}</span>
        {onClear && (
          <button className={styles.clearButton} aria-label={`${label}をクリア`} onClick={onClear}><X size={13} /></button>
        )}
      </div>
    </div>
  )
}

interface CalcRowProps {
  label: string; value: string | null
}

function CalcRow({ label, value }: CalcRowProps) {
  return (
    <div className={styles.calcRow}>
      <span className={styles.calcLabel}>{label}</span>
      <div className={styles.calcRight}>
        <span className={`${styles.calcValue} ${value === null ? styles.calcEmpty : ''}`}>
          {value ?? '———'}
        </span>
      </div>
    </div>
  )
}
