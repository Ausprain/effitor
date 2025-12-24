/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @stylistic/max-len */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { NodeHasParent } from '@effitor/shared'

import type { Et } from '../../@types'
import { cr } from '../../selection'
import { SpanRange } from '../../selection/SpanRange'

// TODO: 此 const enum 仅作本模块内静态替换; 下面的 CmdType 常量对外导出;
// 构建生产打包时, 通过 swc 插件对所有 CmdType.XXX 的显式调用进行"静态"替换
const enum CmdTypeEm {
  Insert_Composition_Text = 0b0000000001, // 1 << 0
  Insert_Text = 0b0000000010, // 1 << 1
  Delete_Text = 0b0000000100, // 1 << 2
  Replace_Text = 0b0000001000, // 1 << 3
  Insert_Node = 0b0000010000, // 1 << 4
  Remove_Node = 0b0000100000, // 1 << 5
  Replace_Node = 0b0001000000, // 1 << 6
  Insert_Content = 0b0010000000, // 1 << 7
  Remove_Content = 0b0100000000, // 1 << 8
  Functional = 0b1000000000, // 1 << 9
}
/**
 * 命令类型;
 */
const CmdType = {
  Insert_Composition_Text: 0b0000000001, // 1 << 0
  Insert_Text: 0b0000000010, // 1 << 1
  Delete_Text: 0b0000000100, // 1 << 2
  Replace_Text: 0b0000001000, // 1 << 3
  Insert_Node: 0b0000010000, // 1 << 4
  Remove_Node: 0b0000100000, // 1 << 5
  Replace_Node: 0b0001000000, // 1 << 6
  Insert_Content: 0b0010000000, // 1 << 7
  Remove_Content: 0b0100000000, // 1 << 8
  Functional: 0b1000000000, // 1 << 9
} as const

interface CmdMap<MetaType = any> {
  [CmdTypeEm.Insert_Composition_Text]: CmdInsertCompositionText<MetaType>
  [CmdTypeEm.Insert_Text]: CmdInsertText<MetaType>
  [CmdTypeEm.Delete_Text]: CmdDeleteText<MetaType>
  [CmdTypeEm.Replace_Text]: CmdReplaceText<MetaType>
  [CmdTypeEm.Insert_Node]: CmdInsertNode<MetaType>
  [CmdTypeEm.Remove_Node]: CmdRemoveNode<MetaType>
  [CmdTypeEm.Replace_Node]: CmdReplaceNode<MetaType>
  [CmdTypeEm.Insert_Content]: CmdInsertContent<MetaType>
  [CmdTypeEm.Remove_Content]: CmdRemoveContent<MetaType>
  [CmdTypeEm.Functional]: CmdFunctional<MetaType>
}
type CmdCallback<T extends CmdTypeEm, MetaType = any> = (
  // 若命令 init 显示地配置了 meta, 那么 this 应当拥有必选的 meta 属性; 可通过判断 MetaType类型是否为 undefined 来实现
  this: CmdWithoutType<CmdMap<MetaType>[T]> & (MetaType extends undefined ? CmdMeta<MetaType> : Required<CmdMeta<MetaType>>),
  ctx: Et.EditorContext,
) => void

interface CmdMeta<MetaType> {
  /**
   * 需要保存的与cmd相关的数据, 都放在meta中, 如命令回调里需要用到的变量\
   * 若三个callback回调中引用了外部变量(形成闭包), 则应将这些变量存入meta中, 避免撤回栈中的命令一直保持着对外部变量的引用
   */
  readonly meta?: MetaType
}
interface CmdFinalCallback<T extends CmdTypeEm, MetaType = any> extends CmdMeta<MetaType> {
  /**
   * 命令最终回调; 会在撤回栈满, 命令被踢出, 或在编辑器unmount时调用;
   * Text相关的 4 个命令无此回调; 它们可能在命令合并过程中被丢弃
   */
  finalCallback?: CmdCallback<T, MetaType>
}
interface CmdExecCallback<T extends CmdTypeEm, MetaType = any> extends CmdMeta<MetaType> {
  /**
   * 命令执行回调; 在命令执行后立即调用; 回调使用的变量可以存储在meta属性中
   */
  execCallback?: CmdCallback<T, MetaType>
  /**
   * 命令撤回回调; 在命令撤回后立即调用; 回调使用的变量可以存储在meta属性中
   */
  undoCallback?: CmdCallback<T, MetaType>
};

interface CmdExecAt {
  /**
   * 命令执行时相关内容的位置, 插入时为要插入的位置(insertAt), 删除时为要删除的内容所在的位置(removeAt) \
   * 可使用 `CaretRange`光标范围工具 `cr.caretInStart/caretInEnd/caretLast/caretIn/caretOut` 方法创建
   * * 此位置必须在节点边缘, 不可在`Text`节点内部; 否则命令不执行
   * * 即当 node 是#text节点时, 使用 cr.caretIn/Start/End(node) 创建的位置, 命令都不会执行
   */
  execAt: Et.EtCaret
}
interface SetCaret {
  /**
   * 命令执行后是否设置光标位置 \
   * 这是对 destCaretRange 选项的简化配置, 当且仅当 true 时, 无需指定 destCaretRange 选项,
   * 命令会自动定位命令执行后的光标位置, 对于文本命令 [Insert_Text, Delete_Text, Replace_Text]
   * 会自动定位 插入/删除/替换 文本后的光标位置; 对于节点命令: Insert_Node 会定位到节点内开头,
   * Remove_Node 会定位到被删除节点的原始位置(外开头), 对于 Replace_Node 会定位到替换后节点的内开头;
   * 片段命令和函数式命令无此配置
   */
  setCaret?: boolean
}

