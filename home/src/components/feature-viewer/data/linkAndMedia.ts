import { createElement } from 'react'
import { Link } from 'lucide-react'
import type { FeatureData } from '../config'

const icon = createElement(Link, { size: 32 })
const linkMediaFeatureDataZh: FeatureData = {
  icon,
  title: '链接和媒体',
  pluginName: '@effitor/plugin-link, media',
  editorActions: [
    [500, 200, false, '# 链接和媒体\n'],
    [500, 30, false, '> From plugin: @effitor/plugin-link，@effitor/plugin-media\n\n'],
    [500, 30, false, '- 链接: 输入 `[链接文本](https://example.com)` 来创建一个链接。\n'],
    [500, 30, false, '- 图片: 输入 `![图片描述](https://example.com/image.jpg)` 来插入一张图片。\n\n'],
    [500, 30, false, '如：[这是一个前往 MDN 的链接](https://developer.mozilla.org/)，和其网站上的一个图片![mdn_contributor](https://developer.mozilla.org/static/ssr/mdn_contributor.9e2a105f50828d5a.png)'],
    [500, 30, false, '\t。\n图片是内联的，你可以在光标刚好位于图片前或后时按下`Tab`来调整其浮动状态，依次为：居中、右浮动、左浮动、折叠。图片浮动时，默认会在图片插入位置留下一个标记符`$`，你可以通过自定义 **CSS** 来覆盖它。此外，媒体插件还支持音频和视频。'],
  ],
  mdText: `# 链接和媒体
> From plugin: @effitor/plugin-link，@effitor/plugin-media

- 链接: 输入 \`[链接文本](https://example.com)\` 来创建一个链接。
- 图片: 输入 \`![图片描述](https://example.com/image.jpg)\` 来插入一张图片。

如：[这是一个前往 MDN 的链接](https://developer.mozilla.org/)，和其网站上的一个图片![mdn_contributor](https://developer.mozilla.org/static/ssr/mdn_contributor.9e2a105f50828d5a.png)。

图片是内联的，你可以在光标刚好位于图片前或后时按下\`Tab\`来调整其浮动状态，依次为：居中、右浮动、左浮动、折叠。图片浮动时，默认会在图片插入位置留下一个标记符\`$\`，你可以通过自定义 **CSS** 来覆盖它。此外，媒体插件还支持音频和视频。
`,
}
const linkMediaFeatureDataEn: FeatureData = {
  icon,
  title: 'Link and Media',
  pluginName: '@effitor/plugin-link, media',
  editorActions: [
    [500, 50, false, '# Link and Media\n'],
    [500, 30, false, '> From plugin: @effitor/plugin-link, @effitor/plugin-media\n\n'],
    [500, 30, false, '- Link: Input `[Link Text](https://example.com)` to create a link.\n'],
    [500, 30, false, '- Image: Input `![Image Description](https://example.com/image.jpg)` to insert an image.\n\n'],
    [500, 30, false, 'For example: [This is a link to MDN](https://developer.mozilla.org/), and an image on its website ![mdn_contributor](https://developer.mozilla.org/static/ssr/mdn_contributor.9e2a105f50828d5a.png)'],
    [500, 30, false, '\t.\nImages are inline; you can press `Tab` when the cursor is just before or after an image to cycle its float state: center, right-float, left-float, collapse. When floating, a marker `$` is left at the insertion point by default; override it with custom **CSS**. The media plugin also supports audio and video.'],
  ],
  mdText: `# Link and Media
> From plugin: @effitor/plugin-link, @effitor/plugin-media

- Link: Input \`[Link Text](https://example.com)\` to create a link.
- Image: Input \`![Image Description](https://example.com/image.jpg)\` to insert an image.

For example: [This is a link to MDN](https://developer.mozilla.org/), and an image on its website ![mdn_contributor](https://developer.mozilla.org/static/ssr/mdn_contributor.9e2a105f50828d5a.png).

Images are inline; you can press \`Tab\` when the cursor is just before or after an image to cycle its float state: center, right-float, left-float, collapse. When floating, a marker \`$\` is left at the insertion point by default; override it with custom **CSS**. The media plugin also supports audio and video.
`,
}
export const linkMediaFeatureDataMap: Record<string, FeatureData> = {
  zh: linkMediaFeatureDataZh,
  en: linkMediaFeatureDataEn,
}
