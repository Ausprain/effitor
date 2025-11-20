/**
 * 鼠标事件, 主要处理拖拽行为
 */

import type { Et } from '../@types'
import { effectorContext } from './ectx'

/* -------------------------------------------------------------------------- */
/*                                    mouse                                    */
/* -------------------------------------------------------------------------- */

export const getMouseDownListener = (ctx: Et.EditorContext, cb?: Et.MouseEventAction) => {
  return (ev: MouseEvent) => {
    cb?.(ev, ctx, effectorContext)
    if (ctx.defaultSkipped) return
    return ev.stopPropagation()
  }
}
export const getMouseUpListener = (ctx: Et.EditorContext, cb?: Et.MouseEventAction) => {
  // 若触发了拖拽, 则不会再触发mouseup
  return (ev: MouseEvent) => {
    cb?.(ev, ctx, effectorContext)
    if (ctx.defaultSkipped) return
    return ev.stopPropagation()
  }
}
export const getClickListener = (ctx: Et.EditorContext, cb?: Et.MouseEventAction) => {
  return (ev: MouseEvent) => {
    cb?.(ev, ctx, effectorContext)
    if (ctx.defaultSkipped) return
    return ev.stopPropagation()
  }
}
export const getDblClickListener = (ctx: Et.EditorContext, cb?: Et.MouseEventAction) => {
  return (ev: MouseEvent) => {
    cb?.(ev, ctx, effectorContext)
    if (ctx.defaultSkipped) return
    return ev.stopPropagation()
  }
}

/* -------------------------------------------------------------------------- */
/*                                drag & drop                                 */
/* -------------------------------------------------------------------------- */

export const getDragStartListener = (ctx: Et.EditorContext, cb?: Et.DragEventAction) => {
  // 拖拽文本选区时由selectionchange更新ctx, 拖拽元素节点时, 无需更新ctx
  return (ev: DragEvent) => {
    cb?.(ev, ctx, effectorContext)
    if (ctx.defaultSkipped) return
    // shadow dom 内无法获取拖拽插入位置, 因此当编辑器使用 shadow dom 时, 禁止文本拖拽行为
    if (ctx.editor.isShadow) {
      ev.preventDefault()
    }
    // TODO 拦截文本拖拽, 使用命令删除和插入, 并实现 insertFromDrop 的 beforeinput效应
    return ev.preventDefault()
  }
}

// export const getDragListener = (ctx: Et.EditorContext) => {
//   return (ev: DragEvent) => {
//   }
// }

export const getDragEndListener = (ctx: Et.EditorContext, cb?: Et.DragEventAction) => {
  return (ev: DragEvent) => {
    cb?.(ev, ctx, effectorContext)
    if (ctx.defaultSkipped) return
  }
}

export const getDragEnterListener = (ctx: Et.EditorContext, cb?: Et.DragEventAction) => {
  return (ev: DragEvent) => {
    cb?.(ev, ctx, effectorContext)
    if (ctx.defaultSkipped) return
    ev.preventDefault()
  }
}

export const getDragOverListener = (ctx: Et.EditorContext, cb?: Et.DragEventAction) => {
  return (ev: DragEvent) => {
    cb?.(ev, ctx, effectorContext)
    if (ctx.defaultSkipped) return
    if (ev.dataTransfer) {
      ev.dataTransfer.dropEffect = 'none'
    }
    ev.preventDefault()
  }
}

export const getDragLeaveListener = (ctx: Et.EditorContext, cb?: Et.DragEventAction) => {
  return (ev: DragEvent) => {
    cb?.(ev, ctx, effectorContext)
    if (ctx.defaultSkipped) return
  }
}

export const getDropListener = (ctx: Et.EditorContext, cb?: Et.DragEventAction) => {
  return (ev: DragEvent) => {
    cb?.(ev, ctx, effectorContext)
    if (ctx.defaultSkipped) return
    ev.preventDefault()
  }
}
