import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO, addDays, subDays } from 'date-fns'
import { useBodyRecords } from '../hooks/useBodyRecords'
import { useBodySettings } from '../hooks/useBodySettings'
import { calcBody } from '../utils/body'
import styles from './BodyPage.module.css'

function toDateStr(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function formatDisplay(date: Date): string {
  return format(date, 'yyyy/MM/dd')
}

function fmt(val: number | null, unit: string): string {
  if (val === null) return '———'
  return `${val} ${unit}`
}

export default function BodyPage() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const dateStr = toDateStr(currentDate)

  const { getRecord, updateField, clearField } = useBodyRecords()
  const { settings } = useBodySettings()

  const record = getRecord(dateStr)
  const calc = calcBody(record, settings)
  const muscleMassUnitLabel = settings.muscleMassUnit

  function handleNumBlur(
    field: 'weight' | 'bodyFat' | 'muscleMass' | 'waist',
    raw: string
  ) {
    const val = parseFloat(raw)
    if (!isNaN(val) && val > 0) {
      updateField(dateStr, field, val)
    }
  }

  function handleClear(field: 'weight' | 'bodyFat' | 'muscleMass' | 'waist') {
    clearField(dateStr, field)
  }

  function handleMemoBlur(memo: string) {
    updateField(dateStr, 'memo', memo)
  }

  return (
    <div className={styles.page}>
      {/* ヘッダー */}
      <div className={styles.bar}>
        <button
          className={styles.navButton}
          onClick={() => setCurrentDate((d) => subDays(d, 1))}
          aria-label="前の日"
        >
          ＜
        </button>
        <span className={styles.dateLabel}>{formatDisplay(currentDate)}</span>
        <button
          className={styles.navButton}
          onClick={() => setCurrentDate((d) => addDays(d, 1))}
          aria-label="次の日"
        >
          ＞
        </button>
        <button
          className={styles.gearButton}
          onClick={() => navigate('/body/settings')}
          aria-label="目標体重設定"
        >
          ⚙️
        </button>
      </div>

      <div className={styles.scrollArea}>
        {/* 入力セクション */}
        <div className={styles.card}>
          <InputRow
            label="体重"
            unit="kg"
            value={record.weight}
            onBlur={(v) => handleNumBlur('weight', v)}
            onClear={() => handleClear('weight')}
          />
          <InputRow
            label="体脂肪"
            unit="%"
            value={record.bodyFat}
            onBlur={(v) => handleNumBlur('bodyFat', v)}
            onClear={() => handleClear('bodyFat')}
          />
          <InputRow
            label="筋肉量"
            unit={muscleMassUnitLabel}
            value={record.muscleMass}
            onBlur={(v) => handleNumBlur('muscleMass', v)}
            onClear={() => handleClear('muscleMass')}
          />
          <InputRow
            label="ウエスト"
            unit="cm"
            value={record.waist}
            onBlur={(v) => handleNumBlur('waist', v)}
            onClear={() => handleClear('waist')}
          />

          {/* メモ */}
          <div className={styles.memoRow}>
            <span className={styles.memoLabel}>メモ</span>
            <input
              className={styles.memoInput}
              type="text"
              placeholder="メモを入力"
              defaultValue={record.memo}
              onBlur={(e) => handleMemoBlur(e.target.value)}
              key={`memo-${dateStr}`}
            />
          </div>
        </div>

        {/* 計算値セクション */}
        <div className={styles.card}>
          <CalcRow label="BMI" value={calc.bmi !== null ? String(calc.bmi) : null} />
          <CalcRow
            label="体脂肪量"
            value={calc.bodyFatMass !== null ? `${calc.bodyFatMass} kg` : null}
            showGraph
          />
          <CalcRow
            label="除脂肪体重"
            value={calc.leanBodyMass !== null ? `${calc.leanBodyMass} kg` : null}
            showGraph
          />
          <CalcRow
            label="筋重量"
            value={calc.muscleMassKg !== null ? `${calc.muscleMassKg} kg` : null}
            showGraph
          />
        </div>
      </div>
    </div>
  )
}

/* ── 入力行コンポーネント ── */
interface InputRowProps {
  label: string
  unit: string
  value: number | null
  onBlur: (raw: string) => void
  onClear: () => void
}

function InputRow({ label, unit, value, onBlur, onClear }: InputRowProps) {
  return (
    <div className={styles.inputRow}>
      <span className={styles.inputLabel}>{label}</span>
      <div className={styles.inputRight}>
        <input
          className={styles.numInput}
          type="number"
          min="0"
          step="0.1"
          defaultValue={value !== null ? value : ''}
          placeholder="———"
          onBlur={(e) => onBlur(e.target.value)}
          key={`${label}-${value}`}
        />
        <span className={styles.unitLabel}>{unit}</span>
        <button
          className={styles.clearButton}
          aria-label="クリア"
          onClick={onClear}
        >
          ✕
        </button>
        {/* 📈 グラフアイコン（プレースホルダー） */}
        <button className={styles.graphButton} aria-label="グラフ" disabled>
          📈
        </button>
      </div>
    </div>
  )
}

/* ── 計算値行コンポーネント ── */
interface CalcRowProps {
  label: string
  value: string | null
  showGraph?: boolean
}

function CalcRow({ label, value, showGraph }: CalcRowProps) {
  return (
    <div className={styles.calcRow}>
      <span className={styles.calcLabel}>{label}</span>
      <div className={styles.calcRight}>
        <span className={`${styles.calcValue} ${value === null ? styles.calcEmpty : ''}`}>
          {value ?? '———'}
        </span>
        {showGraph && (
          <button className={styles.graphButton} aria-label="グラフ" disabled>
            📈
          </button>
        )}
      </div>
    </div>
  )
}
