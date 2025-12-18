import { createElement } from 'react'
import { Heading } from 'lucide-react'
import type { FeatureData } from '../config'

const icon = createElement(Heading, { size: 32 })
const headingFeatureDataZh: FeatureData = {
  icon,
  title: '标题',
  pluginName: '@effitor/plugin-heading',
  editorActions: [
    [500, 200, false, '# 标题\n'],
    [500, 50, false, '> 来自插件：@effitor/plugin-heading\n\n'],
    [500, 50, false, '在空段落中输入`#{1,6} `或`#[1-6] `来快捷插入指定级别的标题，如：\n'],
    [500, 200, false, '## '],
    [500, 100, false, '二级标题\n'],
    [500, 200, false, '### '],
    [500, 100, false, '三级标题\n'],
    [500, 200, false, '#4 '],
    [500, 100, false, '四级标题\n'],
    [500, 200, false, '#5 '],
    [500, 100, false, '五级标题\n'],
    [500, 200, false, '#6 '],
    [500, 100, false, '六级标题'],
  ],
  mdText: `# 标题
> 来自插件：@effitor/plugin-heading

在空段落中输入\`#{1,6} \`或\`#[1-6] \`来快捷插入指定级别的标题，如：

## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题
`,
}
const headingFeatureDataEn: FeatureData = {
  icon,
  title: 'Heading',
  pluginName: '@effitor/plugin-heading',
  editorActions: [
    [500, 50, false, '# Heading\n'],
    [500, 50, false, '> From plugin: effitor/plugin-heading\n\n'],
    [500, 50, false, 'Insert heading by typing `#{1,6} ` or `#[1-6] ` in empty paragraph, e.g.\n'],
    [500, 200, false, '## '],
    [500, 50, false, 'Heading 2\n'],
    [500, 200, false, '### '],
    [500, 50, false, 'Heading 3\n'],
    [500, 200, false, '#4 '],
    [500, 50, false, 'Heading 4\n'],
    [500, 200, false, '#5 '],
    [500, 50, false, 'Heading 5\n'],
    [500, 200, false, '#6 '],
    [500, 50, false, 'Heading 6'],
  ],
  mdText: `# Heading
> From plugin: effitor/plugin-heading

Insert heading by typing \`#{1,6} \` or \`#[1-6] \` in empty paragraph, e.g.

## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
`,
}

export const headingFeatureDataMap: Record<string, FeatureData> = {
  zh: headingFeatureDataZh,
  en: headingFeatureDataEn,
}
