import { InputTypeEnum, KeyboardCodeEnum, KeyboardKeyEnum, MIMETypeEnum } from "./constant";

type DOMKeyboardEvent = KeyboardEvent
type DOMInputEvent = InputEvent
type DOMDataTransfer = DataTransfer
type DOMClipboardEvent = ClipboardEvent
type DOMShadowRoot = ShadowRoot

export declare namespace DOM {

    type KeyboardCode = `${KeyboardCodeEnum}`;
    type KeyboardKey = `${KeyboardKeyEnum}`;
    type InputType = `${InputTypeEnum}`;

    type KeyboardEvent = DOMKeyboardEvent & {
        readonly code: KeyboardCode
        readonly key: KeyboardKey
    }
    type InputEvent = DOMInputEvent & {
        readonly inputType: InputType;
    };
    type DataTransferFormat = `${MIMETypeEnum}`;
    type DataTransfer = DOMDataTransfer & {
        getData(format: DataTransferFormat): string;
        setData(format: DataTransferFormat, data: string): void;
    };
    type ClipboardEvent = DOMClipboardEvent & {
        readonly clipboardData: DataTransfer;
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
}