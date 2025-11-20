import type { DropdownMenuItemOptions } from '@effitor/assist-dropdown'
import type { Et } from '@effitor/core'
import { etcode, traversal, useEffectorContext } from '@effitor/core'
import {
  alignCenterIcon,
  alignLeftIcon,
  alignRightIcon,
  audioFileIcon,
  fullScreenIcon,
  HtmlAttrEnum,
  HtmlCharEnum,
  imageFileIcon,
  trashIcon,
  uploadIcon,
  videoFileIcon,
} from '@effitor/shared'

import { type IEtMediaElement, MEDIA_ET_TYPE, MediaEnum, MediaPluginContext, MediaState, MediaType } from './config'

const _ectx = useEffectorContext('$mediaEx', {
  filterFiles: (media: MediaPluginContext['image' | 'audio' | 'video'], files: File[]) => {
    if (!media) {
      return []
    }
    return [...files].filter((file) => {
      if (file.size <= 0 || file.size > media.maxSize) {
        return false
      }
      const [kind, ext] = file.type.split('/')
      return kind === media.type && media.exts.has(ext)
    })
  },
  tryAlignMedia: (ctx: Et.EditorContext, anchorText: Et.Text, atEnd: boolean) => {
    let mediaEl = atEnd ? traversal.treeNextNode(anchorText) : traversal.treePrevNode(anchorText)
    if (!(mediaEl = ctx.body.findInclusiveEtParent(mediaEl))) {
      return false
    }
    if (etcode.check<IEtMediaElement>(mediaEl, ctx.pctx.$mediaPx.MEDIA_ET_TYPE)) {
      const currState = mediaEl.mediaState
      if (currState === MediaState.Failed) {
        return false
      }
      mediaEl.mediaState = {
        [MediaState.Expanded]: MediaState.Collapsed,
        [MediaState.FloatLeft]: MediaState.Center,
        [MediaState.Center]: MediaState.FloatRight,
        [MediaState.FloatRight]: MediaState.Collapsed,
        [MediaState.Collapsed]: MediaState.FloatLeft,
      }[currState] ?? MediaState.Collapsed

      return true
    }
  },
})

