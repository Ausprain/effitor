import React, { useEffect, useRef } from 'react'
import './index.css'
import { createEditor } from './editor'

import './plugins/keymap'
import { useTypingTipAssist, type HotstringInfo, type KeyState } from './plugins/typingTipAssist'
import type { Et } from 'effitor'
import { useDarkAssist } from './plugins/darkAssist'
import { useColorScheme } from '../hooks/useColorScheme'

// 监听编辑器focusin/focusout回调, 而不是简单的监听focus/blur事件
// 因为编辑器内部跨越contenteditable会导致编辑器失去焦点, 从而focus或blur
// 编辑器内部处理了这种情况, 通过回调方式通知外部
const editorFocusCallbacks = {
  onFocus: void 0 as undefined | (() => void),
  onBlur: void 0 as undefined | (() => void),
}
const listenFocusPlugin: Et.EditorPlugin = {
  name: 'listenFocusPlugin',
  effector: {
    focusinCallback: () => editorFocusCallbacks.onFocus?.(),
    focusoutCallback: () => editorFocusCallbacks.onBlur?.(),
  },
}
const editor = await createEditor({
  config: {
    USE_HOST_AS_SCROLL_CONTAINER: true,
  },
  extraPlugins: [
    listenFocusPlugin,
    useTypingTipAssist(),
    useDarkAssist(),
  ],
})

const Editor: React.FC<{
  // 当编辑器获得焦点时的回调函数
  onFocus?: () => void
  // 当编辑器失去焦点时的回调函数
  onBlur?: () => void
  onKeymodChange?: (state: KeyState) => void
  onHotstringProgress?: (state: HotstringInfo[]) => void
}
> = ({
  onFocus,
  onBlur,
  onKeymodChange = void 0,
  onHotstringProgress = void 0,
}) => {
  const { isDark, toggleDark } = useColorScheme()

  // 获取 editor-host 元素的引用
  const editorHostRef = useRef<HTMLDivElement>(null)
  editorFocusCallbacks.onFocus = onFocus
  editorFocusCallbacks.onBlur = onBlur

  useEffect(() => {
    if (!editorHostRef.current || editor.isMounted) {
      return
    }
    editor.mount(editorHostRef.current)
    editor.context.assists.darkAssist.toggleDark = () => {
      console.log('toggle dark', isDark)
      toggleDark()
    }
    editor.context.assists.typingTip.onModChange = onKeymodChange
    editor.context.assists.typingTip.onHotstringProgress = onHotstringProgress
    return () => {
      editor.unmount()
    }
  }, [])
  useEffect(() => {
    if (editor) {
      editor.setColorScheme(isDark)
      editor.context.assists.darkAssist.isDark = isDark
    }
  }, [isDark])

  return (
    <div className="w-full h-full">
      <div ref={editorHostRef} className="editor-host overflow-auto max-h-[600px]"></div>
    </div>
  )
}

export default Editor
