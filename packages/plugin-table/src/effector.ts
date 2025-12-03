import type { DropdownContent } from '@effitor/assist-dropdown'
import { dom, type Et } from '@effitor/core'
import {
  colDeleteRightIcon,
  colInsertLeftIcon,
  colInsertRightIcon,
  HtmlCharEnum,
  rowDeleteBottomIcon,
  rowInsertBottomIcon,
  rowInsertTopIcon,
  tableIcon,
} from '@effitor/shared'

import { TableName } from './config'
import { tableActions, tableCellKeyMap } from './ectx'

const beforeKeydownSolver: Et.KeyboardSolver = {
  [TableName.TableCell]: (ev, ctx) => {
    ctx.commandManager.checkKeydownNeedCommit(ev, ctx)
    if (ctx.hotkeyManager.listenEffect(tableCellKeyMap) === false) {
      return
    }
    return ctx.preventAndSkipDefault(ev)
  },
}

export const tableEffector: Et.Effector = {
  beforeKeydownSolver,
  htmlEventSolver: {
    // 提前让选区 collapse, 防止 core 中 compositionstart 的选区删除行为将单元格删除
    // 为什么要在这里处理, 而不是在 handler 中判断 payload.targetRange?
    // 因为 Safari 在这个阶段就执行其输入法输入, 并删除选区行为
    // 此外, payload.targetRange 可能非 collapse, 取决于输入法会话期间的最后一次更新上下文时机
    // 该时机可能在输入法会话开始时, 也可能在输入法输入第一个字符后, 这个上一次动作有关
    compositionstart: (_ev, ctx) => {
      if (ctx.commonEtElement?.localName === TableName.TableRow && !ctx.selection.isCollapsed) {
        ctx.selection.collapse(true)
        ctx.forceUpdate()
      }
    },
  },
  onMounted(ctx) {
    ctx.actions.table = tableActions
    initTableDropdown(ctx)
  },
}

/**
 * OneNote 风格插入表格
 */
export const tabToTableEffector: Et.Effector = {
  keydownSolver: {
    Tab: (ev, ctx) => {
      if (!ctx.selection.isCollapsed || !ctx.isPlainParagraph(ctx.focusParagraph)
        || !ctx.selection.anchorText || ctx.focusParagraph.childElementCount > 0
      ) {
        return
      }
      const data = ctx.focusParagraph.textContent
      if (data.length > 20 || data.includes('\t') || data.replaceAll(HtmlCharEnum.ZERO_WIDTH_SPACE, '') === ''
        || (data.length !== ctx.selection.anchorOffset && !dom.isTrailingZWS(data, ctx.selection.anchorOffset))
      ) {
        return
      }
      ctx.effectInvoker.invoke(ctx.focusParagraph, 'replaceParagraphWithTable', ctx, {
        data,
        paragraph: ctx.focusParagraph,
      })
      return ctx.preventAndSkipDefault(ev)
    },
  },
}

const initTableDropdown = (ctx: Et.EditorContext) => {
  const dropdown = ctx.assists.dropdown
  if (!dropdown) {
    return
  }
  dropdown.addBlockRichTextMenuItem(dropdown.createMenuItem(
    tableIcon(),
    tableActions.markTable,
  ))

  dropdown.register({
    [TableName.TableCell]: createTableDropdownContent(),
  })

  function createTableDropdownContent(): DropdownContent {
    const el = document.createElement('div')
    const insertItems = ([
      [rowInsertTopIcon(), tableActions.insertNewRowTop],
      [rowInsertBottomIcon(), tableActions.insertNewRowBottom],
      [colInsertLeftIcon(), tableActions.insertNewColumnLeft],
      [colInsertRightIcon(), tableActions.insertNewColumnRight],
    ] as [SVGElement, (ctx: Et.EditorContext) => void][]).map(
      ([icon, onchosen]) => dropdown.createMenuItem(icon, onchosen),
    )
    const deleteItems = ([
      [rowDeleteBottomIcon(), tableActions.tryToRemoveNextRow],
      [colDeleteRightIcon(), tableActions.tryToRemoveNextColumn],
    ] as [SVGElement, (ctx: Et.EditorContext) => void][]).map(
      ([icon, onchosen]) => dropdown.createMenuItem(icon, onchosen),
    )

    const insertMenu = dropdown.createMenu('insertion', {
      items: insertItems,
    })
    const deleteMenu = dropdown.createMenu('deletion', {
      items: deleteItems,
    })
    // FIXME 目前这里的加粗只能临时展示, 不能持久化; 需待 mark 插件将 formatBold 接口提供出来;
    // 然后在此处为对应单元格激活加粗效应, 方可实现markdown 互转
    // 交给互转逻辑额外处理
    const boldFirstRowMenu = dropdown.createMenu('bold first row', {
      defaultStyle: true,
      onchosen(ctx) {
        const table = ctx.focusParagraph?.parentNode
        // if (!ctx.schema.table.is(table)) {
        //   return
        // }
        // const caretRange = ctx.selection.getCaretRange()
        // ctx.body.dispatchInputEvent('beforeinput', {
        //   inputType: 'formatBold',
        //   targetRanges: [new StaticRange({
        //     startContainer: table,
        //     startOffset: 0,
        //     endContainer: table,
        //     endOffset: 1,
        //   })],
        // })
        // ctx.setSelection(caretRange)
        if (ctx.schema.table.is(table)) {
          const f = table.tableHead
          if (f.includes('r')) {
            table.tableHead = f.replace('r', '')
          }
          else {
            table.tableHead = 'r' + f
          }
        }
        this.close()
      },
    })
    // FIXME 同上
    const boldFirstColumnMenu = dropdown.createMenu('bold first column', {
      defaultStyle: true,
      onchosen(ctx) {
        const table = ctx.focusParagraph?.parentNode
        if (ctx.schema.table.is(table)) {
          const f = table.tableHead
          if (f.includes('c')) {
            table.tableHead = f.replace('c', '')
          }
          else {
            table.tableHead += 'c'
          }
        }
        this.close()
      },
    })
    const menus = [insertMenu, deleteMenu, boldFirstRowMenu, boldFirstColumnMenu]

    menus.forEach(menu => el.appendChild(menu.el))

    return dropdown.createContent(el, menus, {
      // TODO 不可在 dropdown 打开期间执行命令并 commit, 必须先关闭 dropdown 再执行命令/commit
      // 因为 dropdown 是插入到文档中的, 有副作用, 执行其他命令前必须撤回 dropdown 带来的副作用
      // 这里希望在打开 dropdown 时可以点击多次 item, 连续插入多个行/列, 得通过 popup 来实现
      // popup 节点在编辑区外, 悬浮在编辑区上, 对文档内容无副作用
      // onEnter() {
      //   this.currentMenuOrItem()?.onchosen?.call(this, ctx)
      //   return
      // },
      onopen(etel) {
        const table = etel.parentNode?.parentNode
        if (!ctx.schema.table.is(table)) {
          return true
        }
        const f = table.tableHead
        const t1 = boldFirstRowMenu.el.firstChild
        if (t1?.nodeType === 3) {
          t1.textContent = f.includes('r') ? 'unbold first row' : 'bold first row'
        }
        const t2 = boldFirstColumnMenu.el.firstChild
        if (t2?.nodeType === 3) {
          t2.textContent = f.includes('c') ? 'unbold first column' : 'bold first column'
        }
      },
    })
  }
}