export const mediaEffector: Et.EffectorSupportInline = {
  inline: true,

  keydownSolver: {
    // 光标在媒体元素左右时, 按下tab调整媒体元素浮动位置
    Tab: (ev, ctx, ectx) => {
      if (ev.repeat) {
        return
      }
      const text = ctx.selection.anchorText, offset = ctx.selection.anchorOffset
      if (!text) {
        return
      }

      let atEnd = false
      if (offset <= 1) {
        if (offset === 1 && text.data[0] !== HtmlCharEnum.ZERO_WIDTH_SPACE) {
          return
        }
      }
      else {
        if (offset !== text.length) {
          return
        }
        atEnd = true
      }
      if (ectx.$mediaEx.tryAlignMedia(ctx, text, atEnd)) {
        return ctx.preventAndSkipDefault(ev)
      }
    },
  },
  afterInputSolver: {
    insertText: (ev, ctx) => {
      if (!ev.data || ev.data.length > 1
        || (ev.data.charCodeAt(0) !== 41 /** ) */ && ev.data.charCodeAt(0) !== 65289 /** ） */)) {
        return
      }
      const tc = ctx.selection.getTargetCaret()
      if (!tc || !tc.isAtText()) {
        return
      }
      if (ctx.effectInvoker.invoke(tc.anchorEtElement, 'markMedia', ctx, tc)) {
        return ctx.preventAndSkipDefault(ev)
      }
    },
  },
  htmlEventSolver: {
    // 鼠标点击图片右上角拖拽调整大小; 配合css在鼠标hover时显示右上角“小方块”; 当float-right时为左上角
    mousedown: (ev, ctx) => {
      // 当且仅当鼠标左键按下时, 才允许调整大小
      if (ev.buttons !== 1 || !ctx.isUpdated() || !ctx.focusParagraph) {
        return
      }
      const etMedia = ev.target as IEtMediaElement
      if (!([MediaEnum.Image, MediaEnum.Audio, MediaEnum.Video] as string[]).includes(etMedia.localName)) {
        return
      }
      ev.preventDefault()
      const isRight = etMedia.getAttribute(MediaEnum.State) === MediaState.FloatRight
      const mediaEl = etMedia.children[0] as HTMLElement
      if (!mediaEl) {
        return
      }
      const pWidth = ctx.focusParagraph.offsetWidth
      document.onmousemove = (e) => {
        if (e.buttons !== 1) {
          document.onmousemove = null
          document.onmouseup = null
        }
        let newW = e.offsetX
        if (isRight) {
          newW = pWidth - e.offsetX
        }
        if (newW < pWidth * 0.32 || newW > pWidth) {
          return
        }
        mediaEl.style.width = newW + 'px'
      }
      document.onmouseup = () => {
        document.onmousemove = null
        document.onmouseup = null
      }
    },
    mouseup: () => {
      document.onmousemove = null
    },
  },
  pasteCallback: (ev, ctx, ectx) => {
    const tc = ctx.selection.getTargetCaret()
    if (!tc || !ev.clipboardData.files.length) {
      return
    }
    const handler = ctx.getEtHandler(tc.anchorEtElement)
    if (!handler.insertMediaChunk) {
      return
    }
    const mediaCtx = ctx.pctx.$mediaPx
    const fileGroup = {} as Record<MediaType, File[]>
    for (const file of ev.clipboardData.files) {
      const type = file.type.split('/')[0] as MediaType
      if (!type || !mediaCtx[type]) {
        continue
      }
      fileGroup[type] = fileGroup[type] || []
      fileGroup[type].push(file)
    }
    for (const type in fileGroup) {
      const media = mediaCtx[type as MediaType]
      const files = ectx.$mediaEx.filterFiles(media, fileGroup[type as MediaType])
      if (!media || !files.length) {
        continue
      }
      const opts = media.onfileselected?.(files)
      if (opts && opts.length) {
        handler.insertMediaChunk(ctx, {
          targetCaret: tc,
          type: type as MediaType,
          chunk: opts,
        })
      }
    }
  },
  onMounted(ctx) {
    const { dropdown, popup } = ctx.assists
    if (dropdown) {
      initMediaDropdown(dropdown, ctx)
    }
    if (popup) {
      initMediaPopup(popup)
    }
  },
}

const initMediaDropdown = (dropdown: Required<Et.EditorAssists>['dropdown'], ctx: Et.EditorContext) => {
  const onchosen = (type: MediaType) => {
    return (ctx: Et.EditorContext) => {
      return ctx.assists.dialog && showMediaUploadDialog(ctx.assists.dialog, ctx, type)
    }
  }
  const getItemOpts = (prefix: string): DropdownMenuItemOptions => {
    return {
      filter: {
        etType: MEDIA_ET_TYPE,
      },
      prefixes: ['media', prefix],
    }
  }
  // 判断是否有配置相应的媒体类型
  const { image, audio, video } = ctx.pctx.$mediaPx
  if (image) {
    dropdown.addBlockRichTextMenuItem(dropdown.createMenuItem(
      imageFileIcon(),
      onchosen(MediaType.Image),
      getItemOpts('image'),
    ))
  }
  if (audio) {
    dropdown.addBlockRichTextMenuItem(dropdown.createMenuItem(
      audioFileIcon(),
      onchosen(MediaType.Audio),
      getItemOpts('audio'),
    ))
  }
  if (video) {
    dropdown.addBlockRichTextMenuItem(dropdown.createMenuItem(
      videoFileIcon(),
      onchosen(MediaType.Video),
      getItemOpts('video'),
    ))
  }
}
/**
 * 显示媒体上传弹窗
 * @param ctx
 * @param type 媒体类型
 * @param signal
 */
