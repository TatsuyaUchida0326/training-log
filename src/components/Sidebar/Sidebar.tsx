import { Link } from 'react-router-dom'
import { Home, ClipboardList, Scale, Settings, type LucideIcon } from 'lucide-react'
import type { SidebarProps, TabName } from '../../types'
import styles from './Sidebar.module.css'

interface TabConfig {
  id: TabName
  label: string
  href: string
  Icon: LucideIcon
}

const TABS: TabConfig[] = [
  { id: 'home',     label: 'ホーム', href: '/',        Icon: Home },
  { id: 'history',  label: '履歴',   href: '/history', Icon: ClipboardList },
  { id: 'body',     label: '体組成', href: '/body',    Icon: Scale },
  { id: 'settings', label: '設定',   href: '/settings',Icon: Settings },
]

export default function Sidebar({ activeTab }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>Strength Log</div>
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
                <tab.Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={styles.label}>{tab.label}</span>
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
