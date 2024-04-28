import type * as Et from '../@types'
import type { EffectElement } from "../element";
import { BuiltinConfig, BuiltinElType, CmdTypeEnum, CssClassEnum, HtmlCharEnum } from "../@types/constant";
import { dom } from "../utils";


const caretToNextTextStart = (ctx: Et.EditorContext, effectEl: Et.EtElement, srcTr: StaticRange): boolean => {
    let next: Et.NullableNode = effectEl.nextSibling
    if (!next || next.nodeName === 'BR') {
        // 没有下一节点`or`下一节点是<br>, 插入零宽字符; 以解决mark节点定位到 节点外结尾无效的问题（会自动定位到内结尾）
        const zws = dom.zwsText()
        ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
            node: zws,
            insertAt: dom.caretStaticRangeOutNode(effectEl, 1),
            setCaret: true,
            targetRanges: [srcTr, dom.caretStaticRangeInNode(zws, 1)]
        })
        return true
    }
    next = dom.innermostEditableStartingNode(next)
    if (!dom.isTextNode(next)) {
        // 不是文本节点, 定位至开头
        dom.collapse(ctx.selection, next, 0)
    }
    else if (next.data[0] === HtmlCharEnum.ZERO_WIDTH_SPACE) {
        // 零宽字符开头
        dom.collapse(ctx.selection, next, 1)
    }
    else {
        // 插入零宽字符
        ctx.commandHandler.push(CmdTypeEnum.Insert_Text, {
            text: next,
            offset: 0,
            data: HtmlCharEnum.ZERO_WIDTH_SPACE,
            setCaret: true,
            targetRanges: [srcTr, dom.caretStaticRangeInNode(next, 1)]
        })
    }
    return true
}

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
    tabout(ctx) {
        // 上游已判定效应元素为richtext或component
        return caretToNextTextStart(ctx, ctx.effectElement, dom.staticFromRange(ctx.range))
    },
    dblSpace(ctx) {
        console.error('double space effect')
        // 上游未判断是否满足 双空格移动光标 的条件
        // 最外层样式节点
        let receiver: EffectElement | null = null
        let el = ctx.effectElement
        while (el.elType === BuiltinElType.RICHTEXT || el.elType === BuiltinElType.COMPONENT) {
            receiver = el
            el = el.parentElement as EffectElement
        }
        // 不满足条件, 退出
        if (!receiver) return false
        // 有文本节点且上一个字符为空格, 移除上一个空格
        const srcTr = dom.staticFromRange(ctx.range)
        if (ctx.node && ctx.node.data[ctx.range.startOffset - 1] === '\x20') {
            const delTr = new StaticRange({
                startContainer: ctx.node,
                startOffset: ctx.range.startOffset - 1,
                endContainer: ctx.node,
                endOffset: ctx.range.startOffset
            })
            ctx.commandHandler.push(CmdTypeEnum.Delete_Text, {
                data: '\x20',
                isBackward: true,
                deleteRange: delTr,
                targetRanges: [srcTr, delTr]
            })
        }
        // 寻找下一文本节点
        return caretToNextTextStart(ctx, receiver, srcTr)
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
                currP.classList.add(CssClassEnum.Heading)
                currP.setAttribute('contenteditable', 'plaintext-only')
            },
            undoCallback: () => {
                currP.effectBlocker = undefined
                currP.classList.remove(CssClassEnum.Heading)
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