import React from 'react'

interface NavbarProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

const Navbar: React.FC<NavbarProps> = ({ theme, onToggleTheme }) => {
  return (
    <div className="flex items-center justify-between p-4">
      {/* 左侧：Logo 和名称 */}
      <div className="flex items-center gap-2">
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          ✨Effitor
        </div>
      </div>

      {/* 中间：导航链接 */}
      <div className="hidden md:flex items-center gap-6">
        <a href="#" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
          Playground
        </a>
        <span className="text-gray-400 dark:text-gray-600">|</span>
        <a href="#" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
          Docs
        </a>
        <span className="text-gray-400 dark:text-gray-600">|</span>
        <a href="https://github.com/Ausprain/effitor" target="_blank" rel="noopener noreferrer" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
          Github
        </a>
      </div>

      {/* 右侧：主题切换按钮 */}
      <div>
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light'
            ? (
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )
            : (
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
        </button>
      </div>
    </div>
  )
}

export default Navbar
