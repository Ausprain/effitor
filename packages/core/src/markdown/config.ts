/* eslint-disable @stylistic/max-len */
import type * as mdast from 'mdast'
import type { Handlers } from 'mdast-util-to-markdown'

import type { EditorContext } from '../context'
import type { MdastHandleManager } from './fromMarkdown'
import type { CreateMdastNode } from './toMarkdown'

export type MdastNodes = mdast.Nodes
export type MdastNode<T extends mdast.Nodes['type']> = Extract<mdast.Nodes, { type: T }>

export type MdastHandlerReturnType = DocumentFragment | HTMLElement | Text | null
export interface MdastNodeHandler<N extends mdast.Nodes | mdast.Nodes['type']> {
  /**
   * 定义一个mdast节点如何转为html节点, 无需手动处理后代节点
   * * 返回一个html节点，并且当前mdast node有children属性，则会继续处理其后代节点; 并将处理得到的节点插入到html节点的childNodes中
   * * 返回一个DocumentFragment, 相当于返回html节点, 只是意味着当前mdast节点并无直接对应的html节点, 如 `list->listItem->paragraph`的层级, 若希望listItem并无实际对应节点但又需要其后代, 可对listItem节点的处理返回DocumentFragment
   * * 返回Text节点, 会作为直接插入到父节点对应位置中
   * * 返回null, 则跳过当前handler, 尝试用下一个handler处理, 若所有handler均返回null(或无对应handler), 则该mdast节点会被丢弃, 即相应markdown内容将从渲染结果中缺失
   */
  (node: N extends mdast.Nodes ? N : Extract<mdast.Nodes, { type: N }>, ctx: EditorContext, index: number, parent: mdast.Parents, manager: MdastHandleManager): MdastHandlerReturnType
}
/**
 * 定义mdast节点如何转为html节点，无需手动处理后代节点
 */
export type MdastNodeHandlerMap = {
  [k in mdast.Nodes['type']]?: MdastNodeHandler<k>
}
/**
 * 返回true跳过其他transformer
 */
export interface MdastNodeTransformer<N extends mdast.Nodes | mdast.Nodes['type']> {
  /**
   * 对一个mdast进行转换(原地修改), 当且仅当返回 true 时终止后续transformer的处理
   * @param node 当前mdast节点
   * @param ctx 编辑器上下文对象
   * @param index 当前node位于父节点的children的索引
   * @param parent node的父节点
   */
  (node: N extends mdast.Nodes ? N : Extract<mdast.Nodes, { type: N }>, ctx: EditorContext, index?: number, parent?: mdast.Parents): TrueOrVoid
}
export type MdastNodeTransformerMap = {
  [k in mdast.Nodes['type']]?: MdastNodeTransformer<k>
}
/**
 * 自定义mdast节点处理器
 */
export type ToMarkdownHandlerMap = {
  [k in keyof Handlers]?: Handlers[k]
}

export type ToMdastResult = mdast.Nodes | mdast.Nodes[] | null
export interface ToMdast {
  /** 返回当前html节点对应的mdast节点，返回null丢弃该节点 */
  toMdast(mdastNode: CreateMdastNode): ToMdastResult
}

export interface MdUrlMapping {
  /**
   * @param url 链接/图片等元素的url
   * @returns 转换为markdown文本的url
   */
  toMarkdown: (url: string) => string
  /**
   * @param url markdown文本中解析的url值
   * @returns 转换为链接/图片等元素的url
   */
  fromMarkdown: (url: string) => string
}
