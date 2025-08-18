/* eslint-disable @stylistic/max-len */
import type * as mdast from 'mdast'

import type { Et } from '~/core/@types'

import type { MdastHandler, MdastHandlersMap } from './config'

const enum ManagerStatus {
  NONE = 1,
  SKIP_HANDLERS = 2,
  SKIP_SIBLINGS = 4,
  SKIP_CHILDREN = 8,
  // SKIP_THE_REST = 16,
  REVISIT_CURRENT_INDEX = 32,
}
/**
 * 节点处理管理者
 */
const handleManager = (() => {
  let status = ManagerStatus.NONE
  return {
    /** 跳过其他handler */
    skipHandlers: () => (status |= ManagerStatus.SKIP_HANDLERS, handleManager),
    /** 跳过当前children的剩下节点 */
    skipSiblings: () => (status |= ManagerStatus.SKIP_SIBLINGS, handleManager),
    /** 跳过当前节点的children */
    skipChildren: () => (status |= ManagerStatus.SKIP_CHILDREN, handleManager),
    /** 结束visit 相当于 skipSiblings & skipChildren */
    skipTheRest: () => (status |= ManagerStatus.SKIP_SIBLINGS & ManagerStatus.SKIP_CHILDREN, handleManager),
    /** 重新从当前index开始handle（即重新处理当前index所指节点，可能是原来的节点，也可能是新的节点（在handle中更改了parent.children） */
    revisitCurrentIndex: () => (status |= ManagerStatus.REVISIT_CURRENT_INDEX, handleManager),
    reset: (decount?: ManagerStatus) => (status = decount ? (decount & status ? status - decount : status) : ManagerStatus.NONE, handleManager),

    /**
         * 使用目标数组内的节点 替换当前节点（或从当前索引开始的多个节点，通过deleteCount指定数量），
         * 该方法会调用一次 `revisitIndex` 以重新访问当前索引的节点,
         */
    replaceCurrentNode(index: number, parent: mdast.Parents, newNodes: mdast.Nodes[], deleteCount = 1) {
      parent.children.splice(index, deleteCount, ...newNodes as mdast.RootContent[])
      this.revisitCurrentIndex()
      // import.meta.env.DEV && !this.currentRevisited && console.warn('MdastNodeHandler: 替换了当前节点, 但未重新访问当前索引. ')
    },

    newNode: <T extends mdast.Nodes['type']>(
      options: Extract<mdast.Nodes, { type: T }>,
    ): Extract<mdast.Nodes, { type: T }> => options,

    get handlerSkipped() {
      return status & ManagerStatus.SKIP_HANDLERS
    },
    get siblingsSkipped() {
      return status & ManagerStatus.SKIP_SIBLINGS
    },
    get childrenSkipped() {
      return status & ManagerStatus.SKIP_CHILDREN
    },
    get currentRevisited() {
      return status & ManagerStatus.REVISIT_CURRENT_INDEX
    },
  }
})()
// 对外导出 排除以ed结尾的方法
type AttrWithEd<K> = K extends `${string}ed` ? K : never
type __MdastHandleManager = typeof handleManager
export type MdastHandleManager = Omit<__MdastHandleManager, AttrWithEd<keyof __MdastHandleManager>>

export const handleMdastRoot = (ctx: Et.EditorContext, root: mdast.Root, handlersMap: MdastHandlersMap, df = document.createDocumentFragment() as Et.Fragment) => (handleMdastChildren(ctx, root, df, handlersMap), df)
const isMdastParentNode = (node: mdast.Nodes): node is mdast.Parents => Array.isArray((node as mdast.Parents).children)
const handleMdastNode = <T extends mdast.Nodes>(ctx: Et.EditorContext, node: T, parent: mdast.Parents, index: number, handlersMap: MdastHandlersMap): ReturnType<MdastHandler> => {
  const hs = handlersMap[node.type]
  if (!hs) {
    if (node.type === 'text') {
      return document.createTextNode(node.value)
    }
    if (node.type === 'break') {
      return document.createElement('br')
    }
    return null
  }
  for (const h of hs) {
    const out = h(node, ctx, index, parent, handleManager)
    if (handleManager.handlerSkipped) {
      handleManager.reset(ManagerStatus.SKIP_HANDLERS)
      return out
    }
    if (!out) continue
    if (handleManager.childrenSkipped) {
      handleManager.reset(ManagerStatus.SKIP_CHILDREN)
      return out
    }
    // 若返回htmlElement或documentFragment, 则继续解析mdast子节点, 并插入到该父节点中
    if ((out.nodeType === Node.ELEMENT_NODE || out.nodeType === Node.DOCUMENT_FRAGMENT_NODE) && isMdastParentNode(node)) {
      handleMdastChildren(ctx, node, out as ParentNode, handlersMap)
    }
    else {
      handleManager.reset()
    }
    return out
  }

  return null
}
const handleMdastChildren = (ctx: Et.EditorContext, parent: mdast.Parents, htmlparent: ParentNode, handlersMap: MdastHandlersMap) => {
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i]
    const out = handleMdastNode(ctx, child, parent, i, handlersMap)
    if (out) {
      htmlparent.appendChild(out)
    }
    if (handleManager.currentRevisited) {
      i--
      handleManager.reset(ManagerStatus.REVISIT_CURRENT_INDEX)
      continue
    }
    if (handleManager.siblingsSkipped) {
      handleManager.reset(ManagerStatus.SKIP_SIBLINGS)
      return
    }
  }
}
