import { dom } from "./utils"

Object.assign(DocumentFragment.prototype, {
    normalizeAndCleanZWS(this: DocumentFragment) {
        this.normalize()
        // Remove not ending &ZeroWidthSpace;
        dom.traverseNode(this, (text) => {
            const s = text.data
            text.data = (s.startsWith('\u200B') ? '\u200B' : '')
                + (s.replaceAll('\u200B', ''))
                + (s.endsWith('\u200B') ? '\u200B' : '')
            // to remove
            // console.error('remove zws in text', s, s.length, text.data.length)
        }, {
            whatToShow: NodeFilter.SHOW_TEXT
        })
    }
})