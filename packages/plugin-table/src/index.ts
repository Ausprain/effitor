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
 * * 完全键盘操作
 *    enter: 插入行
 *    tab: 仅有一行且在行末时, 插入列; 否则, 移动到下一列
 *    cmd + →: 在行末时向右插入列; 在单元格末时, 移动到下一个单元格; 否则移动到单元格末尾
 *    cmd + ←: 与上述相反
 *    cmd + c: 选区复制, 光标居中
 *    cmd + l, cmd + r: 左对齐, 右对齐; 光标单元格, 选区多个单元格
 *    cmd+alt + ↑, cmd+alt + ↓: 向上/下移动行
 *    cmd+alt + →, cmd+alt + ←: 向左/右移动列
 */

import type { Et } from '@effitor/core'

import { tableEffector, tabToTableEffector } from './effector'
import { EtTableCellElement } from './EtTableCellElement'
import { EtTableElement } from './EtTableElement'
import { EtTableRowElement } from './EtTableRowElement'
import { inTableCellHandler, inTableRowHandler, tableHandler } from './handler'
import cssText from './index.css?raw'

export interface TableOptions {
  /**
   * 是否以 OneNote 风格插入表格: 在有效文本小于 20 字符的普通段落末尾按下 Tab,
   * 会将当前段落转换为表格单元格; 默认为 true
   */
  tabToTableAfterShortText?: boolean
}

const defaultOptions: TableOptions = {
  tabToTableAfterShortText: true,
}

export const useTablePlugin = (options?: TableOptions): Et.EditorPluginSupportInline => {
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
      mountEtHandler(ctxMeta.schema.paragraph, tableHandler, [EtTableElement])
      mountEtHandler(ctxMeta.schema.tableRow, inTableRowHandler, [])
      mountEtHandler(ctxMeta.schema.tableCell, inTableCellHandler, [])
    },
  }
}
