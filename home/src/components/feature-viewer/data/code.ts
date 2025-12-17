import { createElement } from 'react'
import { SquareCode } from 'lucide-react'
import type { FeatureData } from '../config'

const icon = createElement(SquareCode, { size: 32 })
const codeFeatureDataZh: FeatureData = {
  icon,
  title: '代码块',
  pluginName: '@effitor/plugin-code',
  editorActions: [
    [500, 200, false, '# 代码块\n'],
    [500, 30, false, '> 来自插件：@effitor/plugin-code\n\n'],
    [500, 30, false, '在空段落开头输入````语言`，然后按下`Enter`键，即可创建代码块。如：\n'],
    [500, 30, false, '```js'],
    [300, 30, false, '\n'],
    [300, 30, false, 'function greet() {\n\tconsole.log("Hello, JavaScript!");\n}```\n'],
    [500, 30, false, '```rs'],
    [300, 30, false, '\n'],
    [300, 30, true, 'fn greet(str: String) {\n\tprintln!("{}", &str);\n}\nfn main() {\n\tgreet(String::from("Hello Rust!"));\n}```\n'],
    [500, 30, false, '此外，代码块插件还支持渲染 html 或 latex 代码，您可以在插件配置中开启该功能。\n'],
    [500, 30, false, '```html'],
    [300, 30, false, '\n'],
    [300, 30, false, '<p align="center"><b style="font-size:2em">Hello World!</b></p>\n<!-- 点击代码块右上角的渲染按钮查看渲染效果 -->```\n'],
    [500, 30, false, '```latex'],
    [300, 30, false, '\n'],
    [300, 30, false, '\\int u \\frac{dv}{dx}\\,dx=uv-\\int \\frac{du}{dx}v\\,dx```\n'],
  ],
}
const codeFeatureDataEn: FeatureData = {
  icon,
  title: 'Code Block',
  pluginName: '@effitor/plugin-code',
  editorActions: [
    [500, 50, false, '# Code Block\n'],
    [500, 30, false, '> From Plugin: @effitor/plugin-code\n\n'],
    [500, 30, false, 'To create a code block, start a new paragraph with ````lang` and press `Enter`. For example:\n'],
    [500, 30, false, '```js'],
    [300, 30, false, '\n'],
    [300, 30, false, 'function greet() {\n\tconsole.log("Hello, JavaScript!");\n}```\n'],
    [500, 30, false, '```rs'],
    [300, 30, false, '\n'],
    [300, 30, true, 'fn greet(str: String) {\n\tprintln!("{}", &str);\n}\nfn main() {\n\tgreet(String::from("Hello Rust!"));\n}```\n'],
    [500, 30, false, 'In addition, the code block plugin supports rendering HTML or LaTeX code. You can enable this feature in the plugin configuration.\n'],
    [500, 30, false, '```html'],
    [300, 30, false, '\n'],
    [300, 30, false, '<p align="center"><b style="font-size:2em">Hello World!</b></p>\n<!-- Click the render button on the top right corner of the code block to view the rendered effect -->```\n'],
    [500, 30, false, '```latex'],
    [300, 30, false, '\n'],
    [300, 30, false, '\\int u \\frac{dv}{dx}\\,dx=uv-\\int \\frac{du}{dx}v\\,dx```\n'],
  ],
}
export const codeFeatureDataMap: Record<string, FeatureData> = {
  zh: codeFeatureDataZh,
  en: codeFeatureDataEn,
}
