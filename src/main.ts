import et from './effitor'

const effitor = et.createEditor({
    plugins: [
        et.plugins.useCompPlugin(['image', 'link', 'list']),
        et.plugins.useMarkPlugin([et.element.EtParagraphElement])
    ]
})

const div = document.getElementById('editor-host') as HTMLDivElement
div && effitor.mount(div)
