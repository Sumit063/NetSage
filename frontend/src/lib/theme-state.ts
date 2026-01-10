import { useEffect, useState } from 'react'

const STORAGE_KEY = 'netsage-theme'

export type ThemeMode = 'light' | 'dark'

export function useThemeMode(): [ThemeMode, (m: ThemeMode) => void, () => void] {
  const [mode, setMode] = useState<ThemeMode>('dark')

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) || 'dark'
    setMode(stored)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (mode === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  const toggle = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'))
  return [mode, setMode, toggle]
}
