import type { Effitor } from '../@types'
import { BuiltinElName, CssClassEnum } from "../@types";
import { dom } from "../utils";



let draggingEl: HTMLElement | null = null;
let draggingFragment: DocumentFragment | null = null;

/* -------------------------------------------------------------------------- */
/*                                    mouse                                   */
/* -------------------------------------------------------------------------- */

export const getMouseDownListener = (ctx: Effitor.Editor.Context) => {
    return (ev: MouseEvent) => {
        // 点击段落左侧段落符号
        if (dom.isEtParagraph(ev.target) && ev.offsetX < 0) {
            ev.target.setAttribute('draggable', 'true')
            // ctx.root?.querySelector(BuiltinElName.ET_BODY)?.removeAttribute('contenteditable')
        }
    }
}
export const getMouseUpListener = (ctx: Effitor.Editor.Context) => {
    // 若触发了拖拽, 则不会再触发mouseup
    return (ev: MouseEvent) => {
        // fixed #1
        // console.log('mouse up ------------------------- 更新ctx')
        // ev.shiftKey && ctx.forceUpdate()
        // ctx.root?.querySelector(BuiltinElName.ET_BODY)?.setAttribute('contenteditable', '')
    }
}
export const getClickListener = (ctx: Effitor.Editor.Context) => {
    return (ev: MouseEvent) => {

    }
}
export const getDblClickListener = (ctx: Effitor.Editor.Context) => {
    return (ev: MouseEvent) => {

    }
}


/* -------------------------------------------------------------------------- */
/*                                    drag                                    */
/* -------------------------------------------------------------------------- */

export const getDragStartListener = (ctx: Effitor.Editor.Context) => {
    // 拖拽文本选区时由selectionchange更新ctx, 拖拽元素节点时, 无需更新ctx
    return (ev: DragEvent) => {
        // console.error('drag start', ev)
        // 仅拖拽段落
        if (ctx.range.collapsed) {
            if (dom.isEtParagraph(ev.target)) {
                draggingEl = ev.target
                draggingEl.classList.add(CssClassEnum.Dragging)
            }
            else ev.preventDefault()
        }
        // 拖拽文本选区
        else {
            draggingFragment = ctx.range.cloneContents()
        }
    }
}
export const getDragListener = (ctx: Effitor.Editor.Context) => {
    return (ev: DragEvent) => {
        // console.log('drag ', ev)
    }
}
export const getDragEndListener = (ctx: Effitor.Editor.Context) => {
    return (ev: DragEvent) => {
        console.error('drag end', ev)
        ctx.root?.querySelector(BuiltinElName.ET_BODY)?.setAttribute('contenteditable', '')
        if (draggingEl) {
            draggingEl.removeAttribute('draggable')
            draggingEl.classList.remove(CssClassEnum.Dragging)
            draggingEl = null
        }
    }
}


/* -------------------------------------------------------------------------- */
/*                                    drop                                    */
/* -------------------------------------------------------------------------- */

export const getDragEnterListener = (ctx: Effitor.Editor.Context) => {
    return (ev: DragEvent) => {
        // console.error('drag enter', ev)
        if (dom.isEtParagraph(ev.target)) {
            ev.target.classList.add(CssClassEnum.Dragover)
        }
    }
}
export const getDragOverListener = (ctx: Effitor.Editor.Context) => {
    return (ev: DragEvent) => {
        if (draggingEl) {
            // 拖拽节点时drop target限制为段落
            if (dom.isEtParagraph(ev.target)) {
                ev.dataTransfer!.dropEffect = 'move'
                ev.preventDefault()
                return
            }
        }
        // 拖拽文本选区
        else if (draggingFragment) {
            // fixme 拖拽文本选区; shadow dom内暂无找到合适的解决方案  &Todo|2024.01.06/22:21
            ev.dataTransfer!.dropEffect = 'none'
            ev.preventDefault()
            return
        }
    }
}
export const getDragLeaveListener = (ctx: Effitor.Editor.Context) => {
    return (ev: DragEvent) => {
        // console.error('drag leave', ev)
        if (dom.isEtParagraph(ev.target)) {
            ev.target.classList.remove(CssClassEnum.Dragover)
        }
    }
}

export const getDropListener = (ctx: Effitor.Editor.Context) => {
    return (ev: DragEvent) => {
        console.error('drop ', ev)

        if (!dom.isEtParagraph(ev.target)) {
            return
        }
        ev.target.classList.remove(CssClassEnum.Dragover)

        // 拖拽节点
        if (draggingEl) {
            ev.preventDefault()
            ev.stopPropagation()

            if (ev.target === draggingEl) return
            const children = ev.target.parentElement?.children
            if (!children) return
            let index = -1
            for (let i = 0; i < children.length; i++) {
                if (children[i] === ev.target) {
                    index = i
                    break
                }
            }
            if (index === -1) return

            const caretRange = dom.caretStaticRangeInNode(draggingEl, 0)
            const removeAt = dom.caretStaticRangeOutNode(draggingEl, -1)
            ctx.commandHandler.push('Remove_Node', {
                node: draggingEl,
                removeAt,
                targetRanges: [caretRange, removeAt]
            })
            ctx.commandHandler.push('Insert_Node', {
                node: draggingEl,
                insertAt: dom.caretStaticRangeInNode(ev.target.parentElement, index),
                setCaret: true,
                targetRanges: [caretRange, caretRange]
            })
            ctx.commandHandler.handle()
        }
        // 拖拽选区; 在shadowRoot里边不会触发insertFromDrop的beforeinput事件 要手动发送
        /**
         * fixme 使用shadow dom无法支持选区文本拖拽
         *  1. shadow dom内部无法捕获insertFromDrop的beforeinput事件; 通过冒泡出去时, dataTransfer和getTargetRanges()返回值都被置空
         *  2. document.caretRangeFromPoint(x, y)无法获取到shadow dom内部的Range
         */
        else if (draggingFragment) {

            // ev.preventDefault()
            // ev.stopPropagation()

            // 获取拽入位置
            console.log('coord: ', ev.x, ev.y)
            // console.log(document.caretRangeFromPoint(ev.x, ev.y))   // @deprecated 且坐标位于shadow dom内时只能返回宿主
            console.log(ctx.root?.elementFromPoint(ev.x, ev.y), ev.offsetX, ev.offsetY)

            // ctx.root && dom.dispatchInputEvent(ctx.root, 'beforeinput', {
            //     inputType: 'insertFromDrop',
            //     data: dom.fragmentHTML(draggingFragment),

            // })
        }
        else {
            // 外来拖拽
        }
    }
}