/** 命令抽象接口, 更新dom统一命令 */
interface Cmd<T extends CmdTypeEm = any, MetaType = any> extends CmdFinalCallback<T, MetaType> {
  /** 命令类别 */
  readonly type: T
  /**
   * 命令执行前光标的位置; 一般不需要设置 \
   * handle一组命令时, 仅首个成功执行的命令的此项配置有效; 若未配置, 则命令内部自动使用 ctx.caret.staticRange;
   * * 若设置为null, 则表明命令撤回时 不需要设置光标位置; 可用于 input/textarea 内输入时配置的命令,
   * 因为input/textarea内的光标设置无法使用Selection/Range来设置
   * * 非必要不要设置为null
   */
  srcCaretRange?: Et.CaretRange | null
  /**
   * 命令执行后光标的落点位置; \
   * 为提高稳定性, 除非必要, 优先在handle函数中提供, 而不是在创建命令时设置
   * * 类似 `srcCaretRange`, 若设置为null, 表明命令执行后不需要设置光标位置
   */
  destCaretRange?: Et.CaretRange | null
}

/** 插入输入法文本 */
interface CmdInsertCompositionText<MetaType = any> extends Omit<Cmd<CmdTypeEm.Insert_Composition_Text, MetaType>, 'meta' | `${string}Callback`> {
  readonly type: CmdTypeEm.Insert_Composition_Text
  /** 输入法插入的文本, 就是InputEvent的data值, 命令内部会处理输入法构造串 */
  readonly data: string
  /**
   * 输入法插入构造串的文本节点; \
   * 可能是页面上已有的节点, 也可能是输入法会话开始时浏览器插入的, 由`newInserted`判断
   */
  text?: Et.Text
  /**
   * 当输入法会话启动时, 若光标不在Text节点内, 则输入法会让浏览器在该位置插入一个Text节点; \
   * 命令需要在执行时获取该Text节点, 并判断是已有的, 还是新插入的 \
   * 撤回栈构造事务时会处理Insert_Composition_Text命令, 以支持撤回/重做 \
   * 其根据`newInserted`是否为true, 来判断合并转为`Insert_Node` 还是 `Insert_Text`
   */
  newInserted?: boolean
}
/** 插入文本到文本节点 */
interface CmdInsertText<MetaType = any> extends Cmd<CmdTypeEm.Insert_Text, MetaType>, SetCaret {
  readonly type: CmdTypeEm.Insert_Text
  /** 要插入文本的文本节点 */
  readonly text: Et.Text
  /** 要插入的文本在text内的起始位置偏移量 */
  readonly offset: number
  /** 要插入的文本 */
  readonly data: string
  /** 此属性无运行时, 仅用于类型兼容 */
  readonly isBackward: true
}
/** 从文本节点删除文本 */
interface CmdDeleteText<MetaType = any> extends Cmd<CmdTypeEm.Delete_Text, MetaType>, SetCaret {
  readonly type: CmdTypeEm.Delete_Text
  /** 要删除文本的文本节点 */
  readonly text: Et.Text
  /** 要删除的文本在text内的起始位置偏移量 */
  readonly offset: number
  /** 要删除的文本 */
  readonly data: string
  /** 删除方向, 一般 Backspace 删除时true, Delete 时false; 决定合并命令时字符串的拼接方向 */
  readonly isBackward: boolean
}
/** 从文本节点替换文本 */
interface CmdReplaceText<MetaType = any> extends Cmd<CmdTypeEm.Replace_Text, MetaType>, SetCaret {
  readonly type: CmdTypeEm.Replace_Text
  /** 要替换文本的文本节点 */
  readonly text: Et.Text
  /** 新的文本 */
  data: string
  /** 被替换的文本长度 */
  delLen: number
  /** 被替换的文本在text内的起始位置偏移量 */
  readonly offset: number
}
/** 插入节点 */
interface CmdInsertNode<MetaType = any> extends Cmd<CmdTypeEm.Insert_Node, MetaType>, CmdExecAt, SetCaret {
  readonly type: CmdTypeEm.Insert_Node
  /** 要插入的节点 */
  readonly node: Et.Node
}
/** 移除节点 */
interface CmdRemoveNode<MetaType = any> extends Cmd<CmdTypeEm.Remove_Node, MetaType>, Partial<CmdExecAt>, SetCaret {
  readonly type: CmdTypeEm.Remove_Node
  /** 要删除的节点 */
  readonly node: Et.Node
}
/** 替换节点 */
interface CmdReplaceNode<MetaType = any> extends Cmd<CmdTypeEm.Replace_Node, MetaType>, SetCaret {
  readonly type: CmdTypeEm.Replace_Node
  /** 新的节点 */
  newNode: Et.Node
  /** 被替换的节点 */
  oldNode: Et.Node
}
/** 插入内容片段 */
interface CmdInsertContent<MetaType = any> extends Cmd<CmdTypeEm.Insert_Content, MetaType>, CmdExecAt {
  readonly type: CmdTypeEm.Insert_Content
  /** 要插入的内容片段 */
  content: Et.Fragment
  /** 插入了的内容片段的范围, 该值由命令系统内部维护 */
  removeRange?: Et.SpanRange
}
/** 移除内容片段, 该命令会移除 (包含)从`removeStart`到`removeEnd`的节点, 并按序存储到`content`属性中 */
interface CmdRemoveContent<MetaType = any> extends Cmd<CmdTypeEm.Remove_Content, MetaType>, Partial<CmdExecAt> {
  readonly type: CmdTypeEm.Remove_Content
  /** 被删除了的内容片段, 该值由命令系统内部维护 */
  content?: Et.Fragment
  /** 要删除的内容片段的范围 */
  removeRange: Et.SpanRange
}
/** 功能命令 */
interface CmdFunctional<MetaType = any> extends Cmd<CmdTypeEm.Functional, MetaType>, CmdExecCallback<CmdTypeEm.Functional, MetaType> {
  readonly type: CmdTypeEm.Functional
  /**
   * 构建命令事务写入撤回栈时, 尝试合并下一个Functional命令, 缺省或返回false, 则不合并
   * * 该方法在命令执行后记录撤回栈事务时才会调用, 在命令执行时无任何作用
   */
  readonly merge?: MergeFunctional<MetaType>
  readonly execCallback: CmdCallback<CmdTypeEm.Functional, MetaType>
  readonly undoCallback: CmdCallback<CmdTypeEm.Functional, MetaType>
}

