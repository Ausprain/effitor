import { createElement } from 'react'
import { Highlighter } from 'lucide-react'
import type { FeatureData } from '../config'

const icon = createElement(Highlighter, { size: 32 })
const markFeatureDataZh: FeatureData = {
  icon,
  title: '标记',
  pluginName: '@effitor/plugin-mark',
  editorActions: [
    [300, 200, false, '# 标记\n'],
    [300, 30, false, '> 来自插件：@effitor/plugin-mark\n\n'],
    [300, 50, false, '内置五种标记节点：**加粗**、*斜体*、~~删除线~~、`行内代码`、==高亮==。\n'],
    [300, 50, false, '单标记符节点输入对应标记符即可触发，双标记符节点通过快速连续输入来触发。\n'],
    [300, 50, false, '在标记节点内，你可以通过按下`Tab`来跳出当前节点；在嵌套节点内，你可以*双击*`空格`，来跳出最外层标记节点。\n'],
  ],
  mdText: `# 标记
> 来自插件：@effitor/plugin-mark\n

内置五种标记节点：**加粗**、*斜体*、~~删除线~~、\`行内代码\`、==高亮==。

单标记符节点输入对应标记符即可触发，双标记符节点通过快速连续输入来触发。

在标记节点内，你可以通过按下\`Tab\`来跳出当前节点；在嵌套节点内，你可以*双击*\`空格\`，来跳出最外层标记节点。
`,
}
const markFeatureDataEn: FeatureData = {
  icon,
  title: 'Mark',
  pluginName: '@effitor/plugin-mark',
  editorActions: [
    [300, 50, false, '# Mark\n'],
    [300, 30, false, '> From plugin: @effitor/plugin-mark\n\n'],
    [300, 30, false, 'Built-in five mark nodes: **bold**, *italic*, ~~strikethrough~~, `inline code`, ==highlight==.\n'],
    [300, 30, false, 'Single mark symbol node triggers by typing the mark symbol, double mark symbol node triggers by typing the mark symbol continuously.\n'],
    [300, 30, false, 'In mark node, you can jump out of the current node by pressing `Tab`; in nested node, you can jump out of the outer most mark node by pressing the space bar twice quickly.\n'],
  ],
  mdText: `# Mark
> From plugin: @effitor/plugin-mark\n

Built-in five mark nodes: **bold**, *italic*, ~~strikethrough~~, \`inline code\`, ==highlight==.

Single mark symbol node triggers by typing the mark symbol, double mark symbol node triggers by typing the mark symbol continuously.

In mark node, you can jump out of the current node by pressing \`Tab\`; in nested node, you can jump out of the outer most mark node by pressing the space bar twice quickly.
`,
}
export const markFeatureDataMap: Record<string, FeatureData> = {
  zh: markFeatureDataZh,
  en: markFeatureDataEn,
}
