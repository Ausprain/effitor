import { createElement } from 'react'
import { ListTree } from 'lucide-react'
import type { FeatureData } from '../config'

const icon = createElement(ListTree, { size: 32 })
const listFeatureDataZh: FeatureData = {
  icon,
  title: '列表',
  pluginName: '@effitor/plugin-list',
  editorActions: [
    [300, 200, false, '# 列表\n'],
    [300, 30, false, '> 来自插件：@effitor/plugin-list\n\n'],
    [300, 30, false, '- 有序列表：在空段落输入`1.`、`2.`等数字，后跟空格，即可创建有序列表项。\n'],
    [300, 30, false, '- 无序列表：在空段落输入`-`、`*`等符号，后跟空格，即可创建无序列表项。\n'],
    [300, 30, false, '- 项目列表：在列表项中按下`Alt+Enter`快捷键，可将当前列表项在`普通列表项`、`待办项`、`已办项`之间切换。\n'],
    [300, 30, false, '\t待办'],
    [300, 30, false, '\x00Enter,0010'],
    [300, 30, false, '\n'],
    [300, 30, false, '已完成'],
    [300, 30, false, '\x00Enter,0010\n\n'],
    [300, 30, false, '此外，列表项还具有以下功能：\n'],
    [300, 30, false, '1. 通过插件配置来嵌套其他节点，如标记节点（加粗、斜体等）。\n'],
    [300, 30, false, '2. 通过`Tab`键或`Shift+Tab`键，在列表项内切换缩进层级。\n'],
    [300, 30, false, '3. 通过`Alt+↑/↓`，可快速将当前列表项上移/下移。\n\n'],
  ],
  mdText: `# 列表
> 来自插件：@effitor/plugin-list

- 有序列表：在空段落输入\`1.\`、\`2.\`等数字，后跟空格，即可创建有序列表项。
- 无序列表：在空段落输入\`-\`、\`*\`等符号，后跟空格，即可创建无序列表项。
- 项目列表：在列表项中按下\`Alt+Enter\`快捷键，可将当前列表项在\`普通列表项\`、\`待办项\`、\`已办项\`之间切换。
  - [ ] 待办
  - [x] 已完成

此外，列表项还具有以下功能：
1. 通过插件配置来嵌套其他节点，如标记节点（加粗、斜体等）。
2. 通过\`Tab\`键或\`Shift+Tab\`键，在列表项内切换缩进层级。
3. 通过\`Alt+↑/↓\`，可快速将当前列表项上移/下移。
`,
}
const listFeatureDataEn: FeatureData = {
  icon,
  title: 'List',
  pluginName: '@effitor/plugin-list',
  editorActions: [
    [300, 50, false, '# List\n'],
    [300, 30, false, '> From plugin: @effitor/plugin-list\n\n'],
    [300, 30, false, '- Ordered List: Input `1.`, `2.`, etc. at the beginning of an empty paragraph, followed by a space, to create an ordered list item.\n'],
    [300, 30, false, '- Unordered List: Input `-` or `*` at the beginning of an empty paragraph, followed by a space, to create an unordered list item.\n'],
    [300, 30, false, '- Task List: Press `Alt+Enter` in a list item to toggle between `Normal List Item`, `Todo Item`, and `Done Item`.\n'],
    [300, 30, false, '\tTodo Item'],
    [300, 30, false, '\x00Enter,0010'],
    [300, 30, false, '\n'],
    [300, 30, false, 'Done Item'],
    [300, 30, false, '\x00Enter,0010\n\n'],
    [300, 30, false, 'In addition, list items have the following features:\n'],
    [300, 30, false, '1. Nested nodes, such as mark nodes (bold, italic, etc.), can be configured using the plugin.\n'],
    [300, 30, false, '2. By pressing `Tab` or `Shift+Tab`, you can switch the indentation level within a list item.\n'],
    [300, 30, false, '3. By pressing `Alt+↑/↓`, you can quickly move the current list item up or down.\n\n'],
  ],
  mdText: `# List
> From plugin: @effitor/plugin-list

- Ordered List: Input \`1.\`, \`2.\`, etc. at the beginning of an empty paragraph, followed by a space, to create an ordered list item.
- Unordered List: Input \`-\` or \`*\` at the beginning of an empty paragraph, followed by a space, to create an unordered list item.
- Task List: Press \`Alt+Enter\` in a list item to toggle between \`Normal List Item\`, \`Todo Item\`, and \`Done Item\`.
  - [ ] Todo Item
  - [x] Done Item

In addition, list items have the following features:
1. Nested nodes, such as mark nodes (bold, italic, etc.), can be configured using the plugin.
2. By pressing \`Tab\` or \`Shift+Tab\`, you can switch the indentation level within a list item.
3. By pressing \`Alt+↑/↓\`, you can quickly move the current list item up or down.
`,
}

export const listFeatureDataMap: Record<string, FeatureData> = {
  zh: listFeatureDataZh,
  en: listFeatureDataEn,
}
