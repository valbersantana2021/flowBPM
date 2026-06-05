'use client'

import { useTheme as useNextTheme } from 'next-themes'

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme()

  function toggle() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return { theme, resolvedTheme, setTheme, toggle }
}
