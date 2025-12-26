# 开发计划

## v0.3.0

- [ ] 拖拽实现
  - 实现拖拽可能需要完全关闭 shadow 模式, 因为 ShadowDOM 还不成熟, Chromium 尚且不支持 ShadowDOM 内的 insertFromDrop 更别提 firefox 和 safari; 这也是至今未考虑实现拖拽的原因----ShadowDOM 的去留问题.
- [ ] 优化热键绑定, 考虑给 effector 新增一个 keymapSolver, 然后在 keydown 监听器中判断执行对应的热键action
  - [ ] 去掉 keydownSolver，直接使用 keymapSolver，如（`1000Enter` -> `Ctrl+Enter`）
- [ ] 拓展 CaretRange, 以支持用于描述选区在 input/textarea 内部的位置
  - [ ] v0.2.0已初步实现（EtInRaw）
- [ ] 重构代码块为非 textarea 方案, 并考虑将高亮器全局化
- [ ] 重构范围删除, 效应化.
- [ ] 优化插入内容时的"拆 partial 节点"逻辑
  - 在某个节点内部插入内容(片段), 若效应规则不允许插入该类内容, 则会拆分该节点; 若该节点不允许拆分(如段落), 则将要插入的内容去效应化(转为纯文本)
- 编辑器模式
  - [ ] 【控制模式】
    - [ ] 简单的多光标/选区
- 助手
  - [ ] 查找替换（基于【控制模式】）

> ps.
> 【控制模式】初步思路：在当前光标位置插入一个零宽字符, 然后选区 range 这个字符, 这样就可以隐藏光标和选区又能保留焦点在编辑区内, 并且使用输入法输入这种无法阻止的行为动作时, 也不会有副作用. 因为如果采用一个不可见的 input 或 textarea 的话, 需要处理输入法输入时的输入法 UI 显示位置的问题。