interface MergeFunctional<MetaType = any> {
  /**
   * 合并当前和下一个 Functional 命令
   * @returns `false`: 不合并\
   *          `true`: 使用当前命令(写入撤回栈), 丢弃 nextCmd, 并沿用当前命令的 merge 方法尝试下一次合并\
   *          `CmdFunctional`: 使用指定命令(写入撤回栈), 丢弃当前命令和 nextCmd(除非返回了他们之一);
   *                           若返回的命令没有 merge 方法, 则不再尝试后续合并
   */
  (this: CmdFunctional<MetaType> & { merge: MergeFunctional<MetaType> }& (MetaType extends undefined ? CmdMeta<MetaType> : Required<CmdMeta<MetaType>>),
    nextCmd: CmdFunctional<MetaType>): CmdFunctionalInit<any> | boolean
}

type CmdInit<C extends Cmd, MetaType, OmitType extends string = never> = Omit<C, | 'type' | OmitType> & { meta?: MetaType }
type CmdInsertCompositionTextInit = Pick<CmdInsertCompositionText, 'data'>
type CmdInsertTextInit<MetaType> = CmdInit<CmdInsertText<MetaType>, MetaType, CmdInitOmits[CmdTypeEm.Insert_Text]>
type CmdDeleteTextInit<MetaType> = CmdInit<CmdDeleteText<MetaType>, MetaType>
type CmdReplaceTextInit<MetaType> = CmdInit<CmdReplaceText<MetaType>, MetaType>
type CmdInsertNodeInit<MetaType> = CmdInit<CmdInsertNode<MetaType>, MetaType>
type CmdRemoveNodeInit<MetaType> = CmdInit<CmdRemoveNode<MetaType>, MetaType>
type CmdReplaceNodeInit<MetaType> = CmdInit<CmdReplaceNode<MetaType>, MetaType>
type CmdInsertContentInit<MetaType> = CmdInit<CmdInsertContent<MetaType>, MetaType, CmdInitOmits[CmdTypeEm.Insert_Content]>
type CmdRemoveContentInit<MetaType> = CmdInit<CmdRemoveContent<MetaType>, MetaType, CmdInitOmits[CmdTypeEm.Remove_Content]>
type CmdFunctionalInit<MetaType> = CmdInit<CmdFunctional<MetaType>, MetaType>
interface CmdInitOmits {
  [CmdTypeEm.Insert_Composition_Text]: never
  [CmdTypeEm.Insert_Text]: 'isBackward'
  [CmdTypeEm.Delete_Text]: never
  [CmdTypeEm.Replace_Text]: never
  [CmdTypeEm.Insert_Node]: never
  [CmdTypeEm.Remove_Node]: never
  [CmdTypeEm.Replace_Node]: never
  [CmdTypeEm.Insert_Content]: 'removeRange'
  [CmdTypeEm.Remove_Content]: 'content'
  [CmdTypeEm.Functional]: never
}

/**
 * 命令执行函数, this指向当前执行的命令;
 * @returns 当且仅当返回true时, 命令被记录(撤回栈), 否则丢弃该命令
 */
type CmdExec<C extends Cmd> = typeof cmdExecMap[C['type']]
type CmdWithoutType<C> = Omit<C, 'type'>
/** 拥有执行函数的命令 */
type CmdWithExec<C extends Cmd = Cmd, A extends Cmd = C> = C & {
  exec: CmdExec<C>
  undo: CmdExec<A>
}

