import React from 'react'
import type { HotstringInfo, KeyState } from '../editor/plugins/typingTipAssist'
import KeyCombination from './HotkeyTip'
import type { ColorScheme } from '../hooks/useDark'
import HotstringTip from './HotstringTip'

const Navbar: React.FC<{
  hotstringState: HotstringInfo[]
  keyState: KeyState
  isEditorFocused: boolean
  colorMode: ColorScheme
  onChangeColorMode: (mode: ColorScheme) => void
}> = ({
  hotstringState,
  keyState,
  isEditorFocused,
  colorMode,
  onChangeColorMode,
}) => {
  return (
    <div className="p-4">
      {/* 导航栏 */}
      <section className={`${isEditorFocused ? 'opacity-0' : 'relative z-10'} flex items-center justify-between transition-opacity`}>
        {/* 左侧：Logo 和名称 */}
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold bg-linear-to-tr from-[#6671e7]  to-[#9921e7] bg-clip-text text-transparent">
            ✨Effitor
          </div>
        </div>

        {/* 中间：导航链接 */}
        <div className="text-gray-700 transition-colors dark:text-gray-300 hidden md:flex items-center gap-6">
          <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 font-medium">
            Playground
          </a>
          <span className="text-gray-400 dark:text-gray-600">|</span>
          <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 font-medium">
            Docs
          </a>
          <span className="text-gray-400 dark:text-gray-600">|</span>
          <a href="https://github.com/Ausprain/effitor" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 font-medium">
            Github
          </a>
        </div>

        {/* 右侧：主题切换按钮 */}
        <div>
          <button
            onClick={() => onChangeColorMode(colorMode === 'auto' ? 'dark' : colorMode === 'dark' ? 'light' : 'auto')}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle theme"
          >
            {
              {
                auto: (
                  <span>
                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v2" />
                      <path d="M14.837 16.385a6 6 0 1 1-7.223-7.222c.624-.147.97.66.715 1.248a4 4 0 0 0 5.26 5.259c.589-.255 1.396.09 1.248.715" />
                      <path d="M16 12a4 4 0 0 0-4-4" />
                      <path d="m19 5-1.256 1.256" />
                      <path d="M20 12h2" />
                    </svg>
                  </span>
                ),
                light: (
                  <span>
                    <svg className="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2" />
                      <path d="M12 20v2" />
                      <path d="m4.93 4.93 1.41 1.41" />
                      <path d="m17.66 17.66 1.41 1.41" />
                      <path d="M2 12h2" />
                      <path d="M20 12h2" />
                      <path d="m6.34 17.66-1.41 1.41" />
                      <path d="m19.07 4.93-1.41 1.41" />
                    </svg>
                  </span>
                ),
                dark: (
                  <span>
                    <svg className="w-5 h-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" /></svg>
                  </span>
                ),
              }[colorMode]
            }
          </button>
        </div>
      </section>
      {/* 按键跟踪 */}
      <section className={`${isEditorFocused ? 'opacity-100' : ''} opacity-0 absolute inset-0 pl-[48px] ml-[-36px] mr-3 pt-[20px] mt-[-20px] overflow-x-auto transition-opacity select-none`}>
        {
          hotstringState.length
            ? (
                <HotstringTip hotstringState={hotstringState} />
              )
            : (
                <KeyCombination keyState={keyState} />
              )
        }
      </section>
    </div>
  )
}

export default Navbar
