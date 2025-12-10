import React, { useEffect, useRef } from 'react'
import { useScroll, useTransform, motion } from 'framer-motion'
import MainSlogan from './TheMainSlogan'
import TryButtons from './TryButtons'
import { useNavbar } from '../../context/NavbarContext'
import HomeEditor from '../home-editor'
import { TheQualities } from './TheQualities'
import { FeatureViewer } from '../feature-viewer'

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

const HomeMainContent: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const editorAreaRef = useRef<HTMLDivElement>(null)
  const { navbarBottom, isEditorFocused, setIsEditorFocused } = useNavbar()

  const focusEditorToStick = () => {
    // 当编辑器获得焦点时的自定义逻辑，包括滚动功能
    if (!editorAreaRef.current) {
      return
    }
    if (!isEditorFocused) {
      setIsEditorFocused(true)
    }
    const editorTop = editorAreaRef.current.offsetTop
    const desiredDistance = 16

    const currentDistance = editorTop - window.scrollY - navbarBottom
    if (Math.abs(currentDistance - desiredDistance) > 1) {
      smoothScroll(editorTop - navbarBottom - desiredDistance)
    }
  }

  useEffect(() => {
    if (isEditorFocused) {
      focusEditorToStick()
    }
  }, [isEditorFocused])

  const { scrollY } = useScroll()
  const rotate = useTransform(scrollY, [820, 1280], [0, 90])

  return (
    <div className="w-4/5 max-w-[960px] mx-auto">
      {/* 标语 */}
      <MainSlogan />

      {/* 尝试按钮 */}
      <TryButtons onClickTryNow={focusEditorToStick} />

      {/* 功能介绍 */}
      <TheQualities />

      {/* 尝试编辑器 */}
      <motion.div
        ref={editorAreaRef}
        className="rounded-xl shadow-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 transition-colors"
        style={{ rotateX: rotate, transformOrigin: 'bottom', transform: `translateZ(50px)` }}
      >
        <HomeEditor />
      </motion.div>

      <FeatureViewer />

      {children}
    </div>
  )
}

export default HomeMainContent