type CommandInsertCompositionText = CmdWithExec<CmdInsertCompositionText>
type CommandInsertText = CmdWithExec<CmdInsertText>
type CommandDeleteText = CmdWithExec<CmdDeleteText>
type CommandReplaceText = CmdWithExec<CmdReplaceText>
type CommandInsertNode = CmdWithExec<CmdInsertNode>
type CommandRemoveNode = CmdWithExec<CmdRemoveNode>
type CommandReplaceNode = CmdWithExec<CmdReplaceNode>
type CommandInsertContent = CmdWithExec<CmdInsertContent>
type CommandRemoveContent = CmdWithExec<CmdRemoveContent>
type CommandFunctional = CmdWithExec<CmdFunctional>

type Command
  = | CommandInsertCompositionText
    | CommandInsertText
    | CommandDeleteText
    | CommandReplaceText
    | CommandInsertNode
    | CommandRemoveNode
    | CommandReplaceNode
    | CommandInsertContent
    | CommandRemoveContent
    | CommandFunctional

/** 首次执行之后的命令, 其一些可选属性将变为必选且只读 */
type ExecutedCmd<C extends Cmd = Cmd> = C & Readonly<Required<Pick<C, ExecutedRequiresMap[C['type']]>>>
interface ExecutedRequiresMap {
  [CmdTypeEm.Insert_Composition_Text]: 'text' | 'newInserted' | 'srcCaretRange'
  [CmdTypeEm.Insert_Text]: never
  [CmdTypeEm.Delete_Text]: never
  [CmdTypeEm.Replace_Text]: 'data' | 'delLen'
  [CmdTypeEm.Insert_Node]: 'execAt'
  [CmdTypeEm.Remove_Node]: 'execAt'
  [CmdTypeEm.Replace_Node]: 'newNode' | 'oldNode'
  [CmdTypeEm.Insert_Content]: 'execAt' | 'content' | 'removeStart' | 'removeEnd'
  [CmdTypeEm.Remove_Content]: 'execAt' | 'content' | 'removeStart' | 'removeEnd'
  [CmdTypeEm.Functional]: never
}

/* -------------------------------------------------------------------------- */
/*                                   命令执行函数                                   */
/* -------------------------------------------------------------------------- */

