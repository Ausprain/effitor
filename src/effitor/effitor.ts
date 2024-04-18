import { BuiltinElName, type Et } from './@types';
import { getMainEffector } from "./effector";
import { getBeforeinputListener } from './effector/beforeinput';
import { getCopyListener, getCutListener, getPasteListener } from "./effector/clipboard";
import { getCompositionEnd, getCompositionStart, getCompositionUpdate } from './effector/composition';
import { getClickListener, getDblClickListener, getDragEndListener, getDragEnterListener, getDragLeaveListener, getDragListener, getDragOverListener, getDragStartListener, getDropListener, getMouseDownListener, getMouseUpListener } from './effector/mouse';
import { getInputListener } from './effector/input';
import { getKeydownListener } from './effector/keydown';
import { getKeyupListener } from './effector/keyup';
import { getSelectionChangeListener } from './effector/selchange';
import { builtinEl, registerEtElement, type EffectElementCtor } from "./element";
import { cssStyle2cssText } from "./utils";
import { initContext } from './context';
import { useUndoEffector } from './plugins/undo';
import { defaultConfig, shadowCssText } from './config';

/** 格式化容器div为Effitor初始化结构 */
const formatEffitorStructure = (el: HTMLDivElement, ctx: Et.EditorContext, cssText: string) => {
    const editor = document.createElement(BuiltinElName.ET_APP)
    // 在editor下创建一个shadowRoot
    const shadow = editor.attachShadow({ mode: 'open' })
    const body = document.createElement(BuiltinElName.ET_BODY)
    const p = document.createElement(ctx.schema.paragraph.elName)
    p.append(document.createElement('br'))
    body.append(p)

    requestAnimationFrame(() => {
        const sheet = new CSSStyleSheet()
        sheet.replaceSync(shadowCssText + cssText)
        shadow.adoptedStyleSheets = [sheet]
        // sheet.replace(cssText).then(() => {
        // shadow.adoptedStyleSheets = [sheet]
        // shadow.append(editor)
        // })
        // 清空el并挂载editor
        el.innerHTML = ''
        el.append(editor)
        // 将editor的所有子节点放到shadow下(在body之前, 如编辑栏之类（用户自定义connectedCallback回调在editor挂在到dom上时插入的）; 
        shadow.append(...editor.childNodes)
        shadow.append(body)
    })

    return shadow as Et.EtShadow
}

const reducePlugins = (plugins: Et.EffitorPlugin[], elCtors: EffectElementCtor[], ctx: Et.EditorContext): Et.EffectorConfigs => {
    return plugins.reduce((pre, cur) => {
        cur.elements && pre.etElementCtors.push(...cur.elements)
        const ef = cur.effector
        for (const k in ef) {
            if ((pre as any)[k + 's']) {
                (pre as any)[k + 's'].push((ef as any)[k])
            }
        }
        cur.registry?.(ctx)
        return pre
    }, {
        etElementCtors: elCtors,
        keydownSolvers: [],
        keyupSolvers: [],
        beforeInputSolvers: [],
        afterInputSolvers: [],
        htmlEventSolvers: [],

        copyCallbacks: [],
        pasteCallbacks: [],
        selChangeCallbacks: [],
    } as Et.EffectorConfigs)
}
const initListeners = (ctx: Et.EditorContext, mainEffector: Et.MainEffector, pluginConfigs: Et.EffectorConfigs): { [k in keyof HTMLElementEventMap]?: (ev: HTMLElementEventMap[k]) => void } => ({
    keydown: getKeydownListener(ctx, mainEffector.keydownSolver, pluginConfigs.keydownSolvers),
    keyup: getKeyupListener(ctx, mainEffector.keyupSolver, pluginConfigs.keyupSolvers),
    beforeinput: getBeforeinputListener(ctx, mainEffector.beforeInputSolver, pluginConfigs.beforeInputSolvers),
    input: getInputListener(ctx, mainEffector.afterInputSolver, pluginConfigs.afterInputSolvers),  //? GlobalEventHandlersEventMap为什么input事件对象是Event而非InputEvent
    compositionstart: getCompositionStart(ctx),
    compositionupdate: getCompositionUpdate(ctx),
    compositionend: getCompositionEnd(ctx),

    copy: getCopyListener(ctx, pluginConfigs.copyCallbacks),
    cut: getCutListener(ctx, pluginConfigs.copyCallbacks),
    paste: getPasteListener(ctx, pluginConfigs.pasteCallbacks),

    mousedown: getMouseDownListener(ctx),
    mouseup: getMouseUpListener(ctx),
    click: getClickListener(ctx),
    dblclick: getDblClickListener(ctx),

    dragstart: getDragStartListener(ctx),
    drag: getDragListener(ctx),
    dragend: getDragEndListener(ctx),
    dragenter: getDragEnterListener(ctx),
    dragover: getDragOverListener(ctx),
    dragleave: getDragLeaveListener(ctx),
    drop: getDropListener(ctx),

    selectionchange: getSelectionChangeListener(ctx, pluginConfigs.selChangeCallbacks),

})
const addListenersToShadowRoot = (ctx: Et.EditorContext, el: HTMLDivElement, root: Et.EtShadow, listeners: ReturnType<typeof initListeners>, ac: AbortController, htmlEventSolvers: Et.HTMLEventSolver[]) => {
    // 绑在shadowRoot上
    root.addEventListener('focusin', () => {
        console.error('focus ')
        // 编辑器聚焦时绑定上下文
        ctx.el = el
        ctx.root = root
        ctx.body = root.querySelector(ctx.schema.body.elName)!

        const sel = ctx.selection || (ctx.root.getSelection ? ctx.root.getSelection() : getSelection())
        if (sel?.rangeCount) {
            const r = sel.getRangeAt(0)
            sel.removeAllRanges()
            sel.addRange(r)
        }

        // 注册selectionchange
        document.addEventListener('selectionchange', listeners.selectionchange!, { signal: ac.signal })
    }, { signal: ac.signal })
    root.addEventListener('focusout', () => {
        console.error('blur ')
        // ctx.focused = false
        // ctx.paragraphEl?.classList.remove(Et.CssClass.Active)
        // ctx.paragraphEl = null as any
        // ctx.effectElement = null as any
        // ctx.range = null as any
        ctx.node = null   // 必须置空, 否则重新focus原来位置时会以为光标没动而不更新effectElement
        // 解绑selectionchange
        document.removeEventListener('selectionchange', listeners.selectionchange!)
    }, { signal: ac.signal })

    root.addEventListener('keydown', listeners.keydown!, { signal: ac.signal })
    root.addEventListener('keyup', listeners.keyup!, { signal: ac.signal })
    // wran. shadow dom内不会捕获isTrusted=true 的 inputType='insertFromDrop' 的 beforeinput事件
    root.addEventListener('beforeinput', listeners.beforeinput!, { signal: ac.signal })
    root.addEventListener('input', listeners.input!, { signal: ac.signal })

    root.addEventListener('compositionstart', listeners.compositionstart!, { signal: ac.signal })
    root.addEventListener('compositionupdate', listeners.compositionupdate!, { signal: ac.signal })
    root.addEventListener('compositionend', listeners.compositionend!, { signal: ac.signal })

    root.addEventListener('copy', listeners.copy!, { signal: ac.signal })
    root.addEventListener('cut', listeners.cut!, { signal: ac.signal })
    root.addEventListener('paste', listeners.paste!, { signal: ac.signal })

    root.addEventListener('mousedown', listeners.mousedown!, { signal: ac.signal })
    root.addEventListener('mouseup', listeners.mouseup!, { signal: ac.signal })
    root.addEventListener('click', listeners.click!, { signal: ac.signal })
    root.addEventListener('dblclick', listeners.dblclick!, { signal: ac.signal })

    root.addEventListener('dragstart', listeners.dragstart!, { signal: ac.signal })
    root.addEventListener('drag', listeners.drag!, { signal: ac.signal })
    root.addEventListener('dragend', listeners.dragend!, { signal: ac.signal })
    root.addEventListener('dragenter', listeners.dragenter!, { signal: ac.signal })
    root.addEventListener('dragover', listeners.dragover!, { signal: ac.signal })
    root.addEventListener('dragleave', listeners.dragleave!, { signal: ac.signal })
    root.addEventListener('drop', listeners.drop!, { signal: ac.signal })

    // 为插件绑定其他监听器
    htmlEventSolvers.forEach(htmlEventListeners => {
        for (const [name, fn] of Object.entries(htmlEventListeners)) {
            root.addEventListener(name, e => fn(e as any, ctx), { signal: ac.signal })
        }
    })
}

