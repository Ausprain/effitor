import type { Et } from "@/effitor";
import type { EtParagraphCtor } from "@/effitor/element";

export const enum CompCode {
    IMAGE = 1 << 0,
    LINK = 1 << 1,
    LIST = 1 << 2,
}

export interface EtComponent {
    code: CompCode,
    element: Et.EtElementCtor,
    /**
     * 组件注册回调
     * @param pCtor 段落元素构造器
     */
    registry?: (pCtor: EtParagraphCtor) => void
}

declare module '../../../effitor' {
    module Et {
        interface EffectHandlerDeclaration {
            /* -------------------------------------------------------------------------- */
            /*                                    挂到段落上                                   */
            /* -------------------------------------------------------------------------- */
            /**
             * 创建新的列表元素
             * @param ordered 是否有序
             * @param start 有序列表的初始序号
             */
            createList: (ctx: Et.EditorContext, ordered: boolean, start?: number) => Et.booleanvoid

            /* -------------------------------------------------------------------------- */
            /*                              挂到EtListElement上                              */
            /* -------------------------------------------------------------------------- */
            /**
             * 在当前li后边插入li
             * @param blank 无视光标位置，插入空白li
             */
            insertLi: (ctx: Et.EditorContext, currLi: HTMLLIElement, blank: boolean) => Et.booleanvoid
            /**
             * 末尾空li回车，删除该li并跳出列表
             */
            trimTail: (ctx: Et.EditorContext, currLi: HTMLLIElement) => Et.booleanvoid
        }
    }
}