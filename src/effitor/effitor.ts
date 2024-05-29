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
    readonly onMounteds: Et.Effector['onMounted'][],
    readonly onBeforeUnmounts: Et.Effector['onBeforeUnmount'][],
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
        cur.effector.onMounted && pre.onMounteds.push(cur.effector.onMounted)
        cur.effector.onBeforeUnmount && pre.onBeforeUnmounts.push(cur.effector.onBeforeUnmount)
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
        onMounteds: [],
        onBeforeUnmounts: [],

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
const addListenersToShadowRoot = (
    host: HTMLDivElement,
    root: Et.ShadowRoot,
    ac: AbortController,
    ctx: Et.EditorContext,
    listeners: ReturnType<typeof initListeners>,
    htmlEventSolvers: Et.HTMLEventSolver[]
) => {
    // 绑在shadowRoot上
    root.addEventListener('focusin', () => {
        console.error('focus ')
        // 编辑器聚焦时绑定上下文
        ctx.host = host
        ctx.root = root
        ctx.body = root.querySelector(ctx.schema.body.elName)!

        // focus时 重新获取selection 
        // fix. HMR热更新时 旧的selection对象可能丢失
        // fix. focus瞬间 还未获取光标位置
        requestAnimationFrame(() => {
            const sel = root.getSelection ? root.getSelection() : window.getSelection()
            if (!sel || !sel.rangeCount) {
                throw Error('No Selection')
            }
            ctx.range = sel.getRangeAt(0)
            ctx.selection = sel

            // 注册selectionchange
            document.addEventListener('selectionchange', listeners.selectionchange!, { signal: ac.signal })
        })
    }, { signal: ac.signal })
    root.addEventListener('focusout', () => {
        console.error('blur ')
        ctx.host = null as any   // 通过el是否为空来判断光标是否聚焦编辑器内
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
    // *wran. shadow dom内不会捕获isTrusted=true 的 inputType='insertFromDrop' 的 beforeinput事件
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

class EffitorNoHostError extends Error {
    constructor() {
        super(`EffitorNoHostError: Effitor not yet mounted, mount it first.`)
    }
}
export class Effitor {
    private __host: HTMLDivElement | undefined
    private __root: ShadowRoot | undefined
    private __context: Et.EditorContext

    private __ac: AbortController | undefined
    private __listeners: ReturnType<typeof initListeners>
    private __pluginConfigs: PluginConfigs
    private __cssText: string
    private __customStyleUrls: string[]

    /**
     * 编辑器宿主 div元素
     */
    get host() {
        if (!this.__host) {
            throw new EffitorNoHostError()
        }
        return this.__host
    }
    /**
     * 编辑器影子根 ShadowRoot
     */
    get root() {
        if (!this.__root) {
            throw new EffitorNoHostError()
        }
        return this.__root
    }
    /**
     * 编辑器上下文对象
     */
    get context() {
        if (!this.__host) {
            throw new EffitorNoHostError()
        }
        return this.__context
    }

    constructor({
        schemaInit = {},
        mainEffector = getMainEffector(),
        plugins = [],
        config = {},
        customStyleUrls = [''],
    }: Et.CreateEditorOptions = {}) {
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
        const context = initContext(this, schema, _config)
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

        this.__context = context
        this.__cssText = allCssText
        this.__listeners = listeners
        this.__pluginConfigs = pluginConfigs
        this.__customStyleUrls = [...customStyleUrls]
    }
    /**
     * 在一个div下加载一个编辑器  若已挂载 则抛出一个异常
     */
    mount(host: HTMLDivElement) {
        if (this.__host) {
            throw Error('Effitor already mounted')
        }
        const root = formatEffitorStructure(host, this.__context, this.__cssText, this.__customStyleUrls)
        const ac = new AbortController()

        addListenersToShadowRoot(host, root, ac, this.__context, this.__listeners, this.__pluginConfigs.htmlEventSolvers)

        for (const fn of this.__pluginConfigs.onMounteds) {
            fn?.(host, this.__context)

        }

        this.__ac = ac
        this.__root = root
        this.__host = host
        return this
    }
    /**
     * 卸载编辑器 div宿主内容清空  若未挂载, 则不做任何操作
     */
    unmount() {
        if (!this.__host) return
        for (const fn of this.__pluginConfigs.onBeforeUnmounts) {
            fn?.(this.__host, this.__context)
        }
        // abort signal自动清除绑定的监听器
        this.__ac!.abort()
        this.__host.innerHTML = ''
    }
    /**
     * 导出`<et-body>`的outerHTML
     */
    toEtHTML() {
        if (!this.__root) {
            throw new EffitorNoHostError()
        }
        return this.__root.querySelector(BuiltinElName.ET_BODY)?.outerHTML ?? null
    }
    /**
     * 导入html为`<et-body>` 若非以下格式将报错  
     * ```html
     * <et-body>
     *  <et-p>...</et-p>
     *  ...
     *  <et-p>...</et-p>
     * </et-body>
     * ```
     */
    fromEtHTML(html: string) {
        if (!this.__root) {
            throw new EffitorNoHostError()
        }
        const df = document.createRange().createContextualFragment(html)
        if (df.childElementCount !== 1 || df.firstChild?.nodeName !== BuiltinElName.ET_BODY.toUpperCase()) {
            throw new Error('Invalid html for Effitor')
        }
        for (const p of df.firstChild.childNodes) {
            if (p.nodeName !== BuiltinElName.ET_PARAGRAPH.toUpperCase()) {
                throw new Error('Invalid html for Effitor')
            }
        }
        const body = this.__root.querySelector(BuiltinElName.ET_BODY)
        if (body) {
            this.__root.replaceChild(df, body)
        }
    }
}
