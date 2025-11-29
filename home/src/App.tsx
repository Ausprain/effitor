import React, { useState } from 'react'
import Navbar from './components/Navbar'
import MainContent from './components/MainContent'

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-indigo-950 transition-colors duration-300 p-4">
      {/* 固定顶部导航栏 */}
      <div className="fixed top-4 left-0 right-0 z-50 mx-auto w-4/5 max-w-[960px] bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg">
        <Navbar theme={theme} onToggleTheme={toggleTheme} />
      </div>

      {/* 主内容区域 */}
      <div className="pt-24 mx-auto w-4/5 max-w-[960px] min-h-screen">
        <MainContent />
      </div>
    </div>
  )
}

export default App
