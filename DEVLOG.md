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

1. 段落元素 EtParagraphElement 提供两个函数(集成自 EffectElement), 返回段落自己认为的开头/结尾光标位置:

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

## 使用效应思路实现光标的左右, 以获取更精细化的实现和更好的性能

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
