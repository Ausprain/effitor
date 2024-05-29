# 0.2.0
## Api
- [ ] `dom.selectRange`: 返回promise 
## Bug Fixes
- [x] issues.6 HMR热更新时，重复注册自定义元素，导致热更新失败；这是一个不好的开发体验。 
## Features
- [x] `editor`: 支持引入自定义样式文件, 通过与标签名同名的类名 选择该标签
## Todos
- cmd
  - [ ] 命令回调在执行命令时便执行，而不是插入到事务中统一执行
  - [ ] 命令回调可以是async的
- clipboard api
  - [ ] ctrl+shift+c 仅复制纯文本
  - [ ] ctrl+shift+v 粘贴为纯文本
- editor api
  - [x] 改用class方式 创建编辑器实例
  - [x] 改成单编辑器，一个effitor对象对应一个div
  - [x] getRoot: `()=>ShadowRoot`, 获取编辑器的影子根
  - [x] createEditor 参数options选项添加自定义css路径, 以`<link>`方式插入影子根

# 0.1.0
## Bug Fixes
- [x] issues.5 段落开头`Backspace`时未删除当前段落（合并入上一段落），而是删除上一段落文本或`br`
  - orig. `ev.getTargetRanges()[0]`取得由浏览器判断出用户欲删除的内容为上一段落文本，这与实际不符，
  - sol. 用`ctx.range`来判断段落头`Backspace`
- [x] issues.4 空段落输入法输入时会删掉`<br>`，导致删除最后一文本时会连同段落删除
  - orig. `dom.outermostAncestorWithSelfAsOnlyChild`中错把`tagName`当`localName`使用
- [x] issues.3 在非样式节点外`Ctrl + Backspace/Delete`删除一个word后，若样式节点仅剩零宽字符，未能正确将其一并删除
- [x] issues.2 `Backspace`删除块级符开头`&ZeroWidthSpace;`时异常，与预期不符，可能与`modify()`有关
  - orig. `modify`移动一个`Character`无法跨越换行或`display::block`节点，导致删除判定为【同段落跨节点删除】`or`【跨段落删除】，然后整体删除、合并
  - orig. `modify`后未更新上下文
  - sol. `modify`绑定到ctx上
- [x] issues.1 `markPlugin`: 撤销临时节点时前一个字符也被删除了
  - orig. 忘记`skipDefault`
## Features
- 主要编辑
  - [x] 撤回栈
  - [x] 段落拖拽
  - [x] 编辑器内复制粘贴
  - [x] 外部复制粘贴自适应（图片、链接） 
- 数据
  - [x] 导入导出et-html
- 插件支持
  - [x] `useAbbrPlugin`: [缩写符功能](./README.md#缩写符)
  - [x] `useCompPlugin`: [图片、链接、列表](./README.md#图片链接列表代码块表格)
  - [x] `useMarkPlugin`: [部分markdown](./README.md#部分markdown)
## Todos
- [x] 编辑：若删除文本后节点仅剩零宽字符，则连同该节点（以及以其为唯一节点的祖先）一起删除，并合并前后可合并节点
- [x] `mark`: mark节点仅剩零宽字符时，光标离开时应当将标记节点移除，rel.issues.3
- [x] `abbr`：前缀/块级符内开头Backspace或后缀符内末尾Delete时，将缩写符节点`regress`
- [x] `Backspace|Delete`：修复并优化`br`和段落的删除
- [x] `undo`: 优化handle，减少一层跳转，并将undoEffector放在plugins第一位，因为这是必须执行的，如`Backspace|Delete`等按键按下时需要记录命令事务，这需要在其他keydownSolver之前执行，因为插件可能在keydown生命周期内添加命令，这会导致事务记录不正确
