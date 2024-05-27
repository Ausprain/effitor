import type * as Et from './@types';
import { BuiltinElName } from './@types/constant';
import { getMainEffector } from "./effector";
import { getBeforeinputListener } from './effector/beforeinput';
import { getCopyListener, getCutListener, getPasteListener } from "./effector/clipboard";
import { getCompositionEnd, getCompositionStart, getCompositionUpdate } from './effector/composition';
import { getClickListener, getDblClickListener, getDragEndListener, getDragEnterListener, getDragLeaveListener, getDragListener, getDragOverListener, getDragStartListener, getDropListener, getMouseDownListener, getMouseUpListener } from './effector/mouse';
import { getInputListener } from './effector/input';
import { getKeydownListener } from './effector/keydown';
import { getKeyupListener } from './effector/keyup';
import { getSelectionChangeListener } from './effector/selchange';
import { EtBodyElement, EtEditorElement, EtParagraphElement, registerEtElement, type EffectElementCtor } from "./element";
import { cssStyle2cssText, dom } from "./utils";
import { initContext } from './context';
import { defaultConfig, shadowCssText } from './config';
import { useUndoEffector } from './handler/undo';

/** 格式化容器div为Effitor初始化结构 */
const formatEffitorStructure = (el: HTMLDivElement, ctx: Et.EditorContext, cssText: string, customStyleUrls: string[]) => {
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
        // link 入自定义样式文件
        for (const url of customStyleUrls) {
            if (!url) continue
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = url
            shadow.append(link)
        }
        // 将editor的所有子节点放到shadow下(在body之前, 如编辑栏之类（用户自定义connectedCallback回调在editor挂在到dom上时插入的）; 
        shadow.append(...editor.childNodes)
        shadow.append(body)
    })

    return shadow as Et.ShadowRoot
}

type PluginConfigs = {
    /** 自定义元素, 统一注册到customElements */
    readonly etElementCtors: Et.EtElementCtor[];
} & {
    [K in keyof Et.Solvers as `${K}s`]: Et.Solvers[K][];
};
const reducePlugins = (plugins: Et.EditorPlugin[], elCtors: EffectElementCtor[], ctx: Et.EditorContext): PluginConfigs => {
    const pSet = new Set<Et.EditorPlugin['name']>()
    return plugins.reduce((pre, cur) => {
        if (pSet.has(cur.name)) {
            console.warn(`Duplicate plug-in named '${cur.name}'.`)
            return pre
        }
        pSet.add(cur.name)

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
    } as PluginConfigs)
}
const initListeners = (ctx: Et.EditorContext, mainEffector: Et.MainEffector, pluginConfigs: PluginConfigs): { [k in keyof HTMLElementEventMap]?: (ev: HTMLElementEventMap[k]) => void } => ({
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
const addListenersToShadowRoot = (ctx: Et.EditorContext, el: HTMLDivElement, root: Et.ShadowRoot, listeners: ReturnType<typeof initListeners>, ac: AbortController, htmlEventSolvers: Et.HTMLEventSolver[]) => {
    // 绑在shadowRoot上
    root.addEventListener('focusin', () => {
        console.error('focus ')
        // 编辑器聚焦时绑定上下文
        ctx.el = el
        ctx.root = root
        ctx.body = root.querySelector(ctx.schema.body.elName)!

        // const sel = ctx.selection || (ctx.root.getSelection ? ctx.root.getSelection() : getSelection())
        // fixme 这里手动刷新selection的用意? 
        // if (sel?.rangeCount) {
        //     const r = sel.getRangeAt(0)
        //     sel.removeAllRanges()
        //     sel.addRange(r)
        // }
        // 注册selectionchange
        document.addEventListener('selectionchange', listeners.selectionchange!, { signal: ac.signal })
    }, { signal: ac.signal })
    root.addEventListener('focusout', () => {
        console.error('blur ')
        ctx.el = null as any   // 通过el是否为空来判断光标是否聚焦编辑器内
        // ctx.focused = false
        // ctx.paragraphEl?.classList.remove(CssClassEnum.Active)
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
const elMap = new WeakMap<HTMLDivElement, {
    ac: AbortController,
    root: Et.ShadowRoot,
}>()

/**
 * 创建一个编辑器对象
 */
export const createEditor = ({
    schemaInit = {},
    mainEffector = getMainEffector(),
    plugins = [],
    config = {},
    customStyleUrls = [''],
}: Et.CreateEditorOptions = {}): Et.Editor => {
    // 先初始化编辑器对象, 让插件可以扩展编辑器
    const _editor: Et.Editor = {} as Et.Editor
    const _config = { ...defaultConfig, ...config }
    const undoEffector = useUndoEffector(_config.UNDO_LENGTH)
    // undoEffector应放在首位
    plugins.unshift({ name: 'undo', effector: undoEffector })
    const schema: Et.EditorSchema = {
        editor: EtEditorElement,
        body: EtBodyElement,
        paragraph: EtParagraphElement,
        ...schemaInit,
    }
    /** 初始化编辑器上下文 */
    const context = initContext(_editor, schema, _config)
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


    return Object.assign(_editor, {
        mount(el) {
            console.error('mount el: ', el)
            if (elMap.has(el)) {
                return
            }
            const root = formatEffitorStructure(el, context, allCssText, customStyleUrls)
            const ac = new AbortController()
            elMap.set(el, { ac, root })

            addListenersToShadowRoot(context, el, root, listeners, ac, pluginConfigs.htmlEventSolvers)

            plugins.forEach((plugin) => {
                plugin.effector.mounted?.(el, context)
            })
        },
        unmount(el) {
            if (elMap.has(el)) {
                plugins.forEach((plugin) => {
                    plugin.effector.beforeUnmount?.(el, context)
                })
                // abort signal自动清除绑定的监听器
                elMap.get(el)?.ac.abort()
                elMap.delete(el);
                el.innerHTML = ''
            }
        },
        getRoot(el) {
            return elMap.get(el)?.root ?? null
        },
        toEtHTML(el) {
            const root = elMap.get(el)?.root
            if (!root) return null
            return root.querySelector(BuiltinElName.ET_BODY)?.outerHTML ?? null
        },
        fromEtHTML(el, html) {
            let root = elMap.get(el)?.root!
            if (root) {
                this.mount(el)
                root = elMap.get(el)!.root!
            }
            const df = document.createRange().createContextualFragment(html)
            if (df.childElementCount !== 1 || df.firstChild?.nodeName !== BuiltinElName.ET_BODY.toUpperCase()) {
                throw new Error('Invalid html')
            }
            for (const p of df.firstChild.childNodes) {
                if (p.nodeName !== BuiltinElName.ET_PARAGRAPH.toUpperCase()) {
                    throw new Error('Invalid html')
                }
            }
            const body = root.querySelector(BuiltinElName.ET_BODY)
            if (body) {
                root.replaceChild(df, body)
            }
        },
    } as Et.Editor)
}


