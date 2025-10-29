import type { Et } from '@effitor/core'
import { cr, dom, etcode, EtRichText } from '@effitor/core'
import { CssClassEnum, EtTypeEnum, HtmlCharEnum } from '@effitor/shared'
import type { PhrasingContent } from 'mdast'

import { MarkEnum, MarkStatus, MarkType } from './config'
import markCssText from './index.css?raw'

export const ET_MARK_CODE = etcode.get(MarkEnum.ElName)

export class EtMarkElement extends EtRichText {
  static readonly etType = super.etType | ET_MARK_CODE
  static readonly inEtType = EtTypeEnum.PlainText | ET_MARK_CODE
  static readonly elName = MarkEnum.ElName
  static readonly cssText: string = markCssText

  public markType: `${MarkType}` | undefined

  static create(markType?: `${MarkType}`): EtMarkElement {
    const el = document.createElement(MarkEnum.ElName) as EtMarkElement
    if (markType) {
      el.markType = markType
      el.addCssClass(markType)
    }
    return el
  }

  changeMarkType(markType: `${MarkType}`) {
    const currType = this.markType
    if (currType !== markType) {
      if (currType) {
        this.removeCssClass(currType)
      }
      this.addCssClass(markType)
      this.markType = markType
    }
  }

  focusoutCallback(ctx: Et.EditorContext): void {
    super.focusoutCallback(ctx)
    // 已不在dom上, 跳过
    if (!this.isConnected) return
    // 若标记节点仅剩零宽字符，应当将其移除
    if (this.textContent === '\u200b') {
      // 回调在selchange之后触发，光标已不在this节点; 标记节点内光标位置，以便撤回删除时能让光标落于this节点内
      ctx.commandManager.withSrcCaretRange(cr.caretInStart(this), () => {
        ctx.commonHandler.removeNodeAndMerge(this)
      })
    }
    else {
      this.classList.remove(CssClassEnum.CaretIn)
    }
  }

  /**
   * fix: issues15, 复制粘贴丢失this.markType的问题
   */
  connectedCallback(): void {
    if (!this.markType) {
      this.markType = this.dataset.markType as MarkType
    }
    else {
      this.dataset.markType = this.markType
    }
  }

  isEqualTo(el: Element): boolean {
    // 去掉hinting状态再比较
    return dom.isEqualElement(this, el, [MarkStatus.HINTING])
  }

  mergeWith(el: this,
    mergeHtmlNode: (former: Et.NodeOrNull, latter: Et.NodeOrNull, affinityToFormer?: boolean | undefined) => Et.EtCaret,
  ): Et.EtCaret {
    // 去掉hinting状态
    this.removeCssClass(MarkStatus.HINTING)
    el.removeCssClass(MarkStatus.HINTING)
    return super.mergeWith(el, mergeHtmlNode)
  }

  toMdast(mdastNode: Et.CreateMdastNode): Et.ToMdastResult {
    if (!this.markType) return null
    if (this.markType === MarkType.CODE) {
      const value = this.textContent
      return value
        ? mdastNode({
            type: 'inlineCode',
            value,
          })
        : null
    }
    else {
      const mapping = {
        [MarkType.BOLD]: 'strong',
        [MarkType.ITALIC]: 'emphasis',
        [MarkType.DELETE]: 'delete',
        [MarkType.HIGHLIGHT]: 'highlight',
      } as const
      // return mdastNode(mapping[this.markType], this.childNodes, {})
      const mdastn = mdastNode(mapping[this.markType], this.childNodes, {})
      return mdastn
    }
  }

  static readonly toMarkdownTransformerMap: Et.MdastNodeTransformerMap = {
    // 将所有文本节点中的==用\==代替
    text: (node) => {
      node.value = node.value.replaceAll('==', '\\==')
    },
  }

  static readonly toMarkdownHandlerMap: Et.ToMarkdownHandlerMap = {
    highlight: (node, _, state, info) => {
      return `==${state.containerPhrasing(node, info)}==`
    },
  }

