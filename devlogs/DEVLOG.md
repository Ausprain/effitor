# v0.2.0 开发日志

## Bugfix

- [ ] core
  - [x] 全选后ArrowRight, 光标显示在末段落内末尾, 但上下文光标定位到了末段落外末尾, 导致接下来输入文本时直接插入到了 et-body 内
    - [ ] // TODO 需要优化 rel. [keydownArrow](./packages/core/src/effector/keydownArrow.ts#L15)
  - [ ] 编辑器失去焦点后重新获取焦点，光标在末尾闪烁，但插入内容却在文档开头
    - [x] 页面上光标位置更新了, 而上下文信息还停留在上一次的光标位置
  - [x] 段落开头/末尾亲和位置判断需要考虑零宽字符
  - [ ] 开启微信输入法的使用英文标点后，在输入（1,2,3 的过程中出现（1，，2，，3 的问题；输入数字+括号：2）自动将括号半角，而后续输入数字将重复，输入 3 变成 33.
  - [x] 如果删除段落中仅剩的零宽字符, 应当同时删除段落
  - [x] 在段落中间逐级全选会停止在段落层级，在段落末尾却可全选到整个文档
    - trig. 逐级全选会触发 selectionchange 事件，导致全选等级被清除
    - sol. 不记录全选等级, 每次直接根据当前 range 计算
  - [x] 粘贴后没有滚动到光标位置
  - [x] 当末段落内只有一个 et-media 时, 全选文档选区会没有"拖蓝"(实际上全选了, 但全选的 UI 没有展示)
  - [x] 逐级全选的判定缺漏: 空段落时 firefox 中全选当前行只选了一半
  - [x] firefox 方向键移动光标/扩展选区失效
- plugin-heading
  - [x] 粘贴出现其他效应节点的问题
- plugin-mark
  - [x] 取消 shadow 时, 文本中间 mark 异常
  - [x] bold 节点的 markType 值错误地记录为 italic
  - [x] 优化标记符hinting，现在 mousedown 时会取消 hinting，但如果光标在 mark 节点内，已经展开了标记符，此时想要移动光标到节点内其他文字，鼠标按下时标记符隐藏，会导致页面跳动（shfit layout），这不是好的体验。
- plugin-code
  - [x] 代码块的复制粘贴问题，粘贴的代码块无法编辑（CodeContext 丢失）
    - [ ] 提升到组件的复制粘贴问题来解决 //TODO 现在的实现很粗糙
- plugin-link
  - [x] 复制网页的内容, 粘贴过来被识别为了粘贴链接

## Todo

- [ ] mountEtHandler改为使用效应码扩展，而非使用效应元素
- [x] 优化命令(CommandManager)与 handler (CommonHandler)之间的界限: 命令直接处理DOM 操作; 而 handler 在命令上层, 还要负责处理效应规则
- [ ] code 渲染 html 应使用 iframe
- [ ] 调和 htmlProcessor.parseRangingContentsToHtml 和 fragmentUtils.parseEtFragmentToNativeHTML
  - 前者会对文档节点直接解析; 后者先克隆片段, 然后再解析; 因此 EffectElement.toNativeElement 被前者调用时, getComputedStyle 奏效, 而后者无效, 因为节点不在页面上, 无计算样式
- [ ] 目录助手
- [x] CommandManager 新增一个判断 keydown 是否需要 commit 的方法, 用于给插件的 beforekeydown 的效应元素特有处理函数使用
- [x] 引用块/表格末尾连续两次 enter 插入空段落
- [x] 空代码块开头 Backspace 删除代码块
- [x] 效应元素新增 contentText 属性, 用于字数统计; 代码块不参与字数统计, 因此返回空串
- [ ] ~~将 hotkey 提升至 keymap 的维度~~
  - why？
    - 目前除了文本输入，几乎每个 keydown 都得计算依次 modkey；而在插件 sovler 中，经常需要判断一些按键是否同时按下“shift”，“ctrl”，“alt”，这很繁琐。
    - 何不直接用 keymap 的思想，keydown 中先计算 modkey，判断是否有对应的 keymap action，有则直接执行，返回 true 终止后续；这样插件直接实现 keymap 就好了，不用在额外做 ev.shift/altKey 等判断, 减少样板代码，开发效率更高，代码更简洁。
  - why not
    - keydownSolver 本身具有 keymap 功能, 如果独立一个 keymapSolver 出来, 还需要处理回退问题; 不如留给插件自己在效应元素专有 solver 上手动调用 ctx.hotkeyManager.listenEffect 来执行指定 keymap
