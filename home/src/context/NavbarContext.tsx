import { createContext, useContext, useEffect, useState } from 'react'
import Navbar from '../components/navbar/TheNavbar'
import type { HotstringInfo, KeyState } from '../editor/plugins/typingTipAssist'
import i18n from '../i18n'

export type ColorScheme = 'light' | 'dark' | 'auto'

export interface NavbarContextType {
  // Color Scheme
  isDark: boolean
  colorMode: ColorScheme
  toggleDark: () => void
  changeMode: (newMode: ColorScheme) => void

  navbarBottom: number
  setNavbarBottom: (bottom: number) => void

  // Language
  currentLanguage: string
  changeLanguage: (lang: string) => void

  // Editor State
  isEditorFocused: boolean
  setIsEditorFocused: (focused: boolean) => void

  // Key and Hotstring State
  keyState: KeyState
  setKeyState: React.Dispatch<React.SetStateAction<KeyState>>
  hotstringState: HotstringInfo[]
  setHotstringState: React.Dispatch<React.SetStateAction<HotstringInfo[]>>
}

const NavbarContext = createContext<NavbarContextType | null>(null)

export const NavbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Color Scheme
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  const [prefersDark, setPrefersDark] = useState(query.matches)

  const [colorMode, setColorMode] = useState<ColorScheme>('auto')
  const [isDark, setIsDark] = useState<boolean>(prefersDark)

  const [navbarBottom, setNavbarBottom] = useState(64)

  // Language
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language)

  // Editor State
  const [isEditorFocused, setIsEditorFocused] = useState(false)

  // Key and Hotstring State
  const [keyState, setKeyState] = useState<KeyState>({
    index: 0,
    key: '',
    mods: [],
    nextMods: [],
    keys: [],
  })
  const [hotstringState, setHotstringState] = useState<HotstringInfo[]>([])

  // Listen for system theme changes
  useEffect(() => {
    const handleThemeChange = (e: MediaQueryListEvent) => {
      setPrefersDark(e.matches)
    }

    query.addEventListener('change', handleThemeChange)
    return () => query.removeEventListener('change', handleThemeChange)
  }, [])

  // Update dark mode based on colorMode and prefersDark
  useEffect(() => {
    if (colorMode === 'auto') {
      setIsDark(prefersDark)
    }
    else {
      setIsDark(colorMode === 'dark')
    }
  }, [colorMode, prefersDark])

  // Apply dark mode to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
    else {
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }, [isDark])

  // Color mode methods
  const toggleDark = () => {
    setColorMode((prevMode) => {
      if (prevMode === 'light') return 'dark'
      if (prevMode === 'dark') return 'light'
      return isDark ? 'light' : 'dark'
    })
  }

  const changeMode = (newMode: ColorScheme) => {
    setColorMode(newMode)
  }

  // Language methods
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
    setCurrentLanguage(lang)
  }

  const contextValue: NavbarContextType = {
    navbarBottom,
    setNavbarBottom,

    // Color Scheme
    isDark,
    colorMode,
    toggleDark,
    changeMode,

    // Language
    currentLanguage,
    changeLanguage,

    // Key and Hotstring State
    keyState,
    setKeyState,
    hotstringState,
    setHotstringState,

    // Editor State
    isEditorFocused,
    setIsEditorFocused,

  }

  return (
    <NavbarContext.Provider value={contextValue}>
      {/* 固定顶部导航栏 */}
      <Navbar />
      {children}
    </NavbarContext.Provider>
  )
}

// Custom hook to use NavbarContext
export const useNavbar = () => {
  const context = useContext(NavbarContext)
  if (!context) {
    throw new Error('useNavbar must be used within a NavbarProvider')
  }
  return context
}