const execInsertCompositionText = function (this: CmdInsertCompositionText, ctx: Et.EditorContext) {
  if (ctx.composition.updateCount === 1) {
    if (ctx.selection.anchorText) {
      this.newInserted = false
    }
    else {
      // 命令执行时, 光标不在Text节点内部, 浏览器会自动插入一个Text, 此处标记将来有新Text插入
      // 提示撤回栈在构建事务时, 合并转成 Insert_Node 命令
      this.newInserted = true
    }
    // 输入法会话第一个输入, 记录初始光标位置;
    // 当用户通过点击页面外的方式取消输入法会话时, 可能导致只有一个 Insert_Composition_Text 命令
    // 这时便需要通过初始光标位置来判断是合并转为 Insert_Node 还是 Insert_Text 了
    this.srcCaretRange = ctx.selection.getCaretRange()
  }
  else {
    // 若输入法构造期间无#text节点, 更新光标位置以获取当前文本节点
    if (!ctx.selection.anchorText) {
      ctx.selection.update()
    }
    if (!ctx.selection.anchorText) {
      // 输入法构造串不在文本节点上, 理论上这永远不会发生, 如果发生将是浏览器/系统层面的问题
      if (import.meta.env.DEV) {
        throw Error(`Insert_Composition_Text: 输入法会话后续输入不在#text节点上`)
      }
      return false
    }
    // 非输入法会话的第一个输入, 光标必定在文本节点上
    // 记录该节点, 用于合并转为 Insert_Text 命令
    this.text = ctx.selection.anchorText
  }

  return true
}
const execInsertText = function (this: CmdInsertText | CmdDeleteText) {
  const text = this.text
  const offset = this.offset
  text.insertData(offset, this.data)
  if (this.setCaret) {
    this.setCaret = false
    this.destCaretRange = cr.caret(text, offset + this.data.length)
  }
  return true
}
const execDeleteText = function (this: CmdDeleteText | CmdInsertText) {
  // TODO 使用Text 内置的 deleteData 方法删除文本, 不会导致光标跳跃
  // 即此处无需手动更新光标位置 (仅 chromium, 待验证; 如果确实如此且稳定, 那么所有文本
  // 编辑命令都无需手动设置光标位置了, (但这样会依赖 selectionchange 来更新 selection 和 ctx;
  // 那么 selchange 的防抖间隔就不能太大 ))
  this.text.deleteData(this.offset, this.data.length)
  if (this.setCaret) {
    this.setCaret = false
    this.destCaretRange = cr.caret(this.text, this.offset)
  }
  return true
}
const execReplaceText = function (this: CmdReplaceText) {
  const { data, delLen, offset } = this
  this.delLen = data.length
  this.data = this.text.data.slice(offset, offset + delLen)
  this.text.replaceData(offset, delLen, data)
  if (this.setCaret) {
    this.setCaret = false
    this.destCaretRange = cr.caret(this.text, offset + data.length)
  }
  return true
}
const execInsertNode = function (this: CmdInsertNode | CmdRemoveNode) {
  const execAt = (this as CmdInsertNode).execAt.toCaret()
  // 插入点不是节点边缘, 禁止插入
  if (execAt.isSurroundText) {
    return false
  }
  execAt.insertNode(this.node)
  // 自动设置结束光标位置
  if (this.setCaret) {
    this.setCaret = false
    this.destCaretRange = cr.caretInStart(this.node)
  }
  return true
}
const execRemoveNode = function (this: CmdRemoveNode | CmdInsertNode) {
  if (!this.execAt) {
    this.execAt = cr.caretOutStart(this.node)
  }
  if (this.setCaret) {
    this.setCaret = false
    this.destCaretRange = this.execAt
  }
  this.node.remove()
  return true
}
const execReplaceNode = function (this: CmdReplaceNode) {
  const { newNode, oldNode } = this
  oldNode.replaceWith(newNode)
  this.newNode = oldNode
  this.oldNode = newNode
  if (this.setCaret) {
    this.setCaret = false
    this.destCaretRange = cr.caretInStart(newNode)
  }
  return true
}
const execInsertContent = function (this: CmdInsertContent | CmdRemoveContent) {
  const { execAt, content } = this as CmdInsertContent
  if (!content.childNodes.length) {
    return false
  }
  if (!this.removeRange) {
    this.removeRange = new SpanRange(
      content.firstChild as NodeHasParent<Et.Node>,
      content.lastChild as NodeHasParent<Et.Node>,
    )
  }
  return execAt.insertNode(content)
}
const execRemoveContent = function (this: CmdRemoveContent | CmdInsertContent) {
  const removeRange = (this as CmdRemoveContent).removeRange
  // DONE 本质上, 删除Range 内容若要能安全撤回, 则removeRange 的 startNode 和 endNode 必须是同层级的;
  // 即拥有相同的父节点, 否则会破坏 DOM 结构, 导致无法安全撤回 (即撤回前后的 DOM 结构不一致)
  // 因此此处不应使用 range.extractContents 方法, 而应当在 EtRange 中封装一个提取方法
  // 此提取方法直接就是遍历同层级的节点逐个提取 (startNode ~ endNode) 性能也更好
  if (!this.content) {
    // 首次执行, 获取提取位置, 为undo确定内容恢复位置
    this.execAt = removeRange.removeAt()
    this.content = removeRange.extractToFragment()
  }
  else {
    this.content = removeRange.extractToFragment()
  }
  return true
}
const execFunctional = function (this: CmdFunctional, ctx: Et.EditorContext) {
  this.execCallback?.(ctx)
  return true
}
const undoFunctional = function (this: CmdFunctional, ctx: Et.EditorContext) {
  this.undoCallback?.(ctx)
  return true
}

const cmdExecMap = {
  [CmdTypeEm.Insert_Composition_Text]: execInsertCompositionText,
  [CmdTypeEm.Insert_Text]: execInsertText,
  [CmdTypeEm.Delete_Text]: execDeleteText,
  [CmdTypeEm.Replace_Text]: execReplaceText,
  [CmdTypeEm.Insert_Node]: execInsertNode,
  [CmdTypeEm.Remove_Node]: execRemoveNode,
  [CmdTypeEm.Replace_Node]: execReplaceNode,
  [CmdTypeEm.Insert_Content]: execInsertContent,
  [CmdTypeEm.Remove_Content]: execRemoveContent,
  [CmdTypeEm.Functional]: execFunctional,
}
const cmdUndoMap = {
  [CmdTypeEm.Insert_Composition_Text]: () => {
    if (import.meta.env.DEV) {
      throw Error('Insert_Composition_Text undo not support')
    }
  },
  [CmdTypeEm.Insert_Text]: execDeleteText,
  [CmdTypeEm.Delete_Text]: execInsertText,
  [CmdTypeEm.Replace_Text]: execReplaceText,
  [CmdTypeEm.Insert_Node]: execRemoveNode,
  [CmdTypeEm.Remove_Node]: execInsertNode,
  [CmdTypeEm.Replace_Node]: execReplaceNode,
  [CmdTypeEm.Insert_Content]: execRemoveContent,
  [CmdTypeEm.Remove_Content]: execInsertContent,
  [CmdTypeEm.Functional]: undoFunctional,
}

/* -------------------------------------------------------------------------- */
/*                                   命令构建函数                                   */
/* -------------------------------------------------------------------------- */

/** 创建一个命令: 插入输入法文本
 * @param init 命令初始化对象
 * @example
 * init: {
 *  data
 * }
 */
const insertCompositionText = (init: CmdInsertCompositionTextInit) => {
  return Object.assign(init, {
    type: CmdTypeEm.Insert_Composition_Text,
    exec: execInsertCompositionText,
  }) as CmdWithExec<CmdInsertCompositionText>
}
/** 创建一个命令: 插入文本到文本节点
 * @param init 命令初始化对象
 * @example
 * init: {
 *  text
 *  data
 *  offset
 *  meta?
 *  destCaretRange?
 *  finalCallback?
 * }
 */
