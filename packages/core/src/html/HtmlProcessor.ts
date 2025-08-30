import { Et } from '../@types'
import { EffectElement } from '../element'
import { dom } from '../utils'
import { HtmlToEtElementTransformer, HtmlToEtElementTransformerMap } from './config'

type TransformersMap = Record<string, HtmlToEtElementTransformer[]>

export class HtmlProcessor {
  private readonly transformersMap: TransformersMap
  constructor(
    transformerMaps: HtmlToEtElementTransformerMap[],
  ) {
    this.transformersMap = {}
    for (const map of transformerMaps) {
      if (!map) {
        continue
      }
      for (const [elName, t] of Object.entries(map)) {
        if (!t) {
          continue
        }
        const arr = this.transformersMap[elName]
        if (arr) {
          arr.push(t as HtmlToEtElementTransformer)
        }
        else {
          this.transformersMap[elName] = [t as HtmlToEtElementTransformer]
        }
      }
    }
  }

  fromHtml(ctx: Et.EditorContext, html: string): Et.Fragment {
    const df = document.createDocumentFragment() as Et.Fragment
    const div = document.createElement('div')
    div.innerHTML = html
    let next = div.firstChild
    while (next) {
      // 复用节点
      next.remove()
      if (dom.isText(next)) {
        df.appendChild(next)
      }
      else if (dom.isElement(next)) {
        const res = this.#transformElement(ctx, next, null)
        if (res) {
          df.appendChild(res)
        }
      }
      next = div.firstChild
    }
    return df
  }

  #transformElement(ctx: Et.EditorContext, el: Element, parent: HTMLElement | null) {
    if (el.localName === 'svg') {
      return el
    }
    // TODO 过滤敏感及非法节点
    if (['script', 'html', 'head', 'meta', 'link', 'title', 'style'].includes(el.localName)) {
      return null
    }
    if (el instanceof HTMLElement) {
      const ts = this.transformersMap[el.localName]
      if (!ts) {
        return new Text(el.textContent ?? '')
      }
      for (const t of ts) {
        const res = t(el, ctx, parent)
        if (!res) {
          continue
        }
        if (typeof res === 'function') {
          return res()
        }
        if (dom.isFragment(res)) {
          return this.#transformChildNodes(ctx, el.childNodes, parent)
        }
        res.appendChild(this.#transformChildNodes(ctx, el.childNodes, res))
        return res
      }
      return new Text(el.textContent ?? '')
    }
    return null
  }

