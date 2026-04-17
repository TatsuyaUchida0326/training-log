import { useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useBodySettings } from '../hooks/useBodySettings'
import { usePageHeader } from '../contexts/PageHeaderContext'
import styles from './BodySettingsPage.module.css'

export default function BodySettingsPage() {
  const navigate = useNavigate()
  const { settings, updateSettings } = useBodySettings()
  const { setHeader } = usePageHeader()

  useEffect(() => {
    setHeader({
      title: '目標体重設定',
      centered: true,
      leftElement: (
        <button className="header-btn" onClick={() => navigate('/body')} aria-label="戻る">
          <ChevronLeft size={20} />
        </button>
      ),
    })
  }, [setHeader, navigate])

  function handleBlur(field: 'height' | 'targetWeight', raw: string) {
    const val = parseFloat(raw)
    updateSettings({ [field]: !isNaN(val) && val > 0 ? val : 0 })
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionLabel}>基本情報</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>身長</span>
            <div className={styles.rowInput}>
              <input className={styles.numInput} type="number" min="0" step="0.1"
                defaultValue={settings.height > 0 ? settings.height : ''}
                placeholder="0.0" onBlur={(e) => handleBlur('height', e.target.value)}
                key={`h-${settings.height}`} />
              <span className={styles.unit}>cm</span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>目標</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>目標体重</span>
            <div className={styles.rowInput}>
              <input className={styles.numInput} type="number" min="0" step="0.1"
                defaultValue={settings.targetWeight > 0 ? settings.targetWeight : ''}
                placeholder="0.0" onBlur={(e) => handleBlur('targetWeight', e.target.value)}
                key={`tw-${settings.targetWeight}`} />
              <span className={styles.unit}>kg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