const insertText = <MetaType>(init: CmdInsertTextInit<MetaType>) => {
  return Object.assign(init, {
    type: CmdTypeEm.Insert_Text,
    exec: execInsertText,
    undo: execDeleteText,
  }) as CmdWithExec<CmdInsertText, CmdDeleteText>
}
/** 创建一个命令: 从文本节点删除文本
 * @param init 命令初始化对象
 * @example
 * init: {
 *  text
 *  data
 *  offset
 *  isBackward
 *  meta?
 *  destCaretRange?
 *  finalCallback?
 * }
 */
const deleteText = <MetaType>(init: CmdDeleteTextInit<MetaType>) => {
  return Object.assign(init, {
    type: CmdTypeEm.Delete_Text,
    exec: execDeleteText,
    undo: execInsertText,
  }) as CmdWithExec<CmdDeleteText, CmdInsertText>
}
/** 创建一个命令: 从文本节点替换文本
 * @param init 命令初始化对象
 * @example
 * init: {
 *  text
 *  data
 *  delLen
 *  offset
 *  meta?
 *  destCaretRange?
 *  finalCallback?
 * }
 */
const replaceText = <MetaType>(init: CmdReplaceTextInit<MetaType>) => {
  return Object.assign(init, {
    type: CmdTypeEm.Replace_Text,
    exec: execReplaceText,
    undo: execReplaceText,
  }) as CmdWithExec<CmdReplaceText>
}
/** 创建一个命令: 插入节点
 * * ⚠️注意: 如果插入的节点 node, 是上一个未执行命令中要删除的节点(pNode)的后代, 则必须
 *          先将 node 删除, 再删除 pNode, 否则撤回时找不到光标位置
 * ```ts
 * // 如 node 是 pNode 的后代, 我们希望删除 pNode, 并将 node 插入原本 pNode 的位置
 * ctx.commandManager.push(
 *    cmd.removeNode({node: node}),
 *    cmd.removeNode({node: pNode}),
 *    cmd.insertNode({
 *        node: node,
 *        execAt: ...
 *    })
 * ).handleAndUpdate(cr.caretInAuto(node))
 * ```
 * @param init 命令初始化对象
 * @example
 * init: {
 *  node
 *  execAt
 *  meta?
 *  destCaretRange?
 *  finalCallback?
 * }
 */
const insertNode = <MetaType>(init: CmdInsertNodeInit<MetaType>) => {
  return Object.assign(init, {
    type: CmdTypeEm.Insert_Node,
    exec: execInsertNode,
    undo: execRemoveNode,
  }) as CmdWithExec<CmdInsertNode, CmdRemoveNode>
}
/** 创建一个命令: 移除节点
 * @param init 命令初始化对象
 * @example
 * init: {
 *  node
 *  meta?
 *  destCaretRange?
 *  finalCallback?
 * }
 */
const removeNode = <MetaType>(init: CmdRemoveNodeInit<MetaType>) => {
  return Object.assign(init, {
    type: CmdTypeEm.Remove_Node,
    exec: execRemoveNode,
    undo: execInsertNode,
  }) as CmdWithExec<CmdRemoveNode, CmdInsertNode>
}
/** 创建一个命令: 替换节点
 * @param init 命令初始化对象
 * @example
 * init: {
 *  newNode
 *  oldNode
 *  meta?
 *  destCaretRange? // 若缺省, 命令内部将使用 newNode 的内开头位置
 *  finalCallback?
 * }
 */
const replaceNode = <MetaType>(init: CmdReplaceNodeInit<MetaType>) => {
  return Object.assign(init, {
    type: CmdTypeEm.Replace_Node,
    exec: execReplaceNode,
    undo: execReplaceNode,
  }) as CmdWithExec<CmdReplaceNode>
}
/** 创建一个命令: 插入内容片段
 * @param init 命令初始化对象
 * @example
 * init: {
 *  content
 *  execAt
 *  meta?
 *  destCaretRange?
 *  finalCallback?
 * }
 */
const insertContent = <MetaType>(init: CmdInsertContentInit<MetaType>) => {
  return Object.assign(init, {
    type: CmdTypeEm.Insert_Content,
    exec: execInsertContent,
    undo: execRemoveContent,
  }) as CmdWithExec<CmdInsertContent, CmdRemoveContent>
}
/** 创建一个命令: 移除内容片段
 * @param init 命令初始化对象
 * @example
 * init: {
 *  removeRange
 *  meta?
 *  destCaretRange?
 *  finalCallback?
 * }
 */
const removeContent = <MetaType>(init: CmdRemoveContentInit<MetaType>) => {
  return Object.assign(init, {
    type: CmdTypeEm.Remove_Content,
    exec: execRemoveContent,
    undo: execInsertContent,
  }) as CmdWithExec<CmdRemoveContent, CmdInsertContent>
}
/** 创建一个命令: 功能命令
 * @param init 命令初始化对象
 * @example
 * init: {
 *  meta?
 *  execCallback
 *  undoCallback
 *  destCaretRange?
 *  finalCallback?
 * }
 */
