import { useState } from 'react'
import { addMonths, subMonths } from 'date-fns'
import Calendar from '../components/Calendar/Calendar'
import ContinuityGauge from '../components/ContinuityGauge/ContinuityGauge'
import TrophyBadge from '../components/TrophyBadge/TrophyBadge'
import type { TrophyRecord } from '../components/TrophyBadge/TrophyBadge'
import { useSettings } from '../hooks/useSettings'

// TODO: 記録機能実装後に実データに置き換える
const MOCK_TROPHIES: TrophyRecord[] = [
  { exerciseName: 'ベンチプレス', rm: 192, date: '04/16' },
  { exerciseName: 'スクワット', rm: 140, date: '04/14' },
]

const STAGE_SAMPLES = [
  { label: '青 (10)', value: 10 },
  { label: '緑 (30)', value: 30 },
  { label: '黄 (50)', value: 50 },
  { label: '紫 (70)', value: 70 },
  { label: '赤 (85)', value: 85 },
  { label: '🌈 (90)', value: 90 },
]

export default function HomePage() {
  const { settings } = useSettings()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [previewGauge, setPreviewGauge] = useState(10)

  const handlePrevMonth = () => setCurrentDate((d) => subMonths(d, 1))
  const handleNextMonth = () => setCurrentDate((d) => addMonths(d, 1))
  const handleToday = () => setCurrentDate(new Date())
  const handleDateSelect = (date: Date) => setSelectedDate(date)

  return (
    <div>
      <Calendar
        currentDate={currentDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        markedDates={[]}
      />
      {/* ▼ 確認用ボタン（実装完了後に削除） */}
      <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        {STAGE_SAMPLES.map((s) => (
          <button
            key={s.value}
            onClick={() => setPreviewGauge(s.value)}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.7rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: previewGauge === s.value ? '#22c55e' : '#f9fafb',
              color: previewGauge === s.value ? '#fff' : '#374151',
              cursor: 'pointer',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {/* ▲ 確認用ボタンここまで */}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ContinuityGauge current={previewGauge} requiredSets={settings.defaultSets} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <TrophyBadge trophies={MOCK_TROPHIES} />
        </div>
      </div>
    </div>
  )
}
