/**
 * 表格插件;
 *
 * 为支持 markdown 互转, 咱不考虑实现单元格合并等高级表格功能
 *
 * 有两种方案
 * 1. 组件， 即嵌套可编辑，选区无法跨越表格效应元素边界进行选择；要么仅选择内部，要么整个选择
 * 2. 段落, 允许选区跨越表格效应元素边界进行选择, 删除时, 依赖 DeleteContentsSpanningStart 和 DeleteContentsSpanningEnd 效应
 *
 * 目标：
 * 1. 实现完全键盘操作
 * 2. 数据关联(简单公式)
 *
 */

import type { Et } from '@effitor/core'

import { tableEffector, tabToTableEffector } from './effector'
import { EtTableCellElement } from './EtTableCellElement'
import { EtTableElement } from './EtTableElement'
import { EtTableRowElement } from './EtTableRowElement'
import { inTableCellHandler, inTableRowHandler, tableHandler } from './handler'
import cssText from './index.css?raw'

const defaultOptions: TablePluginOptions = {
  tabToTableAfterShortText: true,
}
export interface TablePluginOptions {
  /**
   * 是否以 OneNote 风格插入表格: 在有效文本小于 20 字符的普通段落末尾按下 Tab,
   * 会将当前段落转换为表格单元格; 默认为 true
   */
  tabToTableAfterShortText?: boolean
}
export { EtTableCellElement, EtTableElement, EtTableRowElement }
export const useTablePlugin = (options?: TablePluginOptions): Et.EditorPlugin => {
  options = { ...defaultOptions, ...options }
  return {
    name: '@effitor/plugin-table',
    cssText,
    effector: options.tabToTableAfterShortText
      ? [tableEffector, tabToTableEffector]
      : tableEffector,
    elements: [EtTableElement, EtTableRowElement, EtTableCellElement],
    register(ctxMeta, setSchema, mountEtHandler) {
      setSchema({
        table: EtTableElement,
        tableRow: EtTableRowElement,
        tableCell: EtTableCellElement,
      })
      mountEtHandler(ctxMeta.schema.paragraph, tableHandler)
      mountEtHandler(ctxMeta.schema.tableRow, inTableRowHandler)
      mountEtHandler(ctxMeta.schema.tableCell, inTableCellHandler)
    },
  }
}