const functional = <MetaType>(init: CmdFunctionalInit<MetaType>) => {
  return Object.assign(init, {
    type: CmdTypeEm.Functional,
    exec: execFunctional,
    undo: undoFunctional,
  }) as CmdWithExec<CmdFunctional>
}

/* -------------------------------------------------------------------------- */
/*                                  命令构建工具                                */
/* -------------------------------------------------------------------------- */

/**
 * 命令工厂函数, 可通过扩展此接口实现自定义命令;
 * 类似 cmd.moveNodes, 就是一个 Functional 命令的封装
 * @augmentable
 */
interface CmdFactory {
  <T extends CmdTypeEm, MetaType>(type: T, init: CmdInit<CmdMap<MetaType>[T], MetaType, CmdInitOmits[T]>): CmdWithExec<CmdMap<MetaType>[T]>
}
/**
 * 命令构造器
 */
const cmd = (() => {
  /**
   * 创建一个命令对象
   * @param type 命令类型, 可从cmd对象上获取对应常量
   * @param init 命令初始化属性
   * @returns 相应type的命令对象
   */
  const _cmd = <T extends CmdTypeEm, MetaType>(type: T, init: CmdInit<CmdMap<MetaType>[T], MetaType>) => {
    return Object.assign(init, {
      type,
      exec: cmdExecMap[type],
      undo: cmdUndoMap[type],
    }) as unknown as CmdWithExec<CmdMap<MetaType>[T]>
  }
  /** 创建一个命令: 插入输入法文本 */
  _cmd.insertCompositionText = insertCompositionText
  /** 创建一个命令: 插入文本到文本节点 */
  _cmd.insertText = insertText
  /** 创建一个命令: 从文本节点删除文本 */
  _cmd.deleteText = deleteText
  /** 创建一个命令: 从文本节点替换文本 */
  _cmd.replaceText = replaceText
  /** 创建一个命令: 插入节点 */
  _cmd.insertNode = insertNode
  /** 创建一个命令: 移除节点 */
  _cmd.removeNode = removeNode
  /** 创建一个命令: 替换节点 */
  _cmd.replaceNode = replaceNode
  /** 创建一个命令: 插入内容片段 */
  _cmd.insertContent = insertContent
  /** 创建一个命令: 移除内容片段 */
  _cmd.removeContent = removeContent
  /** 创建一个命令: 功能命令 */
  _cmd.functional = functional

  /** `type = Insert_Composition_Text` */
  _cmd.INS_CT = CmdTypeEm.Insert_Composition_Text
  /** `type = Insert_Text` */
  _cmd.INS_T = CmdTypeEm.Insert_Text
  /** `type = Delete_Text` */
  _cmd.DEL_T = CmdTypeEm.Delete_Text
  /** `type = Replace_Text` */
  _cmd.REP_T = CmdTypeEm.Replace_Text
  /** `type = Insert_Node` */
  _cmd.INS_N = CmdTypeEm.Insert_Node
  /** `type = Remove_Node` */
  _cmd.REM_N = CmdTypeEm.Remove_Node
  /** `type = Replace_Node` */
  _cmd.REP_N = CmdTypeEm.Replace_Node
  /** `type = Insert_Content` */
  _cmd.INS_C = CmdTypeEm.Insert_Content
  /** `type = Remove_Content` */
  _cmd.REM_C = CmdTypeEm.Remove_Content
  /** `type = Functional` */
  _cmd.FUNC = CmdTypeEm.Functional

  /**
   * 创建一个空命令\
   * 这在那些无命令执行却需要拥有撤回恢复光标位置能力的场景会用到
   * @returns 一个由空执行回调和空撤销回调组成的 Functional 命令
   */
  _cmd.null = function () {
    return this.functional({
      execCallback() { /** 空命令 */ },
      undoCallback() { /** 空命令 */ },
    })
  }

  /**
   * 这是对 Delete_Text 命令的封装, 旨在简化使用 range 删除时的命令配置
   * @param textNode 文本节点
   * @param start 开始位置(包含)
   * @param end 结束位置(不包含)
   * @param isBackward 是否为 Backspace 删除, 否则为 Delete 删除; 这决定多个删除文本命令合并时的文本合并方向
   * @param setCaret 是否设置光标
   * @returns 一个 Delete_Text 命令
   */
  _cmd.removeText = function (textNode: Et.Text, start: number, end: number, isBackward = true, setCaret = true) {
    return cmd.deleteText({
      text: textNode,
      data: textNode.data.slice(start, end),
      offset: start,
      isBackward,
      setCaret,
    })
  }

  /**
   * 创建一个批量移动节点命令, 该命令是一个 Functional 命令
   * * [NB]: 在同一个父节点内移动节点时, 需要提供未来的 moveTo 位置, 因为移动节点后基于父节点的子节点偏移量会发生变化;
   *         需使用`cr.caretOutEndFuture`或`cr.caretOutStartFuture`等未来定位, 在移动节点后确定插入位置
   * @param moveRange 被移动的节点范围
   * @param moveTo 被移动到的位置
   * @param destCaretRange 结束光标位置
   * @returns 一个 Functional 命令
   */
  _cmd.moveNodes = function (
    moveRange: Et.SpanRange,
    moveTo: Et.EtCaret,
    destCaretRange?: Et.CaretRange,
  ): CmdWithExec<CmdFunctional> {
    return this.functional({
      meta: {
        _moveRange: moveRange,
        _moveTo: moveTo,
      },
      execCallback() {
        const { _moveRange, _moveTo } = this.meta
        this.meta._moveTo = _moveRange.removeAt()
        _moveTo.insertNode(_moveRange.extractToFragment())
      },
      undoCallback(_) {
        this.execCallback(_)
      },
      destCaretRange,
    })
  }

  return _cmd as CmdFactory & Readonly<typeof _cmd>
})()