  static readonly fromMarkdownHandlerMap: Et.MdastNodeHandlerMap = {
    strong: () => EtMarkElement.create(MarkType.BOLD),
    delete: () => EtMarkElement.create(MarkType.DELETE),
    emphasis: () => EtMarkElement.create(MarkType.ITALIC),
    inlineCode: node => createMarkNode(MarkType.CODE, node.value)[0],
    highlight: () => EtMarkElement.create(MarkType.HIGHLIGHT),
    /**
     * 将==xxx==转为mark高亮节点
     * todo 优化（使用非正则表达式的方式）
     */
    text: (node, _ctx, index, parent, manager) => {
      // 匹配非\前导的==
      const reg = /(?<!\\)==/dg
      const value = node.value
      const start = reg.exec(value) as RegExpExecArray & {
        indices: RegExpIndicesArray
      }
      // 没有==
      if (!start) {
        return new Text(value.replaceAll('\\==', '=='))
      }
      const end = reg.exec(value) as RegExpExecArray & {
        indices: RegExpIndicesArray
      }
      return end ? hasCloseNode() : onlyStartNode()

      // 该文本节点有有成对==，即高亮节点内无嵌套其他节点
      function hasCloseNode() {
        const headText = value.slice(0, start.indices[0][0])
        const innerText = value.slice(start.indices[0][1], end.indices[0][0])
        const tailText = value.slice(end.indices[0][1])
        const replaceNodes = [manager.newNode({
          type: 'highlight',
          children: [
            manager.newNode({
              type: 'text',
              value: innerText,
            }),
          ],
        })]
        checkAddLeadingAndTrailingTextNode(replaceNodes, headText, tailText)
        manager.replaceCurrentNode(index, parent, replaceNodes)
        return null
      }
      // 只有一个==, 在当前节点的剩余兄弟中寻找下一个有==的文本节点；若找到，说明高亮节点内嵌套了其他节点；否则无高亮节点
      function onlyStartNode() {
        let nextValue, nextIndex, nextRegResult
        for (let i = index + 1; i < parent.children.length; i++) {
          const child = parent.children[i]
          // 中间含有不适我们允许的PhrasingContent, 则返回, 无法构成 highlight 节点
          if (!['text', 'break', 'delete', 'strong', 'emphasis'].includes(child.type)) {
            break
          }
          if (child.type === 'text') {
            nextRegResult = reg.exec(child.value) as RegExpExecArray & {
              indices: RegExpIndicesArray
            }
            if (!nextRegResult) continue
            nextValue = child.value
            nextIndex = i
            break
          }
        }
        // 没有闭合==，以普通文本节点处理
        if (!nextValue || !nextRegResult || !nextIndex) {
          return new Text(value)
        }
        // 有闭合，提取中间节点为高亮节点后代
        const headText = value.slice(0, start.indices[0][0])
        const innerHeadText = value.slice(start.indices[0][1])
        const innerTailText = nextValue.slice(0, nextRegResult.indices[0][0])
        const tailText = nextValue.slice(nextRegResult.indices[0][1])
        const children = parent.children.slice(index + 1, nextIndex) as PhrasingContent[]
        checkAddLeadingAndTrailingTextNode(children, innerHeadText, innerTailText)
        const replaceNodes: Et.MdastNodes[] = [
          manager.newNode({
            type: 'highlight',
            children,
          }),
        ]
        checkAddLeadingAndTrailingTextNode(replaceNodes, headText, tailText)
        manager.replaceCurrentNode(index, parent, replaceNodes, nextIndex - index + 1)
        return null
      }

      /** 通过字符串是否非空，判断是否插入开头或结尾文本节点 */
      function checkAddLeadingAndTrailingTextNode(arr: Et.MdastNodes[], headText: string, tailText: string) {
        if (headText) arr.unshift(manager.newNode({
          type: 'text',
          value: headText,
        }))
        if (tailText) arr.push(manager.newNode({
          type: 'text',
          value: tailText,
        }))
      }
    },
  }
}
export type EffitorMarkElementCtor = typeof EtMarkElement

/**
 * 创建一个mark节点；返回 该节点和其子#text节点, 该#text的内容为 零宽字符+data
 * * 若data 为空, 则会将该 mark 元素标记为临时
 */
export const createMarkNode = (markType: `${MarkType}`, data = ''): [EtMarkElement, Et.Text] => {
  const markEl = EtMarkElement.create(markType)
  const text = document.createTextNode(HtmlCharEnum.ZERO_WIDTH_SPACE + data) as Et.Text
  markEl.appendChild(text)
  // 没有data, 标记临时节点
  if (!data) {
    markEl.addCssClass(MarkStatus.MARKING)
  }
  return [markEl, text]
}
