import type * as mdast from 'mdast'

import { dom } from '../utils'

type MdastNode<T extends mdast.Nodes['type']> = Extract<mdast.Nodes, { type: T }>
type MdastNodeWithChildren<T extends mdast.Nodes['type']> = Omit<MdastNode<T>, 'children'> & { children: mdast.Nodes[] }

/**
 * 一个工具函数，使用ts类型辅助构建mdast节点\
 * FIXME: 这里强制了 children 的类型为 mdast.Nodes[]
 */
export function mdastNode<T extends mdast.Nodes['type']>(
  options: T extends mdast.Parents['type'] ? MdastNodeWithChildren<T> : MdastNode<T>
): MdastNode<T>
/**
 * 将html节点转为mdast节点, 并将childNodes转为其children (若子节点是效应元素, 则会递归调用子节点的toMdast方法)
 * ```
 *  mdastNode('paragraph', HTMLElement.childNodes, {})
 * ```
 * @param options 指定type的mdast节点的其他参数
 */
export function mdastNode<T extends mdast.Parents['type']>(
  type: T,
  childNodes: ChildNode[] | NodeListOf<ChildNode>,
  options: Omit<MdastNode<T>, 'type' | 'children' | 'position'>,
): MdastNode<T>

export function mdastNode<T extends mdast.Nodes['type']>(typeOrOptions: T | MdastNode<T>, childNodes?: ChildNode[] | NodeListOf<ChildNode>, options?: Omit<MdastNode<T>, 'type' | 'children' | 'position'>) {
  return typeof typeOrOptions === 'object'
    ? typeOrOptions
    : {
        type: typeOrOptions,
        ...options,
        children: htmlChildNodes2Mdast(childNodes ?? [], typeOrOptions),
      }
}
export type CreateMdastNode = typeof mdastNode

const htmlBrToMdast = (): mdast.Break => ({ type: 'break' })
const htmlTextToMdast = (text: Text): mdast.Text => ({ type: 'text', value: text.data })

/**
 * 将html节点的childNodes转为mdast节点数组，自动过滤段落节点的尾<br>（一个或多个连续）
 */
export const htmlChildNodes2Mdast = (childNodes: ChildNode[] | NodeListOf<ChildNode>, pType: mdast.Nodes['type']): mdast.Nodes[] => {
  const children: mdast.Nodes[] = []
  let i = -1, lastBrIndex = -1
  for (const child of childNodes) {
    i++
    if (dom.isEtElement(child)) {
      const out = child.toMdast(mdastNode)
      if (!out) continue
      if (Array.isArray(out)) {
        children.push(...out)
      }
      else {
        children.push(out)
      }
    }
    else if (child.nodeName === 'BR') {
      children.push(htmlBrToMdast())
      if (!~lastBrIndex || lastBrIndex !== i - 1) {
        lastBrIndex = i
      }
    }
    else if (dom.isText(child)) {
      children.push(htmlTextToMdast(child))
    }
    else {
      // todo remove start 被忽略的节点
      if (import.meta.env.DEV) {
        console.error('htmlChildNodes2Mdast neglect node:', child)
      }
      // todo remove end
    }
  }
  if (lastBrIndex >= 0 && pType === 'paragraph') {
    children.splice(lastBrIndex, children.length - lastBrIndex)
  }
  return children
}

export const buildMdastRoot = (ast: mdast.Nodes | mdast.Nodes[]) => {
  return {
    type: 'root',
    children: Array.isArray(ast) ? ast : [ast],
  } as mdast.Root
}
