import { dom } from "./utils"

declare global {
    interface DocumentFragment extends Node {
        /**
         * 标准化节点, 先执行原本的`Node.prototype.normalize`再清理内部`#text`节点的非开头零宽字符
         */
        normalizeAndCleanZWS: (this: DocumentFragment) => void
    }
}
DocumentFragment.prototype.normalizeAndCleanZWS = function (this: DocumentFragment) {
    this.normalize()
    // Remove not first &ZeroWidthSpace;
    dom.traverseNode(this, (text) => {
        const s = text.data
        text.data = (s[0] === '\u200B' ? '\u200B' : '') + (s.replaceAll('\u200B', ''))  // + (s.endsWith('\u200B') ? '\u200B' : '')  // 结尾不需要zws
        // to remove
        // console.error('remove zws in text', s, s.length, text.data.length)
    }, {
        whatToShow: NodeFilter.SHOW_TEXT
    })
}

