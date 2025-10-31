import type { Et } from '../@types'

export interface HtmlToEtElementTransformer<T extends HTMLElement = HTMLElement> {
  /**
   * 定义一个html元素如何转为效应元素; 若最终未处理, 则会转为纯文本
   * @param parent 未来父节点(这是只读的), 当前父节点可通过 el.parentNode 取得
   * @returns
   * - `null`, 处理"失败", 交由下一个插件
   * - `EffectElement`, 处理成功, 使用该效应元素替换当前 html 元素, 并终止后续插件对该节点的转换
   * - `DocumentFragment`, 处理成功, 但该 html 元素不对应具体的效应元素, 仍需处理其后代; 即丢弃
   *   该 html 节点, 直接转换其子节点然后插入 parent 中
   * - `()=>EffectElement`, 处理成功, 并接管后代处理, 即当前 html 节点及其后代转换为以该返回函数
   *   返回的效应元素为根的子树
   */
  (
    el: T,
    ctx: Et.EditorContext,
    parent: Readonly<Element> | null): Et.EtElement | null | Et.Fragment | (() => Et.EtElement)
}

export type HtmlToEtElementTransformerMap = {
  [k in keyof HTMLElementTagNameMap]?: HtmlToEtElementTransformer<HTMLElementTagNameMap[k]>
}

export interface HtmlProcessorOptions {
  /** 自定义 HTML 过滤规则 */
  sanitizer?: (html: string) => string
}
