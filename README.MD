# Effitor

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
