import { HotstringEnum } from './config'
import { Hotstring, HotstringOptions } from './Hotstring'

/**
 * 创建一个热字符串对象实例
 * @param hotstring 热字符串, 不可包含触发字符(即 HotstringManagerOptions.triggerChars的最后一个字符, 默认为空格);
 *                  该方法会为该字符串添加后缀, 即 HotstringManagerOptions.triggerChars除去最后一个字符的剩余部分
 * @param triggerChars 热字符串触发串, 除最后一个字符外, 会作为热字符串触发串的一部分(后缀);
 *                     必须与创建编辑器时配置给 HotstringManager 的 triggerChars 相同, 否则可能无法触发匹配;
 *                     传入undefined或空串, 则使用内置默认值`\x20`(空格)
 * @param options 热字符串选项
 * @example
 * // 假设 HotstringManagerOptions.triggerChars = '.\x20'  即 '.' + 空格
 * // 注意: 最后一个字符必须是可视字符, 如`\n`等是无效的
 * create('rel', action)  // 创建一个热字符串, 当连续输入 `rel.` + 空格 时执行 `action`
 */
export const create = (hotstring: string, triggerChars?: string, options?: HotstringOptions) => {
  return new Hotstring(hotstring, triggerChars || HotstringEnum.TriggerChar, options)
}
