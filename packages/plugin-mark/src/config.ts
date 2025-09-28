import type { Et } from '@effitor/core'

import type { EtMarkElement } from './element'

export const enum MarkEnum {
  CtxKey = '_et_$mark_',
  ElName = 'et-mark',
  EtCodeName = 'EtMarkElement',
}
export const enum MarkType {
  CODE = 'code',
  BOLD = 'bold',
  ITALIC = 'italic',
  DELETE = 'delete',
  HIGHLIGHT = 'highlight',
}
export const enum MarkStatus {
  HINTING = 'hinting',
  MARKING = 'marking',
  /** 添加到et-body上以禁用mark节点的标记符提示 */
  HINTING_HIDDEN = 'hinting-hidden',
}
export const markerMap = {
  [MarkType.CODE]: { type: MarkType.CODE, char: '`', marker: '`' },
  [MarkType.ITALIC]: { type: MarkType.ITALIC, char: '*', marker: '*' },
  [MarkType.BOLD]: { type: MarkType.BOLD, char: '*', marker: '**' },
  [MarkType.DELETE]: { type: MarkType.DELETE, char: '~', marker: '~~' },
  [MarkType.HIGHLIGHT]: { type: MarkType.HIGHLIGHT, char: '=', marker: '==' },
} as const
export type Marker = typeof markerMap[keyof typeof markerMap]

/**
 * 标记节点嵌套规则：
 * ```
 * code不可嵌套，也不可被嵌套
 * highlight可嵌套除code和自身外所有
 * bold可嵌套italic，反之亦然，delete同理，但不可反复嵌套（由effector判断并限制）
 * ```
 */
export const nestedMarkMap: Partial<Record<MarkType, `${MarkType}`[]>> = {
  [MarkType.HIGHLIGHT]: [MarkType.BOLD, MarkType.ITALIC, MarkType.DELETE],
  [MarkType.BOLD]: [MarkType.ITALIC, MarkType.DELETE],
  [MarkType.ITALIC]: [MarkType.BOLD, MarkType.DELETE],
  [MarkType.DELETE]: [MarkType.BOLD, MarkType.ITALIC],
}

/**
 * mark 插件上下文
 */
export interface MarkPluginContext {
  readonly markState: ReturnType<typeof createMarkState>
  enableHinting?: boolean
}

export const createMarkState = () => ({
  isMarking: false,
  markEl: null as EtMarkElement | null,
  startMarking(markEl: EtMarkElement) {
    this.isMarking = true
    this.markEl = markEl
  },
  /**
   * 结束临时mark标记
   * @param success 是否 marking完成, 默认 true; 若将要撤回插入的临时节点, 应传入 false
   */
  endMarking(success = true) {
    this.isMarking = false
    if (success) {
      this.markEl?.removeCssClass(MarkStatus.MARKING)
    }
    this.markEl = null
  },
  /**
   * @param success 是否 marking 完成, 若将要撤回插入的临时节点, 应传入 false
   * @returns 若为 marking 状态, 则调用 endMarking, 否则返回 false
   */
  checkAndEndMarking(success: boolean) {
    return this.isMarking && (this.endMarking(success), true)
  },
})

export const initMarkContext = (meta: Et.EditorContextMeta, enableHinting = true) => {
  meta.pctx[MarkEnum.CtxKey] = {
    markState: createMarkState(),
    enableHinting,
  }
}
