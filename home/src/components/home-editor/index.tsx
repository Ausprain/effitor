import React, { useEffect, useRef } from 'react'

import './index.css'
import type { Et } from 'effitor'
import { createEditor } from '../../editor/editor'
import { useNavbar } from '../../context/NavbarContext'
import { useDarkAssist } from '../../editor/plugins/darkAssist'
import { useTypingTipAssist } from '../../editor/plugins/typingTipAssist'

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

const HomeEditor: React.FC = () => {
  const {
    isEditorFocused,
    setIsEditorFocused,
    setKeyState,
    setHotstringState,
    isDark,
    toggleDark,
  } = useNavbar()

  // 获取 editor-host 元素的引用
  const editorHostRef = useRef<HTMLDivElement>(null)
  editorFocusCallbacks.onFocus = () => setIsEditorFocused(true)
  editorFocusCallbacks.onBlur = () => setIsEditorFocused(false)

  useEffect(() => {
    if (!editorHostRef.current || editor.isMounted) {
      return
    }
    editor.mount(editorHostRef.current)
    editor.context.assists.darkAssist.toggleDark = () => {
      toggleDark()
    }
    editor.context.assists.typingTip.onModChange = setKeyState
    editor.context.assists.typingTip.onHotstringProgress = setHotstringState
    return () => {
      editor.unmount()
    }
  }, [])
  useEffect(() => {
    if (isEditorFocused) {
      editor.focus()
      return
    }
  }, [isEditorFocused])
  useEffect(() => {
    if (editor) {
      editor.setColorScheme(isDark)
      editor.context.assists.darkAssist.isDark = isDark
    }
  }, [isDark])

  return (
    <div ref={editorHostRef} className="editor-host overflow-auto max-h-[600px]"></div>
  )
}

export default HomeEditor
