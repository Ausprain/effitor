import { useAIAssist, type TypingResult } from '@effitor/assist-ai'
import { ArrowBigDown, Pause, Play } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { create } from 'zustand'
import { useNavbar } from '../../context/NavbarContext'
import { createEditor } from '../../editor/editor'
import { useKeyTipAssist } from '../../editor/plugins/key-tip'
import type { FeatureData } from './config'
import { useTranslation } from 'react-i18next'

const _state = create<{
  progress: number
  finished: boolean
  paused: boolean
  setProgress: (progress: number) => void
  setFinished: (finished: boolean) => void
  setPaused: (paused: boolean) => void
}>(set => ({
  progress: 0,
  finished: false,
  paused: false,
  setProgress: (progress: number) => set({ progress }),
  setFinished: (finished: boolean) => set({ finished }),
  setPaused: (paused: boolean) => set({ paused }),
}))

export const FeatureEditor: React.FC<{
  featureData: FeatureData | null
  onFinished: () => void
  onTryThis: () => void
}> = memo(({
  featureData,
  onFinished,
  onTryThis,
}) => {
  const editorHostRef = useRef<HTMLDivElement>(null)
  const editor = useMemo(() => {
    return createEditor({
      editorStyle: 'min-height: 100%; padding-bottom: 64px;',
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

  const countDown = 3000
  const state = _state()
  const pause = useCallback(() => {
    typingResult.current?.pause()
    state.setPaused(true)
  }, [])
  const resumeOrNext = useCallback(() => {
    if (_state.getState().finished) {
      onFinished()
    }
    else {
      state.setPaused(false)
      typingResult.current?.resume()
    }
  }, [])

  const { isDark } = useNavbar()
  useEffect(() => {
    if (editor && editor.isMounted) {
      editor.setColorScheme(isDark)
    }
  }, [isDark])

  const typingResult = useRef<TypingResult | null>(null)
  const needPause = useRef<boolean>(false)
  const { isEditorFocused } = useNavbar()
  useEffect(() => {
    if (!editorHostRef.current || editor.isMounted) {
      return
    }
    editor.mount(editorHostRef.current, {
      editorBodyOptions: {
        autoScrollPaddingY: 100,
      },
    })
    editor.setColorScheme(isDark)
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
    if (isEditorFocused) {
      typingResult.current?.pause()
    }
    else {
      typingResult.current?.resume()
    }
  }, [isEditorFocused])

  useEffect(() => {
    if (!editor || !editor.isMounted || !featureData) {
      return
    }
    state.setProgress(0)
    state.setPaused(false)
    state.setFinished(false)
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
          state.setFinished(true)
          const startProgress = Date.now()
          const onProgress = () => {
            const gone = Date.now() - startProgress
            state.setProgress(gone)
            if (_state.getState().paused) {
              return rej()
            }
            if (gone > countDown) {
              return res()
            }
            requestAnimationFrame(onProgress)
          }
          requestAnimationFrame(onProgress)
        })
      }).then(() => {
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

  const { t } = useTranslation()

  return (
    <div className="group relative h-full bg-base-100 border border-base-300 transition-colors">
      <div className="h-full overflow-auto" ref={editorHostRef}></div>
      <div className={`
        join absolute bottom-1 left-1/2 -translate-x-1/2
        transition-all duration-150
        group-hover:translate-y-0
        ${state.finished || state.paused ? 'translate-y-0' : 'translate-y-12'}
        rounded-sm overflow-hidden
        `}
      >
        <progress
          className="progress progress-primary w-full h-0.5
          absolute top-0 z-1
        "
          value={state.progress}
          max={countDown}
        >
        </progress>
        <button
          className="btn join-item text-gray-700 dark:text-gray-300 transition-colors"
          onClick={state.paused ? resumeOrNext : pause}
        >
          {state.paused ? <Play /> : <Pause />}
        </button>
        <button
          className="btn join-item text-gray-700 dark:text-gray-300 transition-colors"
          onClick={onTryThis}
        >
          {t('main.try_this')}
          <ArrowBigDown />
        </button>
      </div>
    </div>
  )
})