/**
 * 绑定的元素map, 对应绑定事件监听器的signal控制器, unmount时abort以自动清除绑定的监听器
 */
const elMap = new WeakMap<HTMLDivElement, AbortController>()

/**
 * 创建一个编辑器对象
 */
export const createEditor = ({
    schemaInit = {},
    mainEffector = getMainEffector(),
    undoEffector = undefined,
    plugins = [],
    config = {},
}: Et.CreateEditorOptions = {}): Et.Editor => {
    const _config = { ...defaultConfig, ...config }
    if (!undoEffector) undoEffector = useUndoEffector(_config.UNDO_LENGTH)
    plugins.push({ effector: undoEffector })
    const schema: Et.EditorSchema = {
        editor: builtinEl.EtEditorElement,
        body: builtinEl.EtBodyElement,
        paragraph: builtinEl.EtParagraphElement,
        ...schemaInit,
    }
    /** 初始化编辑器上下文 */
    const context = initContext(schema, _config, undoEffector.commandUndoHandler)
    // 记录需要注册的EtElement
    const elCtors: EffectElementCtor[] = Object.values(schema)
    /** 从plugins中提取出effector对应处理器 及 自定义元素 */
    const pluginConfigs = reducePlugins(plugins, elCtors, context)
    /** 编辑器事件监听器 */
    const listeners = initListeners(context, mainEffector, pluginConfigs)
    // 注册EtElement 并获取内联样式
    const allCssText = elCtors.reduce<string[]>((css, ctor) => {
        registerEtElement(ctor)
        css.push(
            ctor.cssStyle === undefined
                ? ctor.cssText
                : ctor.cssText + '\n' + cssStyle2cssText(ctor.cssStyle, ctor.elName)
        )
        return css
    }, []).join('\n')


    return {
        /**
         * 给编辑器挂载一个div时执行
         */
        mount(el) {
            console.error('mount el: ', el)
            if (elMap.has(el)) {
                return
            }
            const root = formatEffitorStructure(el, context, allCssText)
            const ac = new AbortController()
            elMap.set(el, ac)

            addListenersToShadowRoot(context, el, root, listeners, ac, pluginConfigs.htmlEventSolvers)

            plugins.forEach((plugin) => {
                plugin.effector.mounted?.(el, context)
            })
        },
        /**
         * 卸载一个div时执行
         */
        unmount(el) {
            if (elMap.has(el)) {
                plugins.forEach((plugin) => {
                    plugin.effector.beforeUnmount?.(el, context)
                })
                // abort signal自动清除绑定的监听器
                elMap.get(el)?.abort()
                elMap.delete(el);
                el.innerHTML = ''
            }
        },
    }
}


