import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

interface HeaderConfig {
  title: string
  centered?: boolean
  leftElement?: ReactNode
  rightElement?: ReactNode
  subtitle?: ReactNode
}

interface PageHeaderContextValue {
  header: HeaderConfig
  setHeader: (config: HeaderConfig) => void
}

const defaultHeader: HeaderConfig = {
  title: 'Strength Log',
  centered: false,
}

const PageHeaderContext = createContext<PageHeaderContextValue>({
  header: defaultHeader,
  setHeader: () => {},
})

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeaderState] = useState<HeaderConfig>(defaultHeader)
  const setHeader = useCallback((config: HeaderConfig) => {
    setHeaderState(config)
  }, [])
  return (
    <PageHeaderContext.Provider value={{ header, setHeader }}>
      {children}
    </PageHeaderContext.Provider>
  )
}

export function usePageHeader() {
  return useContext(PageHeaderContext)
}
