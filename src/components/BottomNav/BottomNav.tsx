import { Link } from 'react-router-dom'
import type { BottomNavProps, TabName } from '../../types'
import styles from './BottomNav.module.css'

interface TabConfig {
  id: TabName
  label: string
  href: string
  icon: string
}

const TABS: TabConfig[] = [
  { id: 'home', label: 'ホーム', href: '/', icon: '🏠' },
  { id: 'history', label: '履歴', href: '/history', icon: '📋' },
  { id: 'body', label: '体組成', href: '/body', icon: '⚖️' },
  { id: 'settings', label: '設定', href: '/settings', icon: '⚙️' },
]

export default function BottomNav({ activeTab }: BottomNavProps) {
  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <Link
            key={tab.id}
            to={tab.href}
            className={styles.tab}
            data-active={isActive ? 'true' : 'false'}
          >
            <span
              data-testid={`tab-${tab.id}`}
              data-active={isActive ? 'true' : 'false'}
              className={styles.tabInner}
            >
              <span className={styles.icon}>{tab.icon}</span>
              <span className={styles.label}>{tab.label}</span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
