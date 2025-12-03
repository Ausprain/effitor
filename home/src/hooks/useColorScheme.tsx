import { createContext, useContext, useEffect, useState } from 'react'

export type ColorScheme = 'light' | 'dark' | 'auto'

const ColorSchemeContext = createContext<{
  isDark: boolean
  colorMode: ColorScheme
  toggleDark: () => void
  changeMode: (newMode: ColorScheme) => void
} | null>(null)

export const ColorSchemeProvider = ({ children }: { children: React.ReactNode }) => {
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  let prefersDark = query.matches

  const [colorMode, setColorMode] = useState<ColorScheme>('auto')
  const [isDark, setIsDark] = useState<boolean>(prefersDark)

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
    setIsDark(v => !v)
  }
  const changeMode = (newMode: ColorScheme) => {
    setColorMode(newMode)
  }

  return (
    <ColorSchemeContext value={{
      isDark,
      colorMode,
      toggleDark,
      changeMode,
    }}
    >
      {children}
    </ColorSchemeContext>
  )
}

// 自定义 Hook，供组件使用
export function useColorScheme() {
  const context = useContext(ColorSchemeContext)
  if (!context) {
    throw new Error('useColorScheme must be used within a ColorSchemeProvider')
  }
  return context
}