  #transformChildNodes(
    ctx: Et.EditorContext, childNodes: NodeListOf<ChildNode>, parent: HTMLElement | null) {
    const df = document.createDocumentFragment() as Et.Fragment
    let next = childNodes.item(0)
    while (next) {
      next.remove()
      if (dom.isText(next)) {
        df.appendChild(next)
      }
      else if (dom.isElement(next)) {
        const res = this.#transformElement(ctx, next, parent)
        if (res) {
          df.appendChild(res)
        }
      }
      next = childNodes.item(0)
    }
    return df
  }

  /**
   * 获取一个以目标效应元素为根的子树的原生 html 字符串,
   * 缺省时将输出整个编辑区子树(根节点et-body)
   */
  toHtml(ctx: Et.EditorContext, etel?: Et.EtElement): string
  /**
   * 获取一个片段对应的 html 字符串;
   * 若效应元素依赖 computedStyle 则从片段中提取转化的 html 元素将不带样式,
   * 因为片段中的元素计算样式为空
   */
  toHtml(ctx: Et.EditorContext, fragment: Et.Fragment): string
  /**
   * 获取一个目标选区对应的 html 字符串, 传入 null 则以当前选区为目标;
   * 当前选区 collapsed, 则返回空串
   */
  toHtml(ctx: Et.EditorContext, targetRange: Et.StaticRange | null): string
  toHtml(
    ctx: Et.EditorContext, target?: Et.EtElement | Et.Fragment | Et.StaticRange | null): string {
    let res
    if (target === void 0 || target instanceof EffectElement) {
      res = this.#parseEtElement(target ?? ctx.bodyEl)
    }
    else if (target instanceof DocumentFragment) {
      res = this.#parseFragment(target)
    }
    else {
      res = this.#parseTargetRange(ctx, target)
    }
    if (typeof res === 'string') {
      return res
    }
    if (dom.isFragment(res)) {
      return dom.fragmentToHTML(res)
    }
    return res.outerHTML
  }

  #parseElement(el: Element) {
    if (dom.isEtElement(el)) {
      return this.#parseEtElement(el)
    }
    // TODO 过滤敏感节点
    if (['script'].includes(el.localName)) {
      return null
    }
    const clone = el.cloneNode(false) as Element
    clone.appendChild(this.#parseChildNodes(el.childNodes))
    return clone
  }

  #parseEtElement(etel: Et.EtElement) {
    const native = etel.toNativeElement()
    if (!native) {
      return document.createDocumentFragment() as Et.Fragment
    }
    if (typeof native === 'function') {
      return native()
    }
    native.appendChild(this.#parseChildNodes(etel.childNodes))
    return native
  }

  #parseChildNodes(childNodes: NodeListOf<Node>) {
    const df = document.createDocumentFragment() as Et.Fragment
    let next = childNodes.item(0) as Et.NodeOrNull
    while (next) {
      if (dom.isElement(next)) {
        const res = this.#parseElement(next)
        if (res) {
          df.appendChild(res)
        }
      }
      else if (dom.isText(next)) {
        df.appendChild(next.cloneNode(false))
      }
      next = next.nextSibling
    }
    return df
  }

  #parseFragment(fragment: Et.Fragment) {
    return this.#parseChildNodes(fragment.childNodes)
  }

  #parseTargetRange(ctx: Et.EditorContext, sr: Et.StaticRange | null) {
    if (!sr) {
      sr = ctx.selection.range
      if (!sr) {
        return ''
      }
    }
    else if (!ctx.selection.isValidRange(sr)) {
      return ''
    }
    return this.#parseRangingContentsToHtml(ctx, sr)
  }

  #parseRangingContentsToHtml(ctx: Et.EditorContext, sr: Et.StaticRange) {
    const range = ctx.selection.createTargetRange(
      sr.startContainer, sr.startOffset,
      sr.endContainer, sr.endOffset,
    )
    if (!range) {
      return ''
    }
    const df = document.createDocumentFragment()
    // 完全选择节点, 直接转 html,
    const { startAncestor, endAncestor } = range
    if (!startAncestor || !endAncestor) {
      return ''
    }
    if (startAncestor !== endAncestor) {
      let next = startAncestor.nextSibling
      while (next && next !== endAncestor) {
        if (dom.isElement(next)) {
          const res = this.#parseElement(next)
          if (res) {
            df.appendChild(res)
          }
        }
        else if (dom.isText(next)) {
          df.appendChild(next.cloneNode(false))
        }
        next = next.nextSibling
      }
    }
    // 部分选择节点, 克隆插入 orphanBody 再转 html
    const orphanBody = ctx.schema.body.create()
    Object.assign(orphanBody.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      transform: 'translate3d(-110%, -110%, 0)',
    } as CSSStyleDeclaration)
    ctx.root.appendChild(orphanBody)

    // 克隆部分选择内容
    const r = document.createRange()
    r.setStart(range.startNode, range.startOffset)
    r.setEndAfter(startAncestor)
    const df1 = r.cloneContents()
    r.setStartBefore(endAncestor)
    r.setEnd(range.endNode, range.endOffset)
    const df2 = r.cloneContents()

    orphanBody.appendChild(df1)
    df.prepend(this.#parseChildNodes(orphanBody.childNodes))
    orphanBody.textContent = ''
    orphanBody.appendChild(df2)
    df.appendChild(this.#parseChildNodes(orphanBody.childNodes))
    orphanBody.remove()
    return dom.fragmentToHTML(df)
  }
}