- [x] 更新 CssClassEnum 的样式名, 统一格式
- [ ] 选区增加选择节点case，即当选区 range，且 startOffset+1=endOffset时，视为选择节点
- [x] blockquote新增 pgroup 类型
- [ ] 热字符串判定允许 Backspace 回退游标
- [ ] 大文档性能优化，看看标题高度是否影响性能；以及 css 颜色方案 oklch 是否影响样式计算的性能
- [ ] 插件需暴露一个接口给外部
  > - 现在的助手如 dropdown，popup 等，都必须在插件注册前挂载到 ctx.assists 上，才能被插件使用；如果未来新增助手如 toolbar，则没办法将插件的指定功能添加到 toolbar 上。
  > - 为解决此问题，考虑在插件 use 函数的参数提供一个接口给外部，一个在 onMounted 中执行的回调函数，并对外暴露插件内部的一些功能、配置、方法、快捷键等，以方便新增的助手能够将这些插件的功能添加到助手上。
  > - 这需要一个统一的抽象。`EditorAction`

## 算法

### 接管除输入法输入外的所有 keydown 行为, 使用当前光标位置, 手动判断要删除的内容

注意事项: \
多码点字符的处理, 如大多数的Emoji 字符, 会占用多个码点, 且 JavaScript 字符串判断
其长度会错误, 如 `'😂'.length` 会返回 2, 而不是 1; \
而该字符应整体删除, 因此, 要正确判断删除字符的长度, 不可删除多码点字符的单个码点, 导致页面上出现`�`等解析失败的字符.
sol. \
使用 Selection.modify 方法, 对当前光标位置进行步进, 以判断要删除的字符的正确偏移量

Selection.modify 方法太重, 每次执行 浏览器都要计算布局 (`Document::UpdateStyleAndLayout`)

算法:
@deprecated

```ts
let node = new Text("AB👨👩👧👦C"); // node.length = 11
let offset = 10;
// deleteContentBackward 删除一个字符
let testChar = node.data.slice(Math.min(0, offset - 4), offset); // '👧👦'
textChar = [...testChar].pop(); // '👦'
// cmd deleteText
node.deleteData(offset - textChar.length, textChar.length); // delData = '👦'

// 此算法对于length 大于 2 的字符可能有另外的结果, 如 '👨🏽', 按上述算法删除, 需要两次 deleteContentBackward, 结果依次为:
// '👨🏽' -> '👨' -> ''
// 因为 '👨🏽'.length==4, 由'👨'和'🏽'合成; 但这样也不妨碍视觉表现, 因此此算法是可行的, 不至于出现`�`的情况
```

sol. 使用 [Intl.Segmenter](packages/core/src/intl/Segmenter.ts)

### 判断光标是否在段落开头/末尾

#### 简单无脑, 快速实现方案:

方案1: 使用 Selection.modify 移动一个字符, 判断光标是否改变段落
方案2: 使用 Range 选择当前光标位置到段落开头/末尾的 判断 .toString() 是否为空

#### 尝试的高效方案

方案1: 从光标位置按文档树顺序遍历到段落开头/末尾, 判断中间是否有其他节点; 此方案不好处理组件以及 Blockquote 的情况
方案2: 光标亲和位置检查

#### "光标亲和位置检查"判断段落开头/末尾的实现

注意事项(需求):

1. 光标在段落末尾的 br 前, 视为段落末尾
2. 能处理组件节点中不可编辑内容, 如

```ts
<p>段落 1</p>
<comp>  // (组件)段落 2
  <span>组件标题(不可编辑)</span>  // 修饰元素
  <div>|组件内编辑区</div>
</comp>
<p>段落 3</p>
```

光标位于`|`的位置, 应当视为组件段落`<comp>`的开头

##### 实现

1. 段落元素 EtParagraphElement 提供两个函数(继承自 EffectElement), 返回段落自己认为的开头/结尾光标位置:

