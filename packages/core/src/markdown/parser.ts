import type * as mdast from 'mdast'
import { fromMarkdown as fm, type Options as FmOptions } from 'mdast-util-from-markdown'
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm'
import { newlineToBreak } from 'mdast-util-newline-to-break'
import { type Options as TmOptions, toMarkdown as tm } from 'mdast-util-to-markdown'
import { gfm } from 'micromark-extension-gfm'

export const mdParser = {
  fromMarkdown: (mdText: string, options?: FmOptions) => {
    const tree = fm(mdText, {
      extensions: [gfm(), ...options?.extensions ?? []],
      mdastExtensions: [gfmFromMarkdown(), ...options?.mdastExtensions ?? []],
    })
    // 使用 break 来替换 text 节点中的 '\n'
    newlineToBreak(tree)
    return tree
  },
  toMarkdown: (mdastRoot: mdast.Root, options?: TmOptions) => {
    return tm(mdastRoot, {
      ...options,
      extensions: [gfmToMarkdown(), ...options?.extensions ?? []],
    })
  },

}
