import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import Sidebar from '../Sidebar/Sidebar'
import { usePageHeader } from '../../contexts/PageHeaderContext'
import type { TabName } from '../../types'
import styles from './Layout.module.css'

interface LayoutProps {
  children: ReactNode
}

function getActiveTab(pathname: string): TabName {
  if (pathname.startsWith('/history')) return 'history'
  if (pathname.startsWith('/body')) return 'body'
  if (pathname.startsWith('/settings')) return 'settings'
  return 'home'
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const activeTab = getActiveTab(location.pathname)
  const { header } = usePageHeader()

  return (
    <div className={styles.layout}>
      <Sidebar activeTab={activeTab} />
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <div className={styles.headerLeft}>
              {header.leftElement ?? null}
            </div>
            <h1 className={`${styles.title} ${header.centered ? styles.titleCentered : ''}`}>
              {header.title}
            </h1>
            <div className={styles.headerRight}>
              {header.rightElement ?? null}
            </div>
          </div>
          {header.subtitle && (
            <div className={styles.headerSubtitle}>{header.subtitle}</div>
          )}
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  )
}
