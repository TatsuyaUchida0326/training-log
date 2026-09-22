import { Link } from 'react-router-dom'
import { TABS } from '../../data/navigation'
import type { SidebarProps } from '../../types'
import styles from './Sidebar.module.css'

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
              aria-current={isActive ? 'page' : undefined}
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
