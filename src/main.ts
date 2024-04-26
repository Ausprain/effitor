import './assets/main.css'

import et from './effitor'
import { EtParagraphElement } from './effitor/element'
import { AbbrInit, useAbbrPlugin } from './effitor/plugins/abbr'
import { EtAbbrElement } from './effitor/plugins/abbr/element'

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
}]

const effitor = et.createEditor({
    plugins: [
        et.plugins.useMarkPlugin([EtAbbrElement, EtParagraphElement]),
        // et.plugins.useCompPlugin(['image', 'link', 'list']),
        useAbbrPlugin({ abbrInits })
    ]
})

const div = document.getElementById('editor-host') as HTMLDivElement
div && effitor.mount(div)