```ts
innerStartEditingBoundary(): EtCaret {
  return cr.caretInStart(this)
}
innerEndEditingBoundary(): EtCaret {
  return cr.caretInEnd(this)
}
```

2. EtCaret 实现光标位置亲和性判断

```ts
isAffinityTo(caret: EtCaret) {
  算法:
  1. 获取this 和 caret 的最里层位置 { node, offset }
  2. 若 this 和 caret 都在文本节点上, 且 offset 在文本节点中间; 若俩 offset 相同, 则返回 true, 否则返回 false
  3. offset 存在 3种 情况: =0, =node 长度, 介于两者中间
  4. 俩 offset 都为 0, 或都等于各自 node 的长度, 返回 false, (都在节点开头或结尾, 必定不指向同一位置(不亲和))
  5. 定住 offset=0 的节点(start), 找另一个node的后兄弟(无后兄弟找最近一个有后兄弟祖先的后兄弟)end, 返回 (start === end)
  /**
   * @example
   * <div>
   *  <p1>AA</p1>
   *  <p2>BB<b>CC</b>DD</p2>
   *  <p3><i>EE</i>FF<br></p3>
   * </div>
   *
   * `->`代表`EtCaret.innerAffinity`的过程
   * `=>`代表`traversal.treeNextSibling`的过程
   *
   * 亲和组1:
   *    (div, 1) -> (p2, 0) -> (BB, 0)
   *    (p2, 0) -> (BB, 0)
   *    (BB, 0)
   *    (p1, 1) -> (AA, 2) => (p2, 0) -> (BB, 0)
   *    (AA, 2) => (BB, 0)
   *
   * 亲和组2:
   *    (div, 2) -> (p3, 0) -> (i, 0) -> (EE, 0)
   *    (p2, 3) -> (DD, 2) => (p3, 0) -> (i, 0) -> (EE, 0)
   *    (p3, 0) -> (i, 0) -> (EE, 0)
   *    (i, 0) -> (EE, 0)
   *    (EE, 0)
   *
   * 亲和组3:
   *    (FF, 2) => (br, 0)
   *    (br, 0)
   *    (p3, 2) -> (br, 0)
   *    // 非亲和
   *    (p3, 3) -> (br, 1)
   *
   */
}
```

> [!NOTE] ps. 该算法是命令系统的一部分, 主要目的有两个
>
> 1. 合规化命令结束光标位置\
>    当某个命令配置的结束光标位置指向一个<br>内部时, 该算法会将光标移出, 并指向<br>前(外开头)位置
> 2. 简化命令结束光标位置的配置
>    一些命令, 如删除节点, 若光标在该节点内, 则配置命令时必须指定结束光标位置, 否则会导致编辑器失去焦点; 而该算法可用于简化此配置, 即删除一个节点, 默认把命令结束光标位置设置在节点被删除位置的亲和位置, 算法会自动将光标位置指定到亲和的文本节点位置

### 判断光标/选区是否在第一行 or 最后一行

> chrome 和 Safari 对 table 内的方向键处理不符合直觉; 其使用的 Selection.modify, 向上移动一个'line'时, 光标会移动到文档树的上一个 td, 而不是视觉上(直觉上)的上一个 td
>
> firefox 则符合直觉, 但它底层并不是通过 Selection.modify 来实现的, 我们无法复现, 即 firefox 表格内使用 Selection.modify 向上移动一个'line'没有任何效果.
>
> 而如果表格内 td 有多行(包括css软换行), 只要光标不在第一行, 则 modify 向上移动一个'line'时, 结果是符合预期(直觉)的.
>
> 因此要判断光标是否在 td 内的第一行 or 最后一行, 来决定是否接管方向键的行为, 来获取更符合直觉的光标选区控制.

第一行:

1. 找根元素的第一个非空 #text节点 后代, 创建一个 collapse 到该 #text 开头的 Range, 获取getClientRects的第一个矩形框(也是唯一一个), 记为 startRect
2. 将选区 collapse 到开头, 获取getClientRects的第一个矩形框, 记为 selRect
3. 若 selRect.top - startRect.bottom >= 2, 则视为不在第一行

最后一行:

