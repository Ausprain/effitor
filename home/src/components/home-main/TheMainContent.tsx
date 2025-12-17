import React, { useCallback, useEffect, useRef } from 'react'
// import { useScroll, useTransform, motion } from 'framer-motion'
import MainSlogan from './TheMainSlogan'
import TryButtons from './TryButtons'
import { useNavbar } from '../../context/NavbarContext'
import HomeEditor from '../home-editor'
import { TheQualities } from './TheQualities'
import { FeatureViewer } from '../feature-viewer'

/**
 * 自定义迅速平滑滚动函数
 * @param target 要滚动到的 scrollTop
 * @param duration 滚动持续时间，单位毫秒
 */
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
const stickElToNavBottom = (el: HTMLElement, navbarBottom: number, gap = 16) => {
  const elTop = el.offsetTop

  const currentDistance = elTop - window.scrollY - navbarBottom
  if (Math.abs(currentDistance - gap) > 1) {
    smoothScroll(elTop - navbarBottom - gap)
  }
}

const HomeMainContent: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { navbarBottom, isEditorFocused, setIsEditorFocused } = useNavbar()
  const editorAreaRef = useRef<HTMLDivElement>(null)
  const featureViewerRef = useRef<HTMLDivElement>(null)

  const focusEditorToStick = useCallback(() => {
    // 当编辑器获得焦点时的自定义逻辑，包括滚动功能
    if (!editorAreaRef.current) {
      return
    }
    if (!isEditorFocused) {
      setIsEditorFocused(true)
    }
    stickElToNavBottom(editorAreaRef.current, navbarBottom)
  }, [navbarBottom])
  const stickFeature = useCallback(() => {
    if (!featureViewerRef.current) {
      return
    }
    stickElToNavBottom(featureViewerRef.current, navbarBottom)
  }, [navbarBottom])

  useEffect(() => {
    if (isEditorFocused) {
      focusEditorToStick()
    }
  }, [isEditorFocused])

  // const { scrollY } = useScroll()
  // const _rotate = useTransform(scrollY, [820, 1280], [0, 90])

  return (
    <div className="w-4/5 max-w-[960px] mx-auto">
      {/* 标语 */}
      <MainSlogan />

      {/* 尝试按钮 */}
      <TryButtons onClickTryNow={focusEditorToStick} onClickFeature={stickFeature} />

      {/* <p>Effitor 是一个为编辑体验而生的富文本编辑器。它的一切设计，都为极致的编辑体验服务，包括但不限于：语言适应的光标控制能力、强大的快捷键和热字符串支持、优雅的外观、高可扩展性和高性能。</p> */}

      {/* 功能介绍 */}
      <TheQualities />

      <div className="my-12" ref={featureViewerRef}>
        <FeatureViewer />
      </div>

      {/* 尝试编辑器 */}
      {/* <motion.div */}
      <div
        ref={editorAreaRef}
        className="rounded-xl shadow-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 transition-colors"
        // style={{ rotateX: rotate, transformOrigin: 'bottom', transform: `translateZ(50px)` }}
      >
        <HomeEditor />
      </div>
      {/* </motion.div> */}

      {children}
    </div>
  )
}

export default HomeMainContent
