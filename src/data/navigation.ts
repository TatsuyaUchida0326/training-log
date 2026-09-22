import { Home, ClipboardList, Scale, Settings, type LucideIcon } from 'lucide-react'
import type { TabName } from '../types'

export interface TabConfig {
  id: TabName
  label: string
  href: string
  Icon: LucideIcon
}

/**
 * アプリのメインナビゲーション定義。
 * PC の Sidebar とスマホの BottomNav が同じ定義を読むことで、
 * 片方にだけタブを足して表示が食い違うのを防ぐ。
 */
export const TABS: TabConfig[] = [
  { id: 'home',     label: 'ホーム', href: '/',         Icon: Home },
  { id: 'history',  label: '履歴',   href: '/history',  Icon: ClipboardList },
  { id: 'body',     label: '体組成', href: '/body',     Icon: Scale },
  { id: 'settings', label: '設定',   href: '/settings', Icon: Settings },
]