/* -------------------------------------------------------------------------- */
/*                                  命令执行工具                                */
/* -------------------------------------------------------------------------- */

/**
 * 命令处理器
 */
const cmdHandler = {
  /**
   * 执行一组命令, 调用前必须判断 cmds长度 > 0
   * * 此方法会给第一个命令赋值srcCaretRange, 记录此刻光标位置
   */
  handle(cmds: readonly Command[], recordCmds: ExecutedCmd[], ctx: Et.EditorContext, destCaretRange?: Et.CaretRange | null) {
    // 记录初始光标位置
    let lastCaretRange: Et.CaretRange | null = null

    // const recordCmds = []
    for (const cmd of cmds) {
      try {
        if ((cmd as CmdWithExec).exec(ctx)) {
          // 命令执行返回true 记录, 否则丢弃
          recordCmds.push(cmd)
          if (cmd.destCaretRange !== void 0) {
            // null 也要记录, 因为 null 代表强制不设置结束光标位置, 而不是缺省的意思
            lastCaretRange = cmd.destCaretRange
          }
        }
      }
      catch (_) {
        // 其中一个命令失败, 终止所有命令, 并撤回已执行命令
        for (let i = recordCmds.length - 1; i >= 0; i--) {
          (recordCmds[i] as CmdWithExec).undo(ctx)
        }
        recordCmds.length = 0
        ctx.assists.logger?.logError(`cmdHandler.handle error, cmdType: ${cmd.type}`, 'cmdHandler')
        return null
      }
    }
    // 为首个命令设置初始光标位置; 仅当第一个命令未设置srcCaretRange(为undefined)时, 才设置;
    // 若为 null, 说明命令本身不要设置初始光标位置, 即撤回时不要改变光标
    if (recordCmds.length) {
      if (recordCmds[0]!.srcCaretRange === void 0) {
        recordCmds[0]!.srcCaretRange = ctx.selection.getCaretRange()
      }
      if (destCaretRange) {
        recordCmds[recordCmds.length - 1]!.destCaretRange = destCaretRange
        lastCaretRange = destCaretRange
      }
      else if (destCaretRange === null) {
        recordCmds[recordCmds.length - 1]!.destCaretRange = lastCaretRange = null
      }
      else {
        recordCmds[recordCmds.length - 1]!.destCaretRange = lastCaretRange
      }
    }
    return lastCaretRange
  },
  /**
   * 撤回一个撤回栈事务内的所有命令
   * @param cmds 命令列表, 应当是顺序的, 即本方法内会逆序执行以撤回;
   * * 同时, 根据handle的原则, 此命令列表的首项, 应当记录了当时的光标位置
   */
  handleUndo(cmds: readonly ExecutedCmd[], ctx: Et.EditorContext) {
    for (let i = cmds.length - 1; i >= 0; i--) {
      cmds[i]!.undo(ctx)
    }
    // 调用者判定cmds非空
    const srcCaretRange = cmds[0]!.srcCaretRange
    if (srcCaretRange) {
      return ctx.setSelection(srcCaretRange)
    }
    if (import.meta.env.DEV) {
      if (srcCaretRange === void 0) {
        throw Error(`handleUndo: 一个撤回栈事务的第一个命令没有设置初始光标位置`)
      }
    }
  },
  /**
   * 重做一个撤回栈事务内的所有命令
   * @param cmds 命令列表, 应当是顺序的, 本方法按顺序依次执行以重做
   * * 根据撤回栈pushTransaction 的原则, 最后一个命令应当记录了最终的光标位置;
   * 除非整个事务内的命令都没有设置光标位置(则应赋值null)
   */
  handleRedo(cmds: readonly ExecutedCmd[], ctx: Et.EditorContext) {
    for (const cmd of cmds) {
      cmd.exec(ctx)
    }
    // 调用者判定cmds非空
    const destCaretRange = cmds[cmds.length - 1]!.destCaretRange

    if (destCaretRange) {
      return ctx.setSelection(destCaretRange)
    }
    if (import.meta.env.DEV) {
      if (destCaretRange === void 0) {
        throw Error(`handleRedo: 存在一个命令设置了结束光标位置, 但撤回栈事务并未将其赋值给最后一个命令`) // 因为赋值之后 destCaretRange将会是null
      }
    }
  },
} as const

export { cmd, cmdHandler, CmdType }
export type { Cmd, CmdDeleteText, CmdFactory, CmdFunctional, CmdInsertText, Command, CommandFunctional, ExecutedCmd }
export type ExecutedInsertCompositionText = ExecutedCmd<CmdInsertCompositionText>
