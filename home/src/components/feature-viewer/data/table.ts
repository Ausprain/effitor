import { createElement } from 'react'
import { Table } from 'lucide-react'
import type { FeatureData } from '../config'

const icon = createElement(Table, { size: 32 })
const tableFeatureDataZh: FeatureData = {
  icon,
  title: '表格',
  pluginName: '@effitor/plugin-table',
  editorActions: [
    [500, 200, false, '# 表格\n'],
    [500, 30, false, '> 从插件: @effitor/plugin-table\n\n'],
    [500, 50, false, '要创建一个表格，在空段落中输入一段简短文本，然后按下`Tab`。如：\n'],
    [500, 50, false, '**Effitor 内置插件**'],
    [500, 50, false, '\t'],
    [500, 50, false, '**描述**\n'],
    [500, 40, false, `assist-counter\t字数统计助手
assist-dialog\t对话框助手
assist-dropdown\t下拉菜单助手
assist-message\t消息助手
aassist-popup\t弹窗和悬浮工具助手
plugin-heading\t标题插件
plugin-mark\t高亮插件
plugin-link\t链接插件
plugin-list\t列表插件
plugin-media\t媒体（图像/音/视频）插件
plugin-code\t代码块插件
plugin-blockquote\t引用块插件
plugin-table\t表格插件\n\n`],
    [500, 40, false, `**表格内置快捷键**\t**表格操作**
\`Tab\`\t光标移入下一单元格或插入新列
\`Shift+Tab\`\t光标移入前一单元格或插入新列
\`Enter\`\t插入新行
\`Opt|Alt+↑/↓\`\t表格行上移/下移
\`Opt|Alt+Shift+↑/↓\`\t表格行复制上移/下移
\`Ctrl+Opt|Alt+←/→\`\t表格列左移/右移
\`Opt|Alt+C\`\t表格居中对齐
\`Opt|Alt+L\`\t表格左对齐
\`Opt|Alt+R\`\t表格右对齐
\`Ctrl|Cmd+E\`\t表格单元格等宽\n\n`],
    [500, 50, false, '表格还支持嵌套其他插件节点，如`mark`。您可以在创建对应插件时配置。'],
  ],
}
const tableFeatureDataEn: FeatureData = {
  icon,
  title: 'Table',
  pluginName: '@effitor/plugin-table',
  editorActions: [
    [500, 50, false, '# Table\n'],
    [500, 30, false, '> From plugin: @effitor/plugin-table\n\n'],
    [500, 30, false, 'To create a table, type a short text in an empty paragraph and press `Tab`. For example:\n'],
    [500, 30, false, '**Effitor built-in plugins**'],
    [500, 30, false, '\t'],
    [500, 30, false, '**Description**\n'],
    [500, 30, false, `assist-counter\tWord count assistant
assist-dialog\tDialog assistant
assist-dropdown\tDropdown menu assistant
assist-message\tMessage assistant
aassist-popup\tPopup and floating tool assistant
plugin-heading\tHeading plugin
plugin-mark\tHighlight plugin
plugin-link\tLink plugin
plugin-list\tList plugin
plugin-media\tMedia (image/audio/video) plugin
plugin-code\tCode block plugin
plugin-blockquote\tBlockquote plugin
plugin-table\tTable plugin\n\n`],
    [500, 30, false, `**Table built-in shortcuts**\t**Table operations**
\`Tab\`\tMove cursor to the next cell \\\nor insert a new column
\`Shift+Tab\`\tMove cursor to the previous cell \\\nor insert a new column
\`Enter\`\tInsert a new row
\`Opt|Alt+↑/↓\`\tMove table row up/down
\`Opt|Alt+Shift+↑/↓\`\tCopy table row up/down
\`Ctrl+Opt|Alt+←/→\`\tMove table column left/right
\`Opt|Alt+C\`\tCenter align table
\`Opt|Alt+L\`\tLeft align table
\`Opt|Alt+R\`\tRight align table
\`Ctrl|Cmd+E\`\tEqual width of table cells\n\n`],
    [500, 30, false, 'Table also supports nested other plugin nodes, such as `mark`. You can configure it when creating the corresponding plugin.'],
  ],
}
export const tableFeatureDataMap: Record<string, FeatureData> = {
  zh: tableFeatureDataZh,
  en: tableFeatureDataEn,
}
