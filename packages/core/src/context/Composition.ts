import { HtmlCharEnum } from '@effitor/shared'

import type { Et } from '../@types'
import { ConfigManager } from '../editor/ConfigManager'

declare module '../editor/ConfigManager' {
  interface UserConfig {
    imeCharsMapping: KeyboardWritableKeyToImeCharMap
  }
}

export type KeyboardWritableKeyToImeCharMap = Partial<Record<Et.KeyboardKey, string>>

/**
 * 中文输入法全角标点符号映射
 */
export const keyboardCodeKeydownToChineseImePunc: KeyboardWritableKeyToImeCharMap = {
  '`': '·',
  '~': '～',
  '!': '！',
  '@': '＠',
  '$': '¥',
  '^': '……',
  '(': '（',
  ')': '）',
  '-': '－',
  '_': '——',

  '[': '【',
  ']': '】',
  '{': '「',
  '}': '」',
  '\\': '、',
  '|': '｜',
  ';': '；',
  ':': '：',
  '\'': '‘',
  '"': '“',
  ',': '，',
  '.': '。',
  '<': '《',
  '>': '》',
  '?': '？',
}

export class Composition {
  /**
   * KeyboardEvent.key -> 输入字符 映射, 用于解决 MacOS 下无法通过 ev.key === 'Process'
   * 判断当前是否为输入法输入, 从而无法正确地根据输入法状态输入全角标点的问题;
   * 配合 ctx.isUsingIME, 为 true 时从该映射中获取输入字符, 否则输入 ev.key 字符
   */
  private readonly _imeCharMap = {} as Record<string, string>
  /** ime字符 -> KeyboardEvent.key 映射, 用于输入全角的 ime 字符后按空格替换回半角字符 */
  private readonly _imeCharToWritableKey = {} as Record<string, string>

