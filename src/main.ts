import './assets/main.css'

import type { AbbrInit } from './effitor/plugins/abbr'
import et from './effitor'
import { EtParagraphElement } from './effitor/element'
import { EtAbbrElement } from './effitor/plugins/abbr/element'

import customStyleUrl from './assets/editor.less?url'

const abbrInits: AbbrInit[] = [{
    name: 'ps',
    config: {
        1: {
            display: 'ps.\n',
            description: 'postscript',
            onTrigger(ctx, trigger) {
                // todo remove
                console.error('on trigger: ', 'ps.')
                trigger(ctx)
            },
        },
        2: {},
        4: {}
    },
}, {
    name: 'rel',
    config: { 1: {}, 2: {}, 4: {} }
}, {
    name: 'ref',
    config: { 1: {}, 2: {}, 4: {} }
}, {
    name: 'prer',
    config: { 4: {} }
}, {
    name: 'app',
    config: { 4: {} }
}]

const effitor = et.createEditor({
    customStyleUrls: customStyleUrl,
    plugins: [
        et.plugins.useMarkPlugin([EtAbbrElement, EtParagraphElement]),
        et.plugins.useCompPlugin(['image', 'link', 'list']),
        et.plugins.useAbbrPlugin({ abbrInits }),
    ]
})

const div = document.getElementById('editor-host') as HTMLDivElement
div && effitor.mount(div)
