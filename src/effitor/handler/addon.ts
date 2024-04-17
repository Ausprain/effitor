import { BuiltinConfig, BuiltinElType, Et, HtmlChar } from "../@types";
import type { EffectElement } from "../element";
import { dom } from "../utils";



export const addonHandler: Partial<Et.EffectHandlerDeclaration> = {
    replaceText(ctx, data, textRange, setCaret = false) {
        if (!data) {
            return false;
        }
        const text = textRange.startContainer
        const replacedData = text.data.slice(textRange.startOffset, textRange.endOffset);
        ctx.commandHandler.push('Replace_Text', {
            text,
            offset: textRange.startOffset,
            data,
            replacedData,
            setCaret,
            targetRanges: [
                dom.staticFromRange(ctx.range),
                dom.caretStaticRangeInNode(text, textRange.startOffset + data.length)
            ],
        })
        return true
    },
    dblSpace(ctx) {
        // console.error('double space effect')
        let receiver: EffectElement | null = null
        let el = ctx.effectElement
        while (el.elType === BuiltinElType.RICHTEXT || el.elType === BuiltinElType.COMPONENT) {
            receiver = el
            el = el.parentElement as EffectElement
            if (!dom.isEtElement(el)) break
        }
        if (receiver) {
            if (ctx.node && ctx.node.data[ctx.range.startOffset - 1] === '\x20') {
                const srcTr = dom.staticFromRange(ctx.range)
                ctx.commandHandler.push('Delete_Text', {
                    data: '\x20',
                    isBackward: true,
                    deleteRange: new StaticRange({
                        startContainer: ctx.node,
                        startOffset: ctx.range.startOffset - 1,
                        endContainer: ctx.node,
                        endOffset: ctx.range.startOffset
                    }),
                    targetRanges: [srcTr, srcTr]
                })
                ctx.commandHandler.handle()
            }
            const next = receiver.nextSibling
            // 下一节点是#text则定位到下一节点开头, 用以处理mark节点定位到 节点外结尾无效的问题（会自动定位到内结尾）
            if (dom.isTextNode(next)) {
                const offset = next.data[0] === HtmlChar.ZERO_WIDTH_SPACE ? 1 : 0
                dom.collapse(ctx.selection, next, offset)
            }
            else {
                dom.collapse(ctx.selection, receiver, Infinity)
            }
            return true
        }
    },
    atxHeading(ctx) {
        if (!ctx.node) throw Error('没有文本节点')
        const currP = ctx.paragraphEl
        ctx.commandHandler.push('Remove_Node', {
            node: ctx.node,
            removeAt: dom.caretStaticRangeOutNode(ctx.node, -1),
            setCaret: true,
            targetRanges: [dom.staticFromRange(ctx.range), dom.caretStaticRangeInNode(ctx.paragraphEl, 0)],

            redoCallback: () => {
                currP.effectBlocker = onlyBuiltinEffectBlocker
                currP.classList.add(Et.CssClass.Heading)
                currP.setAttribute('contenteditable', 'plaintext-only')
            },
            undoCallback: () => {
                currP.effectBlocker = undefined
                currP.classList.remove(Et.CssClass.Heading)
                currP.setAttribute('contenteditable', '')
            }
        })
        return true
    },
}

/**
 * 赋值给EffectElement的 effectBlocker属性上, 用于过滤希望阻止的效应
 */
const onlyBuiltinEffectBlocker = (e: string) => {
    // console.error('effect blocker: ', e, 'blocked:', !e.startsWith(Et.Const.BUILTIN_EFFECT_PREFFIX))
    if (e.startsWith(BuiltinConfig.BUILTIN_EFFECT_PREFFIX)) return false
    // 非内置效应 返回true 阻止效应
    return true
}