  private readonly _configManager: ConfigManager
  constructor(
    private readonly _ctx: Et.EditorContext,
    public readonly isSupportInsertFromComposition: boolean,
  ) {
    // TODO 设置 imeCharsMapping 配置更新检查器
    // this._configManager.setConfigChecker('imeCharsMapping', (config) => {})
    this._configManager = _ctx.editor.configManager
    // 加载 ime 字符映射
    this.setImeChars(keyboardCodeKeydownToChineseImePunc)

    // 恢复存储的 ime 映射配置
    const imeCharsMap = this._configManager.getConfig('imeCharsMapping')
    let needUpdateConfig = false
    if (imeCharsMap && typeof imeCharsMap === 'object') {
      for (const [key, imeChar] of Object.entries(imeCharsMap)) {
        if (typeof imeChar === 'string') {
          this._imeCharMap[key] = imeChar
        }
        else {
          needUpdateConfig = true
        }
      }
    }
    else {
      needUpdateConfig = true
    }
    if (needUpdateConfig) {
      this._configManager.updateConfig('imeCharsMapping', this._imeCharMap)
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                IME 字符处理                                 */
  /* -------------------------------------------------------------------------- */

  private _isUsingIME = false
  /**
   * 一个推断属性, 根据当前用户的输入行为, 判断当前是否开启了输入法; 该判断是非严格的,
   * 因为没有获取输入法状态的相关标准 API, 我们无法得知当前输入是否为输入法输入;
   *
   * 在 Windows平台的 Chorme 下, 可以通过 KeyboardEvent.key
   * 属性是否为 'Process' 来判断, 但在 MacOS 下, 此方法无效; 并且在 Windows 下,
   * 用户开启输入法(如中文), 输入标点符号时, .key是"Process"且会激活 compositionstart,
   * 但在 MacOS 下, 输入法输入中文标点符号时, keydown 事件依旧无法判断是否为输入法输入,
   * .key 依旧等于半角的符号值, 且不会激活 compositionstart; 这样我们就无法判断用户
   * 是否预期插入输入法(全角)标点符号了;
   *
   * 因此需要此属性, 当用户使用输入法输入, 激活了 insertCompositionText 的 beforeinput 事件,
   * 我们将该属性标记为 true; 并在下一个 "纯的"insertText 中将其重置为 false;
   * 这样我们就可以在激活 insertText 之前, 通过该属性判断插入的标点, 是否应当是全角的;
   * 对应的全角字符可通过 Composition.setImeChars 自定义配置
   *
   * @rel {@link keyboardCodeKeydownToChineseImePunc }
   */
  get isUsingIME() {
    return this._isUsingIME
  }

  setUsingIME(value: boolean) {
    this._isUsingIME = value
    return value
  }

  /**
   * 获取 KeyboardEvent.key 对应的 IME 字符
   */
  getImeChar(key: string): string | undefined {
    return this._imeCharMap[key]
  }

  /**
   * 获取一个 ime 字符对应的 KeyboardEvent.key 可写字符; 如 `。 -> .`
   * @param imeChar ime字符
   * @returns 一个长度为 1 的字符串, 或 undefined
   */
  getWritableKey(imeChar: string): string | undefined {
    return this._imeCharToWritableKey[imeChar]
  }

  /**
   * 获取 IME 字符映射表, 在需要自定义 ime 字符映射时需要
   */
  getImeCharsMap() {
    return { ...this._imeCharMap }
  }

  /**
   * 设置IME输入替换字符
   * @param mapping KeyboardEvent.key -> IME字符
   */
  setImeChars(mapping: KeyboardWritableKeyToImeCharMap) {
    // 最多允许 2 个字符; 中文破折号/省略号为 2 个字符
    for (const [key, char] of Object.entries(mapping)) {
      if (char) {
        this._imeCharToWritableKey[this._imeCharMap[key] = char.slice(0, 2)] = key
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                 输入法会话响应                               */
  /* -------------------------------------------------------------------------- */

  private _inSession = false
  /** 是否处于输入法会话中, 即compositionstart与compositionend之间 */
  get inSession() {
    return this._inSession
  }

  setInSession(value: boolean) {
    this._inSession = value
    return value
  }

  private _updateCount = 0
  /**
   * 记录composingupdate次数, 用于跳过后续update导致的selectionchange;
   * 当第一次触发输入法事务时, count=1
   */
  get updateCount() {
    return this._updateCount
  }

  /**
   * 记录compositionstart时, 段落的最后一个节点;
   * 用于在compositionend时, 恢复段落的最后一个节点
   */
  private _paragraphLastNode: Et.NodeOrNull | undefined = void 0
  get paragraphLastNodeInCompositionStart() {
    return this._paragraphLastNode
  }

  onStart() {
    this._inSession = true
    this._isUsingIME = true
    this._updateCount = 0
    if (!this._ctx.selection.rawEl) {
      this._paragraphLastNode = this._ctx.focusParagraph?.lastChild
    }
  }

  onUpdate() {
    this._updateCount++
  }

  onEnd(data: string) {
    // fixed. Windows 下 Chromium, 采用页面内失焦方式结束输入法会话, 会在compositionend后
    // 发送一个不可取消的 deleteContentBackward 因此需要延迟 inCompositionSession = false,
    // 让beforeinput跳过这个 deleteContentBackward
    setTimeout(() => {
      this._inSession = false
      // 输入法结束, 记录一次命令事务
      this._ctx.commandManager.commit()
    }, 0)

    if (this._ctx.selection.rawEl) {
      this.onEndInRawEl(this._ctx.selection.rawEl, data)
    }
    else {
      this.onEndInEditable(data)
    }

    // fixed. 解决 MacOS 下 Safari 的 composition 事件先于 keydown 执行, 导致输入法结束后
    // 多执行一个 keydown 引起的 beforeinput 事件的问题
    // FIXME 使用isSupportInsertFromComposition判断是暂时的, 目前仅 macOS 的 Safari 和 webview 该属性为 true
    //       未来其他浏览器也将 composition 提前于 keydown, 或支持 `insertFromComposition` 则需要修改
    if (this.isSupportInsertFromComposition) {
      this._ctx.skipNextKeydown()
    }
    else {
      // Safari 的输入法插入文本可拦截, 使用 insertText 命令插入 并设置设置光标位置, 更新ctx
      // 非 Safari 下, 输入法插入无法拦截, 需手动更新上下文
      this._ctx.forceUpdate()
      // 消耗掉上一次 compositionupdate 的 skipNextKeydown
      return this._ctx.nextKeydownSkipped
    }
  }

  onEndInRawEl(_el: Et.HTMLRawEditElement, _data: string) {
    // empty
  }

  onEndInEditable(data: string) {
    // fixed. 若data 为空, 即用户删除输入法组合串或使用 Esc 取消输入法输入
    // 此时若段落只有唯一一个子节点(就是输入法组合串所在的文本节点, 其内容会被替换为 data)
    // 此时插入一个尾 br; 这是各浏览器的"共识", 大概目的是防止输入法组合串被删除后, 段落为空,
    // 而如果段落没有设置最小高度, 那么段落高度会坍缩, 导致光标跳跃或无法选中等情况于是采用了
    // 插入一个 br的方式撑起段落;
    // 但这对 Effitor 来说是灾难, 因为我们是直接操作DOM 的,
    // 需要完全接管浏览器对编辑器内的所有 DOM 操作, 任何对编辑器内容的非命令更改都可能会导致 cr
    // 定位的光标位置不精确, 从而导致一些异常
    // 因此我们要在此恢复 composition 会话开始时被浏览器删除的尾 br, 或使用被删除的尾 br 来替换
    // 浏览器为撑起段落而插入的新 br
    if (this._ctx.focusParagraph) {
      const pLastNode = this._paragraphLastNode
      const currLastNode = this._ctx.focusParagraph.lastChild
      if (currLastNode && currLastNode.nodeName === 'BR' && currLastNode !== pLastNode) {
        if (!pLastNode) {
          // 这是浏览器私自插入的 br, 移除
          currLastNode.remove()
        }
        else if (pLastNode.nodeName === 'BR') {
          // 或替换为一开始被浏览器私自删除的 br
          currLastNode.replaceWith(pLastNode)
        }
      }
      // 段落为空, 而输入法开始时非空, 插回被意外删除的节点; 这种情况应该不太会发生
      // 可能的情况是, 浏览器在用户取消输入法输入时, 段落为空而没有惯例地插入一个 br
      if (!currLastNode && pLastNode) {
        this._ctx.focusParagraph.appendChild(pLastNode)
      }
    }
    this._paragraphLastNode = null

    // 输入法插入文本非空, 去掉插入位置前导的零宽字符
    if (data) {
      const anchorText = this._ctx.selection.anchorText
      if (anchorText && anchorText.data[this._ctx.selection.anchorOffset - 1] === HtmlCharEnum.ZERO_WIDTH_SPACE) {
        this._ctx.commonHandlers.deleteInTextNode(anchorText, this._ctx.selection.anchorOffset - 1, 1, false)
      }
      if (this._ctx.focusEtElement) {
        this._ctx.getEtHandler(this._ctx.focusEtElement).InsertCompositionTextSuccess?.(this._ctx, data)
      }
    }
  }
}
