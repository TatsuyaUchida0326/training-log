import { Link } from 'react-router-dom'
import { TABS } from '../../data/navigation'
import type { TabName } from '../../types'
import styles from './BottomNav.module.css'

interface BottomNavProps {
  activeTab: TabName
}

/**
 * スマホ幅（< 900px）で表示する下部タブ。
 * Sidebar と同時に描画し、表示の切り替えは CSS のメディアクエリだけで行う
 * （JS の matchMedia で出し分けると初回描画でちらつくため）。
 */
export default function BottomNav({ activeTab }: BottomNavProps) {
  return (
    <nav className={styles.bottomNav} aria-label="メインナビゲーション">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <Link
            key={tab.id}
            to={tab.href}
            className={styles.navItem}
            data-testid={`bottom-nav-${tab.id}`}
            data-active={isActive ? 'true' : 'false'}
            aria-current={isActive ? 'page' : undefined}
          >
            <tab.Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className={styles.navLabel}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
