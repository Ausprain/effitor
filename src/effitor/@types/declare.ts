import { InputTypeEnum, KeyboardCodeEnum, KeyboardKeyEnum, MIMETypeEnum } from "./constant";
import { Effitor } from "./export";

type DOMKeyboardEvent = KeyboardEvent
type DOMInputEvent = InputEvent
type DOMDataTransfer = DataTransfer
type DOMClipboardEvent = ClipboardEvent
type DOMShadowRoot = ShadowRoot
type DOMSelection = Selection

export type LowerLetter = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';
export type Prototype<C extends Function> = { constructor: C };
export type Prettify<T> = {
    [k in keyof T]: T[k]
} & {};

export declare namespace DOM {
    type HTMLNode = Text | HTMLElement;
    type NullableNode = Node | null;
    type NullableElement = HTMLElement | null;
    type NullableText = Text | null;
    type TextStaticRange = StaticRange & { endContainer: Text, startContainer: Text }

    type KeyboardCode = `${KeyboardCodeEnum}`;
    type KeyboardKey = `${KeyboardKeyEnum}`;
    type InputType = `${InputTypeEnum}`;

    type KeyboardEvent = DOMKeyboardEvent & {
        code: KeyboardCode
        key: KeyboardKey
    }
    type InputEvent = DOMInputEvent & {
        inputType: InputType;
    };
    type DataTransferFormat = `${MIMETypeEnum}`;
    type DataTransfer = DOMDataTransfer & {
        getData(format: DataTransferFormat): string;
        setData(format: DataTransferFormat, data: string): void;
    };
    type ClipboardEvent = DOMClipboardEvent & {
        clipboardData: DataTransfer;
    };

    type ShadowListenerMap = {
        keydown: (e: KeyboardEvent) => any;
        keyup: (e: KeyboardEvent) => any;
        beforeinput: (e: InputEvent) => any;
        input: (e: InputEvent) => any;
    };
    interface ShadowRoot extends DOMShadowRoot {
        addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (e: HTMLElementEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void;
        addEventListener<K extends keyof ShadowListenerMap>(type: K, listener: ShadowListenerMap[K], options?: boolean | AddEventListenerOptions): void;
        addEventListener<K extends keyof ShadowRootEventMap>(type: K, listener: (this: ShadowRoot, ev: ShadowRootEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
        addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
        getElementById(elementId: string): HTMLElement | null;
        getSelection?: () => Selection | null;
    }
    /**
     * [Selection](https://developer.mozilla.org/zh-CN/docs/Web/API/Selection)
     */
    type Selection = DOMSelection & {
        /**
         * [MDN Reference](https://developer.mozilla.org/zh-CN/docs/Web/API/Selection/modify)  
         * [Selection API W3C Working Draft 16 May 2023](https://www.w3.org/TR/selection-api/#dom-selection-modify)
         */
        modify(alter: "extend" | "move", direction: "forward" | "backward" | "left" | "right", granularity: "character" | "word" | "sentence" | "line" | "paragraph" | "lineboundary" | "sentenceboundary" | "paragraphboundary" | "documentboundary"): void;
    }
}

declare global {
    interface HTMLElementEventMap {
        keydown: DOM.KeyboardEvent;
        keyup: DOM.KeyboardEvent;
        beforeinput: DOM.InputEvent;
        input: DOM.InputEvent;
        copy: DOM.ClipboardEvent;
        cut: DOM.ClipboardEvent;
        paste: DOM.ClipboardEvent;
    }
    interface HTMLElement {
        readonly elType?: Effitor.Element.ElType;
        setAttribute<K extends keyof Effitor.Element.ElAttrs>(qualifiedName: K, value: Effitor.Element.ElAttrs[K]): void;
        setAttribute(qualifiedName: string, value: string): void;
        getAttribute<K extends keyof Effitor.Element.ElAttrs>(qualifiedName: K): Effitor.Element.ElAttrs[K];
        getAttribute(qualifiedName: string): string;
        removeAttribute<K extends keyof Effitor.Element.ElAttrs>(qualifiedName: K): void;
        removeAttribute(qualifiedName: string): void;
        addEventListener(type: 'beforeinput', listener: (ev: DOM.InputEvent) => any, options?: boolean | EventListenerOptions): void;
    }
    interface Document {
        createElement<K extends keyof Effitor.DefinedEtElementMap>(tagName: K): Effitor.DefinedEtElementMap[K];
        addEventListener(type: 'beforeinput', listener: (ev: DOM.InputEvent) => any, options?: boolean | EventListenerOptions): void;
    }
}
