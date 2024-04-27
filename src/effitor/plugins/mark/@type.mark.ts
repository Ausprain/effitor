import type { EtMarkElement } from "./element";
export const enum MarkEnum {
    ElName = 'et-mark'
}
// export const MarkElName = 'et-mark';
// export const MarkElName = MarkEnum.ElName;
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
}

declare module '@/effitor/@types' {

    namespace Effitor {
        interface DefinedEtElementMap {
            [MarkEnum.ElName]: EtMarkElement
        }
        interface EffectHandlerDeclaration {
            /* -------------------------------------------------------------------------- */
            /*                              挂到EffectElement上                              */
            /* -------------------------------------------------------------------------- */
            /** 插入标记符节点 */
            insertMarkNode: (ctx: Effitor.Editor.Context, markType: MarkType) => boolean | void
            /** 将选区转为mark节点 */
            formatMark: (ctx: Effitor.Editor.Context, markType: MarkType) => boolean | void
            /** 
             * 处理零宽字符（\u200b）的删除及其副作用, 三种情况   
             * ```html
             * 段落/换行头:  \u200bIxxx<et-mark>
             * 标记节点头: aaa<et-mark>\u200bIxxx</et-mark>
             * 标记节点后: <et-mark>\u200baaa</et-mark>\u200bIxxx
             * ```
             */
            // deleteZeroWidthSpaceForMark: (ctx: Effitor.Editor.Context, isBackward: boolean) => boolean

            /* -------------------------------------------------------------------------- */
            /*                              挂到EtMarkElement上                              */
            /* -------------------------------------------------------------------------- */
            /** 按下tab跳到标记节点的下一个#text开头, 若以zws开头则顺移 */
            tabToNextText: (ctx: Effitor.Editor.Context) => boolean
            /** 撤销临时节点, 并插入该节点对应的标记字符 */
            regressToMarkChar: (ctx: Effitor.Editor.Context, markType: MarkType) => boolean
            /** 移除标记节点, 插回文本 */
            unformatMark: (ctx: Effitor.Editor.Context) => boolean
            /** 标记节点内末尾Delete, 删除标记节点, 并将前标记字符与内容插回 */
            // deleteAtMarkEnd: (ctx: Effitor.Editor.Context) => boolean
        }
    }
}
