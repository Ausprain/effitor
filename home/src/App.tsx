import React, { useRef, useState } from 'react'
import MainContent from './components/MainContent'
import Navbar from './components/Navbar'
import Editor from './editor'
import type { HotstringInfo, KeyState } from './editor/plugins/typingTipAssist'
import { useColorScheme } from './hooks/useColorScheme'
const focusEditorToStick = (navbar?: HTMLElement | null, editorArea?: HTMLElement | null) => {
  // 当编辑器获得焦点时的自定义逻辑，包括滚动功能
  if (!navbar || !editorArea) {
    return
  }
  const navbarHeight = navbar.offsetHeight
  const navbarBottom = navbar.offsetTop + navbarHeight
  const editorTop = editorArea.offsetTop
  const desiredDistance = 16

  const currentDistance = editorTop - window.scrollY - navbarBottom
  if (Math.abs(currentDistance - desiredDistance) > 1) {
    const targetTop = editorTop - navbarBottom - desiredDistance

    // 自定义平滑滚动函数
    const smoothScroll = (target: number, duration?: number) => {
      const startPosition = window.scrollY
      const distance = target - startPosition
      let startTime: number | null = null

      if (!duration) {
        duration = Math.abs(distance) > 1000 ? 900 : 500
      }

      const cubicBezier_0101 = (x: number) => 3 * x ** (1 / 3) - 3 * x ** (2 / 3) + x
      const animation = (currentTime: number) => {
        if (startTime === null) startTime = currentTime
        const timeElapsed = currentTime - startTime
        const run = cubicBezier_0101(Math.min(timeElapsed / duration, 1))
        window.scrollTo(0, startPosition + distance * run)
        if (timeElapsed < duration) {
          requestAnimationFrame(animation)
        }
      }
      requestAnimationFrame(animation)
    }
    smoothScroll(targetTop)
  }
}

const App: React.FC = () => {
  const { colorMode, changeMode } = useColorScheme()

  const [isEditorFocused, setIsEditorFocused] = useState(false)
  const [keyState, setKeyState] = useState<KeyState>({
    key: '',
    mods: [],
    nextMods: [],
    keys: [],
  })
  const [hotstringState, setHotstringState] = useState<HotstringInfo[]>([])

  const navbarRef = useRef<HTMLDivElement>(null)
  const editorAreaRef = useRef<HTMLDivElement>(null)

  return (
    <div className="min-h-[200vh] bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-indigo-950 transition-colors">
      {/* 固定顶部导航栏 */}
      <div ref={navbarRef} className="fixed top-4 left-0 right-0 z-50 mx-auto w-4/5 max-w-[960px] bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg transition-colors">
        <Navbar
          isEditorFocused={isEditorFocused}
          keyState={keyState}
          hotstringState={hotstringState}
          colorMode={colorMode}
          onChangeColorMode={changeMode}
        />
      </div>

      {/* 主内容区域 */}
      <div className="pt-24 mx-auto min-h-screen">
        <MainContent onClickTryNow={() => focusEditorToStick(navbarRef.current, editorAreaRef.current)}>
          <div ref={editorAreaRef} className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 transition-colors">
            <Editor
              onFocus={() => {
                setIsEditorFocused(true)
                focusEditorToStick(navbarRef.current, editorAreaRef.current)
              }}
              onBlur={() => setIsEditorFocused(false)}
              onKeymodChange={setKeyState}
              onHotstringProgress={setHotstringState}
            />
          </div>
        </MainContent>
      </div>
    </div>
  )
}

export default App
