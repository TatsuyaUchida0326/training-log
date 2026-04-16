import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import BottomNav from '../BottomNav/BottomNav'
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

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.title}>Strength Log</h1>
      </header>
      <main className={styles.main}>{children}</main>
      <BottomNav activeTab={activeTab} />
    </div>
  )
}
