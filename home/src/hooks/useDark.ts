import { useEffect, useState } from 'react'

export type ColorScheme = 'light' | 'dark' | 'auto'

export const useDark = (defaultMode: ColorScheme = 'auto') => {
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  let prefersDark = query.matches

  const [colorMode, setColorMode] = useState<ColorScheme>(defaultMode)
  const [isDark, setIsDark] = useState<boolean>(defaultMode === 'auto' ? prefersDark : defaultMode === 'dark')

  query.onchange = (e) => {
    prefersDark = e.matches
    if (colorMode === 'auto') {
      setIsDark(prefersDark)
    }
  }

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
    else {
      document.documentElement.setAttribute('data-theme', 'light')
    }
    if (colorMode !== 'auto') {
      setColorMode(isDark ? 'dark' : 'light')
    }
  }, [isDark])

  useEffect(() => {
    if (colorMode === 'auto') {
      setIsDark(prefersDark)
    }
    else {
      setIsDark(colorMode === 'dark')
    }
  }, [colorMode])

  const toggleDark = () => {
    setIsDark(!isDark)
  }
  const changeMode = (newMode: ColorScheme) => {
    setColorMode(newMode)
  }

  return {
    isDark,
    colorMode,
    toggleDark,
    changeMode,
  }
}