const showMediaUploadDialog = (dialog: Required<Et.EditorAssists>['dialog'], ctx: Et.EditorContext, type: MediaType) => {
  dialog.open<FileList | null>(async (container, resolve) => {
    const dropArea = document.createElement('div')
    dropArea.className = 'et-media__upload-area'
    dropArea.setAttribute(HtmlAttrEnum.HintTitle, `拖拽${{ image: '图片', audio: '音频', video: '视频' }[type]}到此处上传`)

    const icon = uploadIcon(40)
    icon.style = 'position: absolute; left: 50%; top: 50%; translate: -50% -50%;'

    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.multiple = true
    fileInput.accept = { image: 'image/*', audio: 'audio/*', video: 'video/*' }[type]
    // hidden会导致无法通过enter激活, 需使用opacity: 0来隐藏
    // fileInput.style.visibility = 'hidden'
    fileInput.style.opacity = '0'
    fileInput.style.pointerEvents = 'none'

    dropArea.onclick = () => {
      fileInput.dispatchEvent(new MouseEvent('click'))
    }
    // 防止enter时, 触发一个click事件冒泡给dropArea 再次激活文件选择窗口
    fileInput.onclick = e => e.stopPropagation()
    fileInput.onchange = () => {
      resolve(fileInput.files)
    }

    dropArea.appendChild(fileInput)
    dropArea.appendChild(icon)
    container.appendChild(dropArea)
    // 延迟聚焦，避免因上一个焦点未完全移除，而被浏览器拒绝焦点转移
    setTimeout(() => {
      fileInput.focus()
    }, 0)
  }).then((files) => {
    ctx.editor.focus()
    const targetCaret = ctx.selection.getTargetCaret()
    if (!targetCaret) {
      return
    }
    const media = ctx.pctx.$mediaPx[type]
    if (!media || !media.onfileselected || !files || !files.length) {
      return
    }
    const chunk = media.onfileselected(_ectx.$mediaEx.filterFiles(media, [...files]))
    if (chunk.length) {
      ctx.effectInvoker.invoke(targetCaret.anchorEtElement, 'insertMediaChunk', ctx, {
        targetCaret,
        type,
        chunk,
      })
    }
  }).catch(() => {
    ctx.assists.msg?.info('取消上传')
  })
}
/**
 * 初始化媒体元素hover时popup内容
 * @param popup
 * @param ctx
 * @param signal
 */
const initMediaPopup = (popup: Required<Et.EditorAssists>['popup']) => {
  const popupItems = [
    popup.createPopupItem<IEtMediaElement>(
      fullScreenIcon(),
      '放大',
      (ctx, _, etMedia) => {
        const state = etMedia.getAttribute(MediaEnum.State)
        etMedia.setAttribute(MediaEnum.State, MediaState.Expanded)
        ctx.editor.blur()
        etMedia.onclick = () => {
          if (etMedia.getAttribute(MediaEnum.State) === MediaState.Expanded) {
            etMedia.setAttribute(MediaEnum.State, state ? state : MediaState.Center)
          }
          etMedia.onclick = null
          ctx.editor.focus()
        }
        const mediaEl = etMedia.children[0] as HTMLElement
        if (!mediaEl) {
          return
        }
        mediaEl.onclick = (e) => {
          e.stopPropagation()
        }
      },
    ),
    popup.createPopupItem<IEtMediaElement>(
      alignLeftIcon(),
      '左浮动',
      (_ctx, _, target) => {
        target.setAttribute(MediaEnum.State, MediaState.FloatLeft)
      },
    ),
    popup.createPopupItem<IEtMediaElement>(
      alignRightIcon(),
      '右浮动',
      (_ctx, _, target) => {
        target.setAttribute(MediaEnum.State, MediaState.FloatRight)
      },
    ),
    popup.createPopupItem<IEtMediaElement>(
      alignCenterIcon(),
      '居中',
      (_ctx, _, target) => {
        target.setAttribute(MediaEnum.State, MediaState.Center)
      },
    ),
    popup.createPopupItem<IEtMediaElement>(
      trashIcon(),
      '删除',
      (ctx, _, target) => {
        ctx.commonHandler.removeNodeAndMerge(target)
      },
    ),
  ]
  popup.addHoverPopup<IEtMediaElement>(MediaEnum.Popup_Key, null, {
    popupItems,
    beforeShow(ctx, targetEl, contentEl, items) {
      if (!items || !items.length) {
        return true
      }
      // collapsed和failed 不显示popup
      if ([MediaState.Collapsed, MediaState.Failed].includes(targetEl.mediaState)) {
        return true
      }
      // audio 不需expand
      if (targetEl.mediaType === MediaType.Audio) {
        items?.shift()
      }
      if (ctx.pctx.$mediaPx.popupOptions?.beforeShow?.(ctx, targetEl, contentEl, items)) {
        return true
      }
    },
  })
}
