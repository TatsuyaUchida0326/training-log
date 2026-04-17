import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X, TrendingUp } from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import { useBodyRecords } from '../hooks/useBodyRecords'
import { useBodySettings } from '../hooks/useBodySettings'
import { usePageHeader } from '../contexts/PageHeaderContext'
import { calcBody } from '../utils/body'
import styles from './BodyPage.module.css'

function toDateStr(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function formatDisplay(date: Date): string {
  return format(date, 'yyyy/MM/dd')
}

export default function BodyPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const dateStr = toDateStr(currentDate)

  const { getRecord, updateField, clearField } = useBodyRecords()
  const { settings, updateSettings } = useBodySettings()
  const { setHeader } = usePageHeader()

  const record = getRecord(dateStr)
  const calc = calcBody(record, settings)
  const muscleMassUnitLabel = settings.muscleMassUnit

  useEffect(() => {
    setHeader({
      title: formatDisplay(currentDate),
      centered: true,
      leftElement: (
        <button
          className="header-btn"
          onClick={() => setCurrentDate((d) => subDays(d, 1))}
          aria-label="前の日"
        >
          <ChevronLeft size={20} />
        </button>
      ),
      rightElement: (
        <button
          className="header-btn"
          onClick={() => setCurrentDate((d) => addDays(d, 1))}
          aria-label="次の日"
        >
          <ChevronRight size={20} />
        </button>
      ),
    })
  }, [currentDate, setHeader])

  function handleNumBlur(
    field: 'weight' | 'bodyFat' | 'muscleMass' | 'waist',
    raw: string
  ) {
    const val = parseFloat(raw)
    if (!isNaN(val) && val > 0) updateField(dateStr, field, val)
  }

  function handleClear(field: 'weight' | 'bodyFat' | 'muscleMass' | 'waist') {
    clearField(dateStr, field)
  }

  function handleMemoBlur(memo: string) {
    updateField(dateStr, 'memo', memo)
  }

  function handleSettingBlur(field: 'height' | 'targetWeight', raw: string) {
    const val = parseFloat(raw)
    updateSettings({ [field]: !isNaN(val) && val > 0 ? val : 0 })
  }

  return (
    <div className={styles.page}>
      <div className={styles.scrollArea}>

        {/* 基本情報カード */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>基本情報</div>
          <div className={styles.inputRow}>
            <span className={styles.inputLabel}>身長</span>
            <div className={styles.inputRight}>
              <input className={styles.numInput} type="number" min="0" step="0.1"
                defaultValue={settings.height > 0 ? settings.height : ''}
                placeholder="———"
                onBlur={(e) => handleSettingBlur('height', e.target.value)}
                key={`height-${settings.height}`} />
              <span className={styles.unitLabel}>cm</span>
            </div>
          </div>
          <div className={styles.inputRow}>
            <span className={styles.inputLabel}>目標体重</span>
            <div className={styles.inputRight}>
              <input className={styles.numInput} type="number" min="0" step="0.1"
                defaultValue={settings.targetWeight > 0 ? settings.targetWeight : ''}
                placeholder="———"
                onBlur={(e) => handleSettingBlur('targetWeight', e.target.value)}
                key={`tw-${settings.targetWeight}`} />
              <span className={styles.unitLabel}>kg</span>
            </div>
          </div>
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
            <span className={styles.memoLabel}>メモ</span>
            <input className={styles.memoInput} type="text" placeholder="メモを入力"
              defaultValue={record.memo} onBlur={(e) => handleMemoBlur(e.target.value)}
              key={`memo-${dateStr}`} />
          </div>
        </div>

        {/* 計算値カード */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>計算値</div>
          <CalcRow label="BMI" value={calc.bmi !== null ? String(calc.bmi) : null} />
          <CalcRow label="体脂肪量" value={calc.bodyFatMass !== null ? `${calc.bodyFatMass} kg` : null} showGraph />
          <CalcRow label="除脂肪体重" value={calc.leanBodyMass !== null ? `${calc.leanBodyMass} kg` : null} showGraph />
          <CalcRow label="筋重量" value={calc.muscleMassKg !== null ? `${calc.muscleMassKg} kg` : null} showGraph />
        </div>

      </div>
    </div>
  )
}

interface InputRowProps {
  label: string; unit: string; value: number | null
  onBlur: (raw: string) => void; onClear: () => void
}

function InputRow({ label, unit, value, onBlur, onClear }: InputRowProps) {
  return (
    <div className={styles.inputRow}>
      <span className={styles.inputLabel}>{label}</span>
      <div className={styles.inputRight}>
        <input className={styles.numInput} type="number" min="0" step="0.1"
          defaultValue={value !== null ? value : ''} placeholder="———"
          onBlur={(e) => onBlur(e.target.value)} key={`${label}-${value}`} />
        <span className={styles.unitLabel}>{unit}</span>
        <button className={styles.clearButton} aria-label="クリア" onClick={onClear}><X size={13} /></button>
        <button className={styles.graphButton} aria-label="グラフ" disabled><TrendingUp size={16} /></button>
      </div>
    </div>
  )
}

interface CalcRowProps {
  label: string; value: string | null; showGraph?: boolean
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
          <button className={styles.graphButton} aria-label="グラフ" disabled><TrendingUp size={16} /></button>
        )}
      </div>
    </div>
  )
}
