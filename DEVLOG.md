# Todo Bugfix

- [ ] core
  - [x] 在段落中间逐级全选会停止在段落层级，在段落末尾却可全选到整个文档
  - trig. 逐级全选会触发 selectionchange 事件，导致全选等级被清除
  - [x] 粘贴后没有滚动到光标位置
  - [ ] 编辑器失去焦点后重新获取焦点，光标在末尾闪烁，但插入内容却在文档开头
- [ ] mark插件
  - [x] 取消 shadow 时, 文本中间 mark 异常
  - [x] bold 节点的 markType 值错误地记录为 italic
  - [x] 优化标记符hinting，现在 mousedown 时会取消 hinting，但如果光标在 mark 节点内，已经展开了标记符，此时想要移动光标到节点内其他文字，鼠标按下时标记符隐藏，会导致页面跳动（shfit layout），这不是好的体验。
- [ ] 代码块的复制粘贴问题，粘贴的代码块无法编辑（CodeContext 丢失）
  - [ ] 提升到组件的复制粘贴问题来解决

# 算法

## 接管除输入法输入外的所有 keydown 行为, 使用当前光标位置, 手动判断要删除的内容

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

## 判断光标是否在段落开头/末尾

### 简单无脑, 快速实现方案:

方案1: 使用 Selection.modify 移动一个字符, 判断光标是否改变段落
方案2: 使用 Range 选择当前光标位置到段落开头/末尾的 判断 .toString() 是否为空

### 尝试的高效方案

方案1: 从光标位置按文档树顺序遍历到段落开头/末尾, 判断中间是否有其他节点; 此方案不好处理组件以及 Blockquote 的情况
方案2: 光标亲和位置检查

### "光标亲和位置检查"判断段落开头/末尾的实现

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

#### 实现

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

# 设计

## 使用效应思路实现光标的左右移动, 以获取更精细化的实现和更好的性能

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

# Benchmark

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

# 插件

## Assists

### assist-dropdown

Todos

- [ ] bugs
  - [ ] dropdown 打开后若失去焦点, 就再也无法关闭

## Plugins

### plugin-mark

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

### plugin-heading

> 标题插件

Todos

- [ ] 基础
  - [x] atx标题, 可通过 `### ` 或 `#3 ` 方式插入标题
- [x] markdown互转
- [x] Dropdown item
- [ ] 标题链功能(IntersectionObserver)从 EditorBody移植到标题插件

### plugin-list

> 列表插件

Todos

- [ ] 基础
  - [x] 有序列表
  - [x] 无序列表
  - [x] 可完成(checked)列表
  - [x] 缩进处理
  - [x] alt+上/下 移动列表
- [x] markdown互转
- [x] Dropdown item
- [ ] 首段落插入列表报错(无效应元素) [FIXME](./packages/plugin-list/src/effector.ts#L16)

### plugin-code

> 代码块插件

Todos

- [ ] 基础
  - [x] 高亮+撤回重做
  - [x] 输入法处理
  - [x] 复制粘贴
  - [x] 快速剪切行
  - [x] 缩进自适应
  - [x] 括号自适应
  - [x] 深色模式自适应
  - [x] alt+上/下 移动代码行
  - [x] 逐级全选
- [x] markdown互转
- [x] Dropdown item
- [ ] Popup item (hover 工具栏)
  - [ ] 设置语言, tabSize 等
