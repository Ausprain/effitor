/* eslint-disable @stylistic/max-len */
import type { Effitor } from '../editor/Effitor'
import type { EtEditorElement, EtParagraph } from '../element'
import { EtCodeTarget } from '../element/config'
import type { EffectElement, EffectElementCtor } from '../element/EffectElement'
import { MIMETypeEnum } from '../enums'
/* -------------------------------------------------------------------------- */
/*                                 编辑器内容                                  */
/* -------------------------------------------------------------------------- */
export type EditorRoot = ShadowRoot | EtEditorElement
/** 编辑器别名 */
export type Editor = Effitor
/** 效应元素类型别名 */
export type EtElement = EffectElement
export type EtElementCtor = EffectElementCtor
/** 段落类型别名 */
export type Paragraph = EtParagraph
export type ParagraphCtor = typeof EtParagraph

/** 编辑器内允许的元素, 暂不考虑 MathMLElement */
export type Element = HTMLElement | SVGElement
export type Node = Text | Element
export type HTMLNode = Text | HTMLElement
export type TextOrNull = Text | null
export type NodeOrNull = Node | null
export type HTMLNodeOrNull = HTMLNode | null
export type HTMLElementOrNull = HTMLElement | null

/**
 * 自定义EtElement设置属性
 * @expendable
 */
export interface ElAttrs {
  part: string
  href: string
  contenteditable: 'plaintext-only' | 'false' | '' | 'true'
  draggable: 'true' | 'false'
}

export interface HTMLElement extends globalThis.HTMLElement, EtCodeTarget {
  readonly localName: string
  textContent: string
  readonly parentNode: HTMLElement | null
  readonly parentElement: HTMLElement | null
  readonly childNodes: NodeListOf<Node>
  readonly firstChild: Node | null
  readonly lastChild: Node | null
  readonly firstElementChild: Element | null
  readonly lastElementChild: Element | null
  readonly nextSibling: Node | null
  readonly previousSibling: Node | null
  readonly nextElementSibling: Element | null
  readonly previousElementSibling: Element | null
  readonly cloneNode: (deep?: boolean) => HTMLElement
  addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void
}
export interface SVGElement extends globalThis.SVGElement {
  readonly localName: string
  textContent: string
  readonly parentNode: Element | null
  readonly parentElement: HTMLElement | null
  readonly childNodes: NodeListOf<SVGElement>
  readonly firstChild: SVGElement | null
  readonly lastChild: SVGElement | null
  readonly firstElementChild: SVGElement | null
  readonly lastElementChild: SVGElement | null
  readonly nextSibling: SVGElement | null
  readonly previousSibling: SVGElement | null
  readonly nextElementSibling: SVGElement | null
  readonly previousElementSibling: SVGElement | null
  readonly cloneNode: (deep?: boolean) => SVGElement
}
export interface Text extends globalThis.Text {
  readonly localName: ''
  textContent: never
  readonly parentNode: HTMLElement | null
  readonly parentElement: HTMLElement | null
  readonly childNodes: NodeListOf<never>
  readonly firstChild: null
  readonly lastChild: null
  readonly firstElementChild: null
  readonly lastElementChild: null
  readonly nextSibling: Node | null
  readonly previousSibling: Node | null
  readonly nextElementSibling: Element | null
  readonly previousElementSibling: Element | null
  readonly cloneNode: (deep?: boolean) => Text
}
export interface Fragment extends globalThis.DocumentFragment {
  readonly textContent: string
  readonly parentNode: null
  readonly parentElement: null
  readonly childNodes: NodeListOf<Node>
  readonly firstChild: Node | null
  readonly lastChild: Node | null
  readonly firstElementChild: Element | null
  readonly lastElementChild: Element | null
  readonly nextSibling: null
  readonly previousSibling: null
  readonly nextElementSibling: null
  readonly previousElementSibling: null
  readonly cloneNode: (deep?: boolean) => Fragment
}
export interface AbstractRange {
  readonly startContainer: Node
  readonly startOffset: number
  readonly endContainer: Node
  readonly endOffset: number
}
export interface StaticRange extends globalThis.StaticRange {
  readonly startContainer: HTMLNode
  readonly endContainer: HTMLNode
}
export interface Range extends globalThis.Range {
  readonly commonAncestorContainer: HTMLNode
  readonly startContainer: HTMLNode
  readonly endContainer: HTMLNode
  extractContents(): Fragment
  cloneContents(): Fragment
  cloneRange(): Range
  createContextualFragment(html: string): Fragment
}

/* -------------------------------------------------------------------------- */
/*                                  DOM 类型增强                               */
/* -------------------------------------------------------------------------- */

export type KeyboardCode = `${KeyboardCodeEnum}`
export type KeyboardKey = `${KeyboardKeyEnum}`
export type InputType = `${InputTypeEnum}`

export interface MouseEvent extends globalThis.MouseEvent {
  readonly target: NodeOrNull
}
export interface KeyboardEvent extends globalThis.KeyboardEvent {
  readonly code: KeyboardCode
  readonly key: KeyboardKey
  readonly target: HTMLElement
}
export interface InputEvent extends globalThis.InputEvent {
  readonly inputType: InputType
  readonly target: HTMLElement
}
export interface ClipboardEvent extends globalThis.ClipboardEvent {
  readonly clipboardData: DataTransfer
}
export type DataTransferFormat = `${MIMETypeEnum}`
export interface DataTransfer extends globalThis.DataTransfer {
  readonly types: readonly DataTransferFormat[]
  getData(format: DataTransferFormat): string
  setData(format: DataTransferFormat, data: string): void
}
export interface HTMLElementEventMap extends globalThis.HTMLElementEventMap {
  keydown: KeyboardEvent
  keyup: KeyboardEvent
  beforeinput: InputEvent
  input: InputEvent
  copy: ClipboardEvent
  cut: ClipboardEvent
  paste: ClipboardEvent
}
export interface ShadowListenerMap {
  keydown: (e: KeyboardEvent) => void
  keyup: (e: KeyboardEvent) => void
  beforeinput: (e: InputEvent) => void
  input: (e: InputEvent) => void
}
export interface ShadowRoot extends globalThis.ShadowRoot {
  addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (e: HTMLElementEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void
  addEventListener<K extends keyof ShadowListenerMap>(type: K, listener: ShadowListenerMap[K], options?: boolean | AddEventListenerOptions): void
  addEventListener<K extends keyof ShadowRootEventMap>(type: K, listener: (this: ShadowRoot, ev: ShadowRootEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void
  getElementById(elementId: string): HTMLElement | null
  getSelection?(): Selection | null
}