1. 找根元素的最后一个非空 #text节点 后代, 创建一个 collapse 到该 #text 结尾的 Range, 获取getClientRects的第一个矩形框(也是唯一一个), 记为 endRect
2. 将选区 collapse 到结尾, 获取getClientRects的第一个矩形框, 记为 selRect
3. 若 endRect.top - selRect.bottom >= 2, 则视为不在最后一行

> ps.
>
> 1. 为什么用 getClientRects 而不是 getBoundingClientRect?
>    根据规范和 blink 源码, getBoundingClientRect 会先调用 "getClientRects", 再求包含所有矩形框的最小矩形框; 因此使用前者的性能会更好一些.
>    参考: https://www.w3.org/TR/cssom-view-1/#dom-range-getclientrects
> 2. 为什么一定要找文本节点
>    因为非文本节点, Range.getClientRects() 会返回空数组, 虽然这不符合规范, 但这是浏览器事实

ps. 以上算法计算一次耗时 0.3 ~ 0.5ms

## 设计

### 使用效应思路实现光标的左右移动, 以获取更精细化的实现和更好的性能

case:

```css
<div>aaaa|<b>abc</b></div>
现在的方案, 使用 Selection.modify 方式移动光标; 则光标右移一位得到以下新的位置
<div>aaaa<b>a|bc</b></div>
然后左移一位得到
<div>aaaa|<b>abc</b></div>
也就是我们无法获得定位于<b>内开头的位置, 即通过 modify, 无法得到
<div>aaaa<b>|abc</b></div>
于是通过零宽字符来救场
<div>aaaa|<b>0abc</b></div>
0 代表零宽字符, 光标右移一位得到以下位置, 由于零宽字符, 视觉就可以得到<b>内开头的位置了
<div>aaaa<b>0|abc</b></div>
```

这么做的的弊端, 在于每个我们需要此需求的场景, 都必须手动维护这些零宽字符, 要么删除时添加额外的逻辑去处理这些零宽字符; 要么任由这些零宽字符在文档中残留

`sol. // TODO `

```html
<div>aaaa|<b>abc</b></div>
```

假设 `<b>` 是个效应元素, 则按下右键时, 若光标在文本末尾, 则找下一个节点, 若下一个节点是效应元素, 尝试激活其"从开始端接收光标"效应, 让效应元素来决定如何定位光标位置
特别的, 对于embedment 节点, 光标无法落入其中, 则直接定位到该效应元素外末尾;
而对于嵌套可编辑的 Component 节点, 则让其将光标定位到内部可编辑的对应位置.

## Benchmark

性能测试量级：

1. 每段落 100 字符
2. 每段落 500 字符
   1. 20w 字符
   2. 50w 字符
   3. 100w 字符
   4. 300w 字符
   5. 1000w 字符

性能测试指标：各项交互的 INP 值

测试交互列表:

| interaction             | description          | INP     |
| ----------------------- | -------------------- | ------- |
| 点击获取光标            | 鼠标点击到光标闪烁   | < 150ms |
| 方向键移动光标          | 按下方向键到光标闪烁 | < 100ms |
| shift+方向键扩展选区    |                      | < 100ms |
| 纯英文输入              |                      | < 100ms |
| 输入法输入              |                      | -       |
| 行内删除选区            |                      |         |
| 跨段落删除选区          |                      |         |
| 复制粘贴 20w 字符富文本 |                      |         |

## 插件

### Assists

#### assist-dialog

Todos

- [ ] 打开 dialog 后，应让编辑器失去焦点，将焦点转移到 dialog 上

#### assist-dropdown

Todos

- [ ] bugs
  - [ ] dropdown 打开后若失去焦点, 就再也无法关闭

### Plugins

#### plugin-heading

> 标题插件

Todos

- [ ] 基础
  - [x] atx标题, 可通过 `### ` 或 `#3 ` 方式插入标题
- [x] markdown互转
- [x] 原生 html 互转
- [x] Dropdown item
- [ ] 标题链功能(IntersectionObserver)从 EditorBody移植到标题插件

#### plugin-mark

> 标记插件

Todos

- [ ] 基础
  - [x] 加粗
  - [x] 斜体
  - [x] 高亮
  - [x] 删除线
  - [x] 内联代码
  - [x] 临时节点判断
  - [x] 嵌套判断
  - [x] 光标跳出能力
  - [x] 可选隐藏标记符提示 (hinting)
