import { minifiedHtml } from '../../../__tests__/shared.test'
import type { Et } from '../../../@types'
import { dom, traversal } from '../../../utils'

export const initContentsAndSetSelection = (ctx: Et.EditorContext, html: string) => {
  ctx.commandManager.commitAll()
  const { df, range } = getHtmlFragmentAndRange(html)
  ctx.bodyEl.textContent = ''
  ctx.bodyEl.appendChild(df!)
  ctx.selection.selectRange(range)
  ctx.forceUpdate()
  return handleWither(ctx)
}
const handleWither = (ctx: Et.EditorContext) => {
  return {
    /**
     * 执行回调函数 (在回调函数中处理操作, 添加命令)
     */
    handleWith: (fn: () => void) => {
      fn()
      return handler(ctx)
    },
  }
}
const handler = (ctx: Et.EditorContext) => {
  return {
    /**
     * handle 命令, 然后执行回调函数 fn
     */
    handle: (fn?: () => void) => {
      function removeAttrs() {
        traversal.traverseNode(ctx.bodyEl, null, {
          whatToShow: 1,
          filter(node) {
            node.getAttributeNames().forEach((name) => {
              node.removeAttribute(name)
            })
            return 3
          },
        })
      }
      function revealSelection() {
        const range = ctx.selection.range as unknown as Range
        if (!range) {
          throw Error('命令执行后光标选区丢失')
        }
        if (range.collapsed) {
          range.insertNode(new Text('|'))
        }
        else {
          const startNode = range.startContainer
          if (dom.isText(startNode)) {
            startNode.insertData(range.startOffset, '^')
          }
          else {
            startNode.insertBefore(new Text('^'), startNode.childNodes.item(range.startOffset))
          }
          const endNode = range.endContainer
          let endOffset = range.endOffset
          if (endNode === startNode) endOffset++
          if (dom.isText(endNode)) {
            endNode.insertData(endOffset, '|')
          }
          else {
            endNode.insertBefore(new Text('|'), endNode.childNodes.item(endOffset))
          }
        }
      }
      ctx.commandManager.startTransaction()
      // const hasCmds = ctx.commandManager.hasQueuedCmds
      // const success = ctx.commandManager.handleAndUpdate()
      ctx.commandManager.handleAndUpdate()

      fn?.()

      return {
        /**
         * 使用`^|`表示光标位置, 移除所有元素属性, 然后执行回调函数
         */
        reveal: (fn: (result: {
          /** 是否 handle 成功 */
          // success: boolean
          /** 命令执行后, 文档树的 html 字符串 (带^|光标位置) */
          bodyHtmlWithCaret: string
        }) => void) => {
          revealSelection()
          removeAttrs()
          fn({
            // success,
            bodyHtmlWithCaret: ctx.bodyEl.innerHTML,
          })
        },
        /**
         * 撤销命令, 移除所有元素属性, 然后执行回调函数
         */
        restore: (fn: (result: {
          /** 是否撤销成功 */
          // success: boolean
          /** 命令执行前, 文档树的 html 字符串 (带^|光标位置) */
          bodyOriginalHtml: string
        }) => void) => {
          // const success = !hasCmds || ctx.commandManager.discard()
          ctx.commandManager.discard()
          revealSelection()
          removeAttrs()
          fn({
            // success,
            bodyOriginalHtml: ctx.bodyEl.innerHTML,
          })
        },
      }
    },
  }
}

/**
 * 从文档树的 html 字符串中提取文档树片段, 并返回其中(^|)标识的选区范围
 * @param html 文档树的 html 字符串 (带^|光标位置)
 * @returns 文档树的 html 字符串 (不带^|光标位置), 光标选区
 */
export const getHtmlFragmentAndRange = (html: string) => {
  const df = [document.createElement('div')].map((div) => {
    div.innerHTML = minifiedHtml(html)
    const text = div.textContent
    if (text.split('|').length !== 2) {
      throw Error('请使用`|`设置一个光标或选区结束位置, 必须有且只有 1 个')
    }
    if (text.split('^').length > 2) {
      throw Error('使用`^`设置选区起始位置, 必须 <= 1 个')
    }
    const range = document.createRange()
    range.selectNodeContents(div)
    return range.extractContents()
  })[0]

  let setStarted = false
  const range = document.createRange()
  const removeNodes = [] as ChildNode[]
  traversal.traverseNode(df!, (node) => {
    let idx = node.data.indexOf('^')
    if (idx >= 0) {
      setStarted = true
      if (node.length === 1) {
        range.setStartBefore(node)
        // 延迟删除节点, 避免影响遍历
        removeNodes.push(node)
      }
      else {
        node.deleteData(idx, 1)
        range.setStart(node, idx)
      }
    }
    idx = node.data.indexOf('|')
    if (idx >= 0) {
      if (node.length === 1) {
        range.setEndBefore(node)
        removeNodes.push(node)
      }
      else {
        node.deleteData(idx, 1)
        range.setEnd(node, idx)
      }
      return true
    }
    return false
  }, {
    whatToShow: 4,
  })
  if (!setStarted) {
    range.collapse(false)
  }
  removeNodes.forEach(nod => nod.remove())
  return {
    df,
    range,
  }
}
