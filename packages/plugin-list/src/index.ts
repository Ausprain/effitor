/**
 * 列表插件
 *
 * // TODO 需要重构，应使用 schema 段落作为 et-li 的唯一允许子节点，而非直接让 et-li 作为段落
 * 目前的结构是
 * ```html
 * <et-list>
 *   <et-li>aaa</et-li>
 *   <et-li>bbb</et-li>
 * </et-list>
 * ```
 * 这样的结构无法适配如下 markdown 内容
 * ```md
 * 1. aaa
 *
 *     aaa1
 *     aaa2
 * 2. bbb
 *     > bbb1
 *     > bbb2
 * 3. ccc
 * ```
 * 对应 mdast 结构为
 * ```
 * list ->
 *   listItem ->
 *     paragraph: aaa
 *     paragraph: aaa1 aaa2
 *   listItem ->
 *     paragraph: bbb
 *     blockquote ->
 *        paragraph: bbb1 bbb2
 *   listItem ->
 *     paragraph: ccc
 * ```
 */
import './augment'

import { type Et } from '@effitor/core'

import { listEffector } from './effector'
import { EtListElement, EtListItemElement } from './EtListElement'
import { inListHandler } from './handler/inListHandler'
import listCss from './index.css?raw'

export interface ListPluginOptions {}
export { EtListElement, EtListItemElement }
export const useListPlugin = (_options?: ListPluginOptions): Et.EditorPlugin => {
  return {
    name: '@effitor/plugin-list',
    cssText: listCss,
    effector: listEffector,
    elements: [EtListElement, EtListItemElement],
    register(_ctxMeta, setSchema, mountEtHandler) {
      setSchema({ list: EtListElement, listItem: EtListItemElement })
      mountEtHandler(EtListItemElement, inListHandler)
    },
  }
}
