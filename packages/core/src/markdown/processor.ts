import type { Options as FmOptions } from 'mdast-util-from-markdown'
import type { Options as TmOptions } from 'mdast-util-to-markdown'
import { visit } from 'unist-util-visit'

import type { Et } from '~/core/@types'

import { fragmentUtils } from '../handler'
import type {
  MdastHandlersMap,
  MdastNodeHandlerMap,
  MdastNodeTransformerMap,
  MdastTransformersMap,
  ToMarkdownHandlerMap,
} from './config'
import { handleMdastRoot } from './fromMarkdown'
import { mdParser } from './parser'
import { buildMdastRoot, mdastNode } from './toMarkdown'

export interface GetMdPorcesserOptions {
  /** mdast处理器列表，直接将mdast节点转为html节点 */
  fromMdHandlerMapList: MdastNodeHandlerMap[]
  /** mdast节点转换器列表，转换器会在toMarkdown的最后阶段（序列化为字符串前）执行，对mdast树进行修改 */
  toMdTransformerMapList: MdastNodeTransformerMap[]
  /** 用于自定义的mdast节点 的处理器 */
  toMdHandlerMap: ToMarkdownHandlerMap
}
export type MdProcessor = ReturnType<typeof getMdProcessor>
export const getMdProcessor = ({
  fromMdHandlerMapList,
  toMdTransformerMapList,
  toMdHandlerMap = {},
}: GetMdPorcesserOptions) => {
  const fromMdHandlersMap: MdastHandlersMap = {}
  const toMdTransformersMap: MdastTransformersMap = {}
  for (const map of fromMdHandlerMapList) {
    for (const [k, v] of Object.entries(map)) {
      // fromMdHandlersMap[k] = fromMdHandlersMap[k] ?? []
      // fromMdHandlersMap[k].push(v)
      if (Reflect.get(fromMdHandlersMap, k)) {
        Reflect.get(fromMdHandlersMap, k).push(v)
      }
      else {
        Reflect.set(fromMdHandlersMap, k, [v])
      }
    }
  }
  for (const map of toMdTransformerMapList) {
    for (const [k, v] of Object.entries(map)) {
      // toMdTransformersMap[k] = toMdTransformersMap[k] ?? []
      // toMdTransformersMap[k].push(v)
      if (Reflect.get(toMdTransformersMap, k)) {
        Reflect.get(toMdTransformersMap, k).push(v)
      }
      else {
        Reflect.set(toMdTransformersMap, k, [v])
      }
    }
  }

  return {
    /**
     * 将el下的所有etelement转为markdown，过滤非etelement，没有etelement则返回空文本
     */
    toMarkdown(ctx: Et.EditorContext, el: Et.EtElement, options?: TmOptions) {
      let root = el.toMdast(mdastNode)
      if (!root) return ''
      if (Array.isArray(root) || root.type !== 'root') {
        root = buildMdastRoot(root)
      }
      visit(root, (node, index, parent) => {
        const trs = toMdTransformersMap[node.type]
        if (!trs) return
        for (const tr of trs) {
          if (tr(node, ctx, index, parent)) break
        }
      })
      if (import.meta.env.DEV) {
        console.error('to md root: ', root)
      }
      const handlers = { ...toMdHandlerMap, ...options?.handlers }
      return mdParser.toMarkdown(root, { ...options, handlers })
    },
    /** 将markdown文本转为编辑器内容(EtElement)的fragment */
    fromMarkdown(ctx: Et.EditorContext, mdText: string, options?: FmOptions) {
      const root = mdParser.fromMarkdown(mdText, options)
      if (import.meta.env.DEV) {
        console.error('fm md root: ', root)
      }
      const df = handleMdastRoot(ctx, root, fromMdHandlersMap)
      fragmentUtils.normalizeEtFragment(fragmentUtils.normalizeToEtFragment(df, ctx))
      return df
    },

    /* -------------------------------------------------------------------------- */
    /*                                just for dev                                */
    /* -------------------------------------------------------------------------- */
    /** 一个仅用于开发的方法, 解析一个EtElement, 返回mdast节点树 */
    __toMarkdownMdastTree(ctx: Et.EditorContext, el: Et.EtElement) {
      let root = el.toMdast(mdastNode)
      if (!root) return
      if (Array.isArray(root) || root.type !== 'root') {
        root = buildMdastRoot(root)
      }
      visit(root, (node, index, parent) => {
        const trs = toMdTransformersMap[node.type]
        if (!trs) return
        for (const tr of trs) {
          if (tr(node, ctx, index, parent)) break
        }
      })
      return root
    },
    /** 一个仅用于开发的方法, 解析一个md文本, 返回mdast节点树 */
    __fromMarkdownMdastTree: (_ctx: Et.EditorContext, mdText: string, options?: FmOptions) => {
      const root = mdParser.fromMarkdown(mdText, options)
      return root
    },
  }
}