- [x] markdown互转
- [x] Dropdown item

#### plugin-list

> 列表插件

Todos

- [ ] 基础
  - [x] 有序列表
  - [x] 无序列表
  - [x] 可完成(checked)列表
  - [x] 缩进处理
  - [x] alt+上/下 移动列表
- [x] markdown互转
- [x] 原生 html 互转
- [x] Dropdown item

#### plugin-link

> 链接插件

Todos

- [ ] 基础
  - [x] 识别 `[xxx](http://xxx.com)` 并自动转换为链接
- [x] markdown互转
- [x] 原生 html 互转
- [x] popup 更新, 跳转链接
- [x] dropdown 插入链接

#### plugin-media

> 媒体插件

Todos

- [ ] 基础
  - [x] 识别 `![xxx](http://xxx.png)` 并自动转换为媒体(图片/音/视频)
  - [x] 布局: 左右浮动, 居中; 调整大小
  - [x] 全屏预览
- [x] markdown互转
- [x] 原生 html 互转
- [x] popup 调整布局, 删除
- [x] dropdown 插入媒体

#### plugin-code

> 代码块插件

Todos

- [ ] 基础
  - [x] 高亮+撤回重做
  - [x] 输入法处理
  - [x] 复制粘贴
  - [x] 快速剪切行
    - [ ] 粘贴剪切的行, 应采用插入新行方式, 而不是在当前光标位置插入
  - [x] 缩进自适应
  - [x] 括号自适应
  - [x] 深色模式自适应
  - [x] alt+上/下 移动代码行
    - [ ] alt+shift+上/下 复制代码行
  - [x] 逐级全选
- [x] 可渲染 html、latex
- [x] markdown互转
- [x] html 互转
- [x] Dropdown item
- [ ] Popup item (hover 工具栏)
  - [ ] 设置语言, tabSize 等

#### plugin-blockquote

> 引用块插件

Todos

- [ ] 基础
  - [x] 识别 `> ` | `> [!NOTE]` 并自动转换为引用块
- [x] 使用热字符串快速插入 gfm 引用块 (note, tip, important, warning, caution)
- [x] markdown互转
- [x] 原生 html 互转
- [x] 新增 pgroup 类型
  - 起因：想要分栏，如果给 et-body 添加 column-count，则整个文档都分栏了；而如果给段落添加，则每个段落都要独立加；
  - 使用段落组（et-bq）是最佳方案，但缺乏相关 et-bq 类型；新增一个段落组类型（pgroup），给该类型的 et-bq 添加如下样式：column-count: x; column-gap: 1.6em; x 的取值为（1,2,3）；添加热字符串：pg.1, pg.2, pg.3 来快速插入分栏分别为 1 列、2 列、3 列的段落组。
  - 段落组除了分栏外没有样式，只有光标落于其中时，即.active状态，显示边框等用于提示当在在段落组内

#### plugin-table

> 表格插件

Bugs

- [ ] Safari 表格 css padding: 6px 被加载成了 padding-top: 6px;
- [x] Chrome 空单元开头内输入法输入会概率性多出一个 `'x` 的问题
  - 如输入法输入`kaishi`, 最终结果会成为: `开始a`, 或`开始'a`, 其中 `a` 刚好会是组合串的第二个字母
  - ~~sol. 空单元格自带一个零宽字符~~
    - ~~使用 tab 键切换到下一个空单元格时, 即使有零宽字符, 输入法输入依然存在此问题~~
  - sol. 该问题是在 insertCompositionText 的 handler 中对 payload.targetRange 非 collapsed 时删除选区造成的

Todos

- [ ] 基础
  - [x] 适用于表格的光标移动
  - [x] 插入行/列
    - enter: 插入行
    - tab: 插入列
  - [x] 单元格内换行
    - shift + enter 换行
  - [x] alt+上/下 移动表行
  - [x] ctrl+alt+左/右 移动表列
  - [x] 光标状态下 cmd+c/l/r: 居中/左对齐/右对齐
  - [x] 粘贴处理
- [x] markdown互转
- [x] 原生 html 互转
- [x] dropdown
  - 新增表格
  - 向左/右 插入新列, 删除列
  - 向上/下 插入新行, 删除行

#### plugin-excalidraw

#### plugin-math
