import { createElement } from 'react'
import { MessageSquareQuote } from 'lucide-react'
import type { FeatureData } from '../config'

const icon = createElement(MessageSquareQuote, { size: 32 })
const blockquoteFeatureDataZh: FeatureData = {
  icon,
  title: '引用块',
  pluginName: '@effitor/plugin-blockquote',
  editorActions: [
    [500, 200, false, '# 引用块\n'],
    [300, 30, false, '> 来自插件: @effitor/plugin-blockquote\n\n'],
    [300, 30, false, '要创建一个引用块，在空段落中输入`>`，然后按下`Enter`。如：\n'],
    [300, 30, false, '> 引用块默认支持嵌套，以及 Github 风格的引用块。\n'],
    [300, 50, false, '> > [!NOTE]'],
    [300, 30, false, '\n'],
    [300, 30, false, '“注意”引用块\n\n'],
    [300, 50, false, '> > [!TIP]'],
    [300, 30, false, '\n'],
    [300, 30, false, '“提示”引用块\n\n'],
    [300, 50, false, '> > [!IMPORTANT]'],
    [300, 30, false, '\n'],
    [300, 30, false, '“重要”引用块\n\n'],
    [300, 50, false, '> > [!WARNING]'],
    [300, 30, false, '\n'],
    [300, 30, false, '“警告”引用块\n\n'],
    [300, 50, false, '> > [!CAUTION]'],
    [300, 30, false, '\n'],
    [300, 30, false, '“小心”引用块\n\n\n'],
    [300, 50, false, '#4 不够高效？'],
    [1500, 50, false, '热字符串说：是的！\n'],
    [300, 50, false, '\x00KeyZ,0001{43}'],
    [600, 30, false, '得益于 **Effitor** 核心强大的热字符模块，以上可通过特定的缩写词快捷插入对应引用块。如：连续地输入`note.`然后按空格键。\n'],
    [300, 50, false, 'note.'],
    [300, 30, false, '\x00Space,0000'],
    [300, 30, false, '“注意”引用块\n\n'],
    [300, 50, false, 'tip.'],
    [300, 30, false, '\x00Space,0000'],
    [300, 30, false, '“提示”引用块\n\n'],
    [300, 50, false, 'impt.'],
    [300, 30, false, '\x00Space,0000'],
    [300, 30, false, '“重要”引用块\n\n'],
    [300, 50, false, 'warn.'],
    [300, 30, false, '\x00Space,0000'],
    [300, 30, false, '“警告”引用块\n\n'],
    [300, 50, false, 'caut.'],
    [300, 30, false, '\x00Space,0000'],
    [300, 30, false, '“小心”引用块\n\n'],
  ],
  mdText: `# 引用块
> 来自插件: @effitor/plugin-blockquote\n
要创建一个引用块，在空段落中输入\`>\`，然后按下\`Enter\`。如：
> 引用块默认支持嵌套，以及 Github 风格的引用块。
> > [!NOTE]
“注意”引用块\n
> > [!TIP]
“提示”引用块\n
> > [!IMPORTANT]
“重要”引用块\n
> > [!WARNING]
“警告”引用块\n
> > [!CAUTION]
“小心”引用块\n\n
#### 不够高效？热字符串说：是的！
得益于 **Effitor** 核心强大的热字符模块，以上可通过特定的缩写词快捷插入对应引用块。如：连续地输入\`note.\`然后按空格键。
`,
}
const blockquoteFeatureDataEn: FeatureData = {
  icon,
  title: 'Blockquote',
  pluginName: '@effitor/plugin-blockquote',
  editorActions: [
    [500, 50, false, '# Blockquote\n'],
    [300, 30, false, '> From plugin: @effitor/plugin-blockquote\n\n'],
    [300, 30, false, 'To create a blockquote, type `>` in an empty paragraph and press `Enter`. For example:\n'],
    [300, 30, false, '> Blockquote supports nested quotes and Github-style blockquotes.\n'],
    [200, 50, false, '> > [!NOTE]'],
    [200, 30, false, '\n'],
    [300, 30, false, '“Note” blockquote\n\n'],
    [200, 50, false, '> > [!TIP]'],
    [200, 30, false, '\n'],
    [300, 30, false, '“Tip” blockquote\n\n'],
    [200, 50, false, '> > [!IMPORTANT]'],
    [200, 30, false, '\n'],
    [300, 30, false, '“Important” blockquote\n\n'],
    [200, 50, false, '> > [!WARNING]'],
    [200, 30, false, '\n'],
    [300, 30, false, '“Warning” blockquote\n\n'],
    [200, 50, false, '> > [!CAUTION]'],
    [200, 30, false, '\n'],
    [300, 30, false, '“Caution” blockquote\n\n\n'],
    [300, 30, false, '#4 Not efficient enough? '],
    [1500, 30, false, 'Hot strings say: Yes!\n'],
    [300, 30, false, '\x00KeyZ,0001{77}'],
    [600, 30, false, 'Thanks to the powerful hot string module in **Effitor** core, the above can be inserted with specific abbreviations. For example: continuously type `note.` then press Space.\n'],
    [300, 50, false, 'note.'],
    [200, 30, false, '\x00Space,0000'],
    [200, 30, false, '“Note” blockquote\n\n'],
    [300, 50, false, 'tip.'],
    [200, 30, false, '\x00Space,0000'],
    [200, 30, false, '“Tip” blockquote\n\n'],
    [300, 50, false, 'impt.'],
    [200, 30, false, '\x00Space,0000'],
    [200, 30, false, '“Important” blockquote\n\n'],
    [300, 50, false, 'warn.'],
    [200, 30, false, '\x00Space,0000'],
    [200, 30, false, '“Warning” blockquote\n\n'],
    [300, 50, false, 'caut.'],
    [200, 30, false, '\x00Space,0000'],
    [200, 30, false, '“Caution” blockquote\n\n'],
  ],
  mdText: `# Blockquote
> From plugin: @effitor/plugin-blockquote\n
To create a blockquote, type \`>\` in an empty paragraph and press \`Enter\`. For example:
> Blockquote supports nested quotes and Github-style blockquotes.
> > [!NOTE]
“Note” blockquote\n
> > [!TIP]
“Tip” blockquote\n
> > [!IMPORTANT]
“Important” blockquote\n
> > [!WARNING]
“Warning” blockquote\n
> > [!CAUTION]
“Caution” blockquote\n\n
#### Not efficient enough? Hot strings say: Yes!
Thanks to the powerful hot string module in **Effitor** core, the above can be inserted with specific abbreviations. For example: continuously type \`note.\` then press Space.
`,
}
export const blockquoteFeatureDataMap: Record<string, FeatureData> = {
  zh: blockquoteFeatureDataZh,
  en: blockquoteFeatureDataEn,
}
