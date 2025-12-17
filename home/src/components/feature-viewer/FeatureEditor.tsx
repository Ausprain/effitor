import { useAIAssist, type TypingResult } from '@effitor/assist-ai'
import { memo, useEffect, useMemo, useRef } from 'react'
import { useNavbar } from '../../context/NavbarContext'
import { createEditor } from '../../editor/editor'
import { useKeyTipAssist } from '../../editor/plugins/key-tip'
import type { FeatureData } from './config'

export const FeatureEditor: React.FC<{
  featureData: FeatureData | null
  onFinished: () => void
}> = memo(({
  featureData,
  onFinished,
}) => {
  const { isEditorFocused } = useNavbar()
  useEffect(() => {
    if (isEditorFocused) {
      typingResult.current?.pause()
    }
    else {
      typingResult.current?.resume()
    }
  }, [isEditorFocused])

  const { isDark } = useNavbar()
  const typingResult = useRef<TypingResult | null>(null)
  const editorHostRef = useRef<HTMLDivElement>(null)
  const editor = useMemo(() => {
    return createEditor({
      editorStyle: 'min-height: 100%;',
      config: {
        USE_HOST_AS_SCROLL_CONTAINER: true,
        UNDO_LENGTH: 200,
      },
      extraPlugins: [
        useAIAssist(),
        useKeyTipAssist(),
      ],
    })
  }, [])

  const needPause = useRef<boolean>(false)
  useEffect(() => {
    if (!editorHostRef.current || editor.isMounted) {
      return
    }
    editor.mount(editorHostRef.current)
    editor.setReadonly(true)

    const ob = new IntersectionObserver((items) => {
      for (const item of items) {
        if (item.isIntersecting) {
          typingResult.current?.resume()
          needPause.current = false
        }
        else {
          typingResult.current?.pause()
          needPause.current = true
        }
      }
    })
    ob.observe(editorHostRef.current)

    return () => {
      ob.disconnect()
      editor.unmount()
    }
  }, [])

  useEffect(() => {
    if (editor) {
      editor.setColorScheme(isDark)
    }
  }, [isDark])

  useEffect(() => {
    if (!editor || !editor.isMounted || !featureData) {
      return
    }
    editor.context.commonHandler.initEditorContents(true)
    const result = editor.context.assists.ai.typingMarkdown(featureData.editorActions)
    result.pause()
    typingResult.current = result
    let rejectReset: () => void
    const timer = setTimeout(() => {
      if (editor.bodyEl.textContent.length > 1 || editor.bodyEl.textContent !== '\u200b') {
        editor.context.commonHandler.initEditorContents(true)
      }
      if (!needPause.current) {
        result.resume()
      }
      result.finished.then(() => {
        return new Promise<void>((res, rej) => {
          rejectReset = rej
          const undo = () => {
            if (!editor.context.commandManager.undoTransaction()) {
              res()
              return
            }
            requestAnimationFrame(undo)
          }
          undo()
        })
      }).then(() => {
        onFinished()
      }).catch(() => { /** omit rejected */ })
    }, 500)
    return () => {
      rejectReset?.()
      result.cancel()
      clearTimeout(timer)
    }
  }, [featureData])

  return (
    <div className="relative h-full bg-base-100 border border-base-300 transition-colors">
      <div className="h-full overflow-auto" ref={editorHostRef}></div>
    </div>
  )
